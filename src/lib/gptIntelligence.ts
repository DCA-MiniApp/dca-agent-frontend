/**
 * GPT Intelligence Service for DCA Plan Creation
 *
 * This service uses GPT to intelligently extract DCA plan parameters from user messages
 * and guides users through providing all required information before plan creation.
 */

import tokenMapArbitrum from "../tokenMap_arbitrum.json";

// Types
export interface DCAPlanData {
  fromToken: string;
  toToken: string;
  amount: string;
  interval: string; // Store as string, backend will parse (e.g., "2 minutes", "1 day", "weekly")
  duration: string; // Store as string, backend will parse (e.g., "1 day", "3 weeks", "2 months")
  slippage?: string;
  usdEstimate?: {
    amountUsd: number;
    tokenPriceUsd: number;
  };
  _isDollarAmount?: boolean; // Internal flag to indicate if amount is in USD
}

// Legacy interface for backward compatibility during transition
export interface LegacyDCAPlanData {
  fromToken: string;
  toToken: string;
  amount: string;
  intervalMinutes: number;
  durationWeeks: number;
  slippage?: string;
}

export interface ExtractionResult {
  isComplete: boolean;
  planData: Partial<DCAPlanData>;
  missingFields: string[];
  nextQuestion?: string;
  validationErrors: string[];
}

export interface TokenInfo {
  chainId: number;
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

// Available tokens from the tokenMap
const availableTokens: Record<string, TokenInfo[]> = tokenMapArbitrum.tokenMap;

const TOKEN_PRICE_CACHE_TTL_MS = 60_000;
const tokenPriceCache = new Map<
  string,
  { priceUsd: number; fetchedAt: number }
>();

/**
 * Main GPT Intelligence Service
 */
export class GPTIntelligenceService {
  private readonly openaiApiKey: string;
  private readonly apiUrl = "https://api.openai.com/v1/chat/completions";

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || "";

    // Check for force fallback mode first
    const forceFallback = process.env.FORCE_FALLBACK_MODE === 'true' ||
      process.env.NODE_ENV === 'development' && !this.openaiApiKey;

    if (forceFallback) {
      console.warn("[GPT Intelligence] FORCE_FALLBACK_MODE enabled or no API key in development. Using rule-based extraction only.");
      this.openaiApiKey = "";
      return;
    }

    if (!this.openaiApiKey) {
      console.warn(
        "[GPT Intelligence] No OpenAI API key provided. Using fallback extraction."
      );
      console.warn(
        "[GPT Intelligence] To enable GPT intelligence, set OPENAI_API_KEY environment variable."
      );
    } else {
      console.log(
        "[GPT Intelligence] OpenAI API key loaded successfully. Length:",
        this.openaiApiKey.length
      );

      // Validate API key format
      if (!this.isValidApiKeyFormat(this.openaiApiKey)) {
        console.error(
          "[GPT Intelligence] Invalid API key format detected. Expected format: sk-proj-... or sk-..."
        );
        console.error(
          "[GPT Intelligence] Current key starts with:",
          this.openaiApiKey.substring(0, 10) + "..."
        );
        console.warn("[GPT Intelligence] Falling back to rule-based extraction due to invalid API key.");
        this.openaiApiKey = ""; // Force fallback
      }
    }
  }

  /**
   * Validate OpenAI API key format
   */
  private isValidApiKeyFormat(apiKey: string): boolean {
    // OpenAI API keys should start with 'sk-' and be at least 20 characters long
    return apiKey.startsWith('sk-') && apiKey.length >= 20;
  }

  /**
   * Extract and validate DCA plan data from user messages
   */
  async extractPlanData(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    currentPlanData: Partial<DCAPlanData> = {}
  ): Promise<ExtractionResult> {
    console.log("[GPT Intelligence] Starting extraction for message:", userMessage.substring(0, 100) + "...");
    console.log("[GPT Intelligence] Has API key:", !!this.openaiApiKey);
    console.log("[GPT Intelligence] Current plan data:", currentPlanData);

    try {
      // If we have OpenAI API key, use GPT for intelligent extraction
      if (this.openaiApiKey) {
        console.log("[GPT Intelligence] Attempting GPT extraction...");
        return await this.extractWithGPT(
          userMessage,
          conversationHistory,
          currentPlanData
        );
      } else {
        console.log("[GPT Intelligence] No OpenAI API key, using rule-based extraction");
        // Fallback to rule-based extraction
        return this.extractWithRules(userMessage, currentPlanData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes("fetch failed") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("ECONNREFUSED");

      if (isNetworkError) {
        console.warn(`[GPT Intelligence] Network issue detected: ${errorMessage}. Falling back to rule-based extraction.`);
      } else {
        console.error("[GPT Intelligence] Extraction error:", error);
      }
      console.warn("[GPT Intelligence] Falling back to rule-based extraction due to error");

      // Always fallback to rule-based on any error
      try {
        const fallbackResult = this.extractWithRules(userMessage, currentPlanData);
        console.log("[GPT Intelligence] Fallback extraction completed successfully");
        return fallbackResult;
      } catch (fallbackError) {
        console.error("[GPT Intelligence] Fallback extraction also failed:", fallbackError);
        console.warn("[GPT Intelligence] Using safe extraction as last resort");
        // Use safe extraction as absolute last resort
        return this.createSafeExtractionResult(userMessage, currentPlanData);
      }
    }
  }

  /**
   * GPT-powered intelligent extraction
   */
  private async extractWithGPT(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    currentPlanData: Partial<DCAPlanData>
  ): Promise<ExtractionResult> {
    const tokenSymbols = Object.keys(availableTokens).slice(0, 20); // Top 20 tokens for context

    const systemPrompt = `You are a JSON data extraction bot for DCA plan parameters. You MUST respond with ONLY valid JSON, no other text.

Available Tokens: ${tokenSymbols.join(", ")} (and more)

Extract these parameters:
- fromToken: Source token symbol 
- toToken: Target token symbol
- amount: Investment amount per execution (IMPORTANT: extract the numeric value only, not currency)
- interval: Frequency string ("2 minutes", "daily", "weekly", etc.)
- duration: Duration string ("1 day", "3 weeks", "2 months", etc.)
- slippage: Optional slippage percentage
- _isDollarAmount: true if user specified dollar amount (e.g., "$10 of ETH", "0.1 dollar of WETH"), false if token amount (e.g., "0.1 ETH", "10 USDC")

CRITICAL VALIDATION RULE:
- The interval MUST be LESS than the duration. If the user provides an interval that is greater than or equal to the duration, add a validation error: "Interval must be less than duration. Please provide a smaller interval or longer duration."

CRITICAL NEXT QUESTION RULE:
- If there are ANY validation errors, the nextQuestion MUST focus on fixing those errors. DO NOT ask for optional fields like slippage when there are validation errors.
- Only ask for optional fields (like slippage) when all required fields are present AND there are no validation errors.

EXAMPLES:
- "0.1 dollar of WETH" → amount: "0.1", _isDollarAmount: true, fromToken: "WETH"
- "0.1 WETH" → amount: "0.1", _isDollarAmount: false, fromToken: "WETH"
- "$5 worth of ETH" → amount: "5", _isDollarAmount: true, fromToken: "ETH"
- "10 USDC into ETH" → amount: "10", _isDollarAmount: false, fromToken: "USDC"

CRITICAL: Your response must be ONLY valid JSON in this exact format:
{
  "extractedData": {
    "fromToken": null,
    "toToken": null,
    "amount": null,
    "interval": null,
    "duration": null,
    "slippage": null,
    "_isDollarAmount": null
  },
  "missingFields": [],
  "nextQuestion": "text",
  "validationErrors": []
}

Do not include any markdown, explanations, or formatting. Only pure JSON.`;

    const userPrompt = `Current plan data: ${JSON.stringify(currentPlanData)}
User message: "${userMessage}"

Extract any new DCA parameters from this message and provide the next question for missing information.`;

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn("[GPT Intelligence] Request timeout after 30 seconds");
      }, 30000);

      // Add retry logic for network robustness
      let response;
      let lastError;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Reset controller for each attempt if needed, but here we use one overall timeout 
          // or we can set per-request timeout. Let's keep the overall 30s timeout for simplicity
          // but if we want to retry connection timeouts, we need to be careful not to exceed global timeout.

          if (controller.signal.aborted) break;

          response = await fetch(this.apiUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.openaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                ...conversationHistory.slice(-4), // Include recent context
                { role: "user", content: userPrompt },
              ],
              temperature: 0.1,
              max_tokens: 500,
              response_format: { type: "json_object" },
            }),
            signal: controller.signal,
          });

          // If we get a response, break the loop (handle HTTP errors outside)
          break;
        } catch (err) {
          lastError = err;
          console.warn(`[GPT Intelligence] Attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`);

          if (attempt < 3 && !controller.signal.aborted) {
            // Wait 1s before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // If response is still undefined, rethrow the last error
      if (!response && lastError) {
        throw lastError;
      } else if (!response) {
        throw new Error("Failed to fetch from OpenAI API after retries");
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GPT Intelligence] OpenAI API error: ${response.status}`, errorText);

        let errorMessage = `OpenAI API error: ${response.status}`;

        if (response.status === 429) {
          console.error("[GPT Intelligence] Rate limit exceeded. This could be due to:");
          console.error("1. Too many requests per minute");
          console.error("2. Quota exceeded");
          console.error("3. Server overload");
          console.error("Falling back to rule-based extraction.");
          errorMessage = "Rate limit exceeded - falling back to rule-based extraction";
        } else if (response.status === 401) {
          console.error("[GPT Intelligence] Authentication failed - invalid API key");
          errorMessage = "Invalid API key - falling back to rule-based extraction";
        } else if (response.status === 403) {
          console.error("[GPT Intelligence] Forbidden - API key may not have access");
          errorMessage = "API access forbidden - falling back to rule-based extraction";
        } else if (response.status >= 500) {
          console.error("[GPT Intelligence] Server error - OpenAI service may be down");
          errorMessage = "OpenAI service unavailable - falling back to rule-based extraction";
        }

        throw new Error(`${errorMessage} - ${errorText}`);
      }

      const result = await response.json();
      const gptResponse = result.choices[0]?.message?.content;

      if (!gptResponse) {
        throw new Error("No response from GPT");
      }

      // Clean and parse GPT response
      // console.log("[GPT Intelligence] Raw GPT response:", gptResponse);

      let cleanedResponse = gptResponse.trim();

      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }

      // If response doesn't start with '{', try to find JSON object
      if (!cleanedResponse.startsWith("{")) {
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        } else {
          throw new Error("No valid JSON found in GPT response");
        }
      }

      // console.log("[GPT Intelligence] Cleaned response:", cleanedResponse);

      let parsed;
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (jsonError) {
        console.error("[GPT Intelligence] JSON parsing failed:", jsonError);
        console.error("[GPT Intelligence] Raw response that failed to parse:", cleanedResponse);
        throw new Error(`Failed to parse GPT response as JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
      }

      // Validate the parsed response structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error("GPT response is not a valid object");
      }

      if (!parsed.extractedData || typeof parsed.extractedData !== 'object') {
        console.warn("[GPT Intelligence] GPT response missing extractedData, using empty object");
        parsed.extractedData = {};
      }

      const updatedPlanData = { ...currentPlanData, ...parsed.extractedData };

      // Remove null values
      Object.keys(updatedPlanData).forEach((key) => {
        if (updatedPlanData[key as keyof DCAPlanData] === null) {
          delete updatedPlanData[key as keyof DCAPlanData];
        }
      });

      // Validate completeness
      const validation = this.validatePlanData(updatedPlanData);

      return {
        isComplete: validation.isComplete,
        planData: updatedPlanData,
        missingFields: parsed.missingFields || validation.missingFields,
        // Prioritize internal validation over GPT's hallucinations
        validationErrors: validation.validationErrors,
        // If we have local validation errors, use local nextQuestion logic or fallback to GPT's
        // But if GPT has no validation errors and we do, we definitely want OUR question.
        nextQuestion: validation.validationErrors.length > 0
          ? validation.nextQuestion
          : (parsed.nextQuestion || validation.nextQuestion),
      };
    } catch (error) {
      console.error("[GPT Intelligence] GPT extraction failed:", error);
      console.error("[GPT Intelligence] Error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      console.warn("[GPT Intelligence] Falling back to rule-based extraction...");

      // Always fallback to rule-based extraction on any GPT error
      try {
        const fallbackResult = this.extractWithRules(userMessage, currentPlanData);
        console.log("[GPT Intelligence] Fallback extraction successful:", fallbackResult);
        return fallbackResult;
      } catch (fallbackError) {
        console.error("[GPT Intelligence] Fallback extraction also failed:", fallbackError);
        // Return a safe minimal result that won't break the system
        return this.createSafeExtractionResult(userMessage, currentPlanData);
      }
    }
  }

  /**
   * Rule-based fallback extraction
   */
  private extractWithRules(
    userMessage: string,
    currentPlanData: Partial<DCAPlanData>
  ): ExtractionResult {
    console.log("[Rule-based Extraction] Starting extraction with current data:", currentPlanData);

    try {
      const extracted = this.extractParametersWithRules(userMessage, currentPlanData);
      console.log("[Rule-based Extraction] Extracted parameters:", extracted);

      const updatedPlanData = { ...currentPlanData, ...extracted };

      // Set default slippage if not provided
      if (!updatedPlanData.slippage) {
        updatedPlanData.slippage = "2";
      }

      console.log("[Rule-based Extraction] Updated plan data:", updatedPlanData);

      const validation = this.validatePlanData(updatedPlanData);
      console.log("[Rule-based Extraction] Validation result:", validation);

      return {
        isComplete: validation.isComplete,
        planData: updatedPlanData,
        missingFields: validation.missingFields,
        nextQuestion: validation.nextQuestion,
        validationErrors: validation.validationErrors,
      };
    } catch (error) {
      console.error("[Rule-based Extraction] Error in rule-based extraction:", error);
      // If rule-based extraction fails, return a safe result
      return this.createSafeExtractionResult(userMessage, currentPlanData);
    }
  }

  /**
   * Create a safe extraction result when all other methods fail
   */
  private createSafeExtractionResult(
    userMessage: string,
    currentPlanData: Partial<DCAPlanData>
  ): ExtractionResult {
    console.log("[Safe Extraction] Creating safe fallback result");

    // Try to extract at least some basic information safely
    const safeExtracted: Partial<DCAPlanData> = {};

    // Safe token extraction - only look for common tokens
    const commonTokens = ['USDC', 'USDT', 'DAI', 'ETH', 'WETH', 'BTC', 'WBTC', 'ARB'];
    const foundTokens = commonTokens.filter(token =>
      userMessage.toUpperCase().includes(token)
    );

    if (foundTokens.length >= 2) {
      safeExtracted.fromToken = foundTokens[0];
      safeExtracted.toToken = foundTokens[1];
    } else if (foundTokens.length === 1) {
      // Default behavior: if only one token found, assume it's the target
      safeExtracted.toToken = foundTokens[0];
    }

    // Safe amount extraction - only look for clear numbers
    const amountMatch = userMessage.match(/\b(\d+(?:\.\d+)?)\b/);
    if (amountMatch) {
      safeExtracted.amount = amountMatch[1];
    }

    // Safe interval extraction - only look for clear keywords
    if (userMessage.toLowerCase().includes('daily')) {
      safeExtracted.interval = 'daily';
    } else if (userMessage.toLowerCase().includes('weekly')) {
      safeExtracted.interval = 'weekly';
    } else if (userMessage.toLowerCase().includes('monthly')) {
      safeExtracted.interval = 'monthly';
    }

    const updatedPlanData = { ...currentPlanData, ...safeExtracted };
    const validation = this.validatePlanData(updatedPlanData);

    return {
      isComplete: false, // Always incomplete in safe mode
      planData: updatedPlanData,
      missingFields: validation.missingFields,
      nextQuestion: validation.nextQuestion || "I need more information to create your DCA plan. Could you please specify the tokens, amount, frequency, and duration?",
      validationErrors: validation.validationErrors,
    };
  }

  /**
   * Rule-based parameter extraction
   */
  private extractParametersWithRules(message: string, currentPlanData: Partial<DCAPlanData> = {}): Partial<DCAPlanData> {
    console.log("[Rule-based Extraction] Processing message:", message);
    console.log("[Rule-based Extraction] Current plan data:", currentPlanData);
    const lowerMessage = message.toLowerCase();
    const extracted: Partial<DCAPlanData> = {};

    // Extract amount - improved to handle dollar intent better
    // First check for dollar patterns ($ or "dollar" word)
    const dollarAmountMatch = message.match(
      /(\d+(?:\.\d+)?)\s*(?:dollars?|\$)\s*(?:of|worth\s*of)?\s*(usdc|usdt|dai|eth|btc|arb|weth|wbtc|link|uni|aave|comp|mkr|snx|1inch|crv|bal|yfi)/i
    );

    if (dollarAmountMatch) {
      // User wants X dollars worth of token - mark this for USD conversion
      extracted.amount = dollarAmountMatch[1];
      (extracted as any)._isDollarAmount = true; // Internal flag for USD conversion
      console.log('[Rule-based Extraction] Detected dollar amount pattern:', dollarAmountMatch[0], 'Amount:', dollarAmountMatch[1]);
    } else {
      // Check for regular token amount pattern - expanded token list
      const tokenAmountMatch = message.match(
        /(\d+(?:\.\d+)?)\s*(usdc|usdt|dai|eth|btc|arb|weth|wbtc|link|uni|aave|comp|mkr|snx|1inch|crv|bal|yfi)/i
      );
      if (tokenAmountMatch) {
        extracted.amount = tokenAmountMatch[1];
        (extracted as any)._isDollarAmount = false;
        console.log('[Rule-based Extraction] Detected token amount pattern:', tokenAmountMatch[0], 'Amount:', tokenAmountMatch[1]);
      } else {
        // Try to extract just numbers if no token is specified
        const numberMatch = message.match(/(\d+(?:\.\d+)?)/);
        if (numberMatch) {
          extracted.amount = numberMatch[1];
          (extracted as any)._isDollarAmount = false;
          console.log('[Rule-based Extraction] Detected number pattern:', numberMatch[0], 'Amount:', numberMatch[1]);
        }
      }
    }

    // Extract tokens
    const tokens = Object.keys(availableTokens);
    const tokenRegex = new RegExp(`\\b(${tokens.join("|")})\\b`, "gi");
    const matchedTokens = message.match(tokenRegex) || [];
    // Filter out empty strings
    const foundTokens = matchedTokens.filter(token => token && token.trim() !== '');

    console.log('[Rule-based Extraction] TOKEN EXTRACTION START');
    console.log('[Rule-based Extraction] foundTokens:', foundTokens);
    console.log('[Rule-based Extraction] foundTokens.length:', foundTokens.length);

    if (foundTokens.length >= 2) {
      extracted.fromToken = foundTokens[0]!.toUpperCase();
      extracted.toToken = foundTokens[1]!.toUpperCase();
    } else if (foundTokens.length === 1) {
      const token = foundTokens[0]!.toUpperCase();

      // Simple logic: if fromToken exists, new token is toToken; otherwise it's fromToken
      console.log('[Rule-based Extraction] Single token found:', token);
      console.log('[Rule-based Extraction] currentPlanData.fromToken:', currentPlanData.fromToken);
      console.log('[Rule-based Extraction] currentPlanData.fromToken type:', typeof currentPlanData.fromToken);

      const hasFromToken = currentPlanData.fromToken && currentPlanData.fromToken.trim() !== '';
      console.log('[Rule-based Extraction] hasFromToken:', hasFromToken);

      if (hasFromToken) {
        extracted.toToken = token;
        console.log('[Rule-based Extraction] ✅ fromToken exists, setting as toToken:', token);
      } else {
        extracted.fromToken = token;
        console.log('[Rule-based Extraction] ❌ No fromToken, setting as fromToken:', token);
      }
    } else {
      console.log('[Rule-based Extraction] No tokens found or unexpected length:', foundTokens.length);
    }

    console.log('[Rule-based Extraction] Final extracted tokens:', {
      fromToken: extracted.fromToken,
      toToken: extracted.toToken
    });

    // Extract interval (keep as string format for backend parsing)
    // Handle typos like "minitues" -> "minutes"
    const normalizedMessage = message.replace(/minitues?/gi, "minutes");

    const intervalMatch =
      normalizedMessage.match(
        /every\s+(\d+)\s*(minute|hour|day|week|month)/i
      ) ||
      normalizedMessage.match(
        /(\d+)\s*(minute|hour|day|week|month)(?:ly|s)?\s*(?:interval|frequency)/i
      );

    if (intervalMatch) {
      const value = intervalMatch[1];
      const unit = intervalMatch[2].toLowerCase();
      extracted.interval = `${value} ${unit}${parseInt(value) > 1 ? "s" : ""}`;
    } else if (lowerMessage.includes("hourly")) {
      extracted.interval = "hourly";
    } else if (lowerMessage.includes("daily")) {
      extracted.interval = "daily";
    } else if (lowerMessage.includes("weekly")) {
      extracted.interval = "weekly";
    } else if (lowerMessage.includes("monthly")) {
      extracted.interval = "monthly";
    }

    // Extract duration (keep as string format for backend parsing)
    const durationMatch =
      message.match(
        /(?:for|over)\s*(\d+)\s*(minute|hour|day|week|month|year)/i
      ) || message.match(/(\d+)\s*(minute|hour|day|week|month|year)/i);

    if (durationMatch) {
      const duration = durationMatch[1];
      const unit = durationMatch[2].toLowerCase();
      extracted.duration = `${duration} ${unit}${parseInt(duration) > 1 ? "s" : ""
        }`;
    }

    // Extract slippage
    const slippageMatch = message.match(/(\d+(?:\.\d+)?)\s*%?\s*slippage/i);
    if (slippageMatch) {
      extracted.slippage = slippageMatch[1];
    }

    return extracted;
  }

  /**
   * Parse time string to minutes for comparison
   * Handles formats like "2 minutes", "1 hour", "3 days", "weekly", "monthly", "every 24 hours", etc.
   */
  private parseTimeToMinutes(timeString: string): number | null {
    if (!timeString) return null;

    let lowerTime = timeString.toLowerCase().trim();

    // Strip "every" prefix if present (e.g., "every 24 hours" -> "24 hours")
    lowerTime = lowerTime.replace(/^every\s+/, '');

    // Handle common keywords
    if (lowerTime === 'hourly' || lowerTime === '1 hour') return 60;
    if (lowerTime === 'daily' || lowerTime === '1 day') return 24 * 60;
    if (lowerTime === 'weekly' || lowerTime === '1 week') return 7 * 24 * 60;
    if (lowerTime === 'monthly' || lowerTime === '1 month') return 30 * 24 * 60; // Approximate
    if (lowerTime === 'yearly' || lowerTime === '1 year') return 365 * 24 * 60; // Approximate

    // Parse "X minutes/hours/days/weeks/months/years" format
    // Enhanced regex to handle typos like "minitues", "minutues", etc.
    const match = lowerTime.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)/);

    if (match) {
      const value = parseFloat(match[1]);
      const unitStr = match[2];

      if (unitStr.includes('min')) return value;
      if (unitStr.includes('hour')) return value * 60;
      if (unitStr.includes('day')) return value * 24 * 60;
      if (unitStr.includes('week')) return value * 7 * 24 * 60;
      if (unitStr.includes('month')) return value * 30 * 24 * 60;
      if (unitStr.includes('year')) return value * 365 * 24 * 60;
    }

    return null;
  }

  /**
   * Validate plan data completeness and correctness
   */
  private validatePlanData(planData: Partial<DCAPlanData>): {
    isComplete: boolean;
    missingFields: string[];
    nextQuestion?: string;
    validationErrors: string[];
  } {
    const missingFields: string[] = [];
    const validationErrors: string[] = [];

    // Check required fields
    if (!planData.fromToken) missingFields.push("fromToken");
    if (!planData.toToken) missingFields.push("toToken");
    if (!planData.amount) missingFields.push("amount");
    if (!planData.interval) missingFields.push("interval");
    if (!planData.duration) missingFields.push("duration");

    // Validate token availability
    if (
      planData.fromToken &&
      (!availableTokens[planData.fromToken.toUpperCase()] ||
        availableTokens[planData.fromToken.toUpperCase()].length === 0)
    ) {
      validationErrors.push(
        `Token ${planData.fromToken} is not available on Arbitrum`
      );
    }
    if (
      planData.toToken &&
      (!availableTokens[planData.toToken.toUpperCase()] ||
        availableTokens[planData.toToken.toUpperCase()].length === 0)
    ) {
      validationErrors.push(
        `Token ${planData.toToken} is not available on Arbitrum`
      );
    }

    // Validate amounts
    if (
      planData.amount &&
      (isNaN(parseFloat(planData.amount)) || parseFloat(planData.amount) <= 0)
    ) {
      validationErrors.push("Amount must be a positive number");
    }

    // Validate interval vs duration - interval must be less than duration
    if (planData.interval && planData.duration) {
      const intervalMinutes = this.parseTimeToMinutes(planData.interval);
      const durationMinutes = this.parseTimeToMinutes(planData.duration);

      if (intervalMinutes !== null && durationMinutes !== null) {
        if (intervalMinutes >= durationMinutes) {
          validationErrors.push(
            "Interval must be less than duration. Please provide a smaller interval or longer duration."
          );
        }
      }
    }

    // No duration validation - backend handles all formats and durations

    // Generate next question
    let nextQuestion: string | undefined;

    // Prioritize validation errors over missing fields
    if (validationErrors.length > 0) {
      // If there's an interval vs duration error, provide specific guidance
      const hasIntervalDurationError = validationErrors.some(err =>
        err.includes("Interval must be less than duration")
      );

      if (hasIntervalDurationError) {
        nextQuestion = `The interval (${planData.interval}) must be less than the duration (${planData.duration}). Please provide a smaller interval or longer duration.`;
      } else {
        // For other validation errors, just use the first error as guidance
        nextQuestion = validationErrors[0];
      }
    } else if (missingFields.length > 0) {
      // Only ask for missing fields if there are no validation errors
      const field = missingFields[0];
      switch (field) {
        case "fromToken":
          nextQuestion = `Which token would you like to invest from? Available options include: ${Object.keys(
            availableTokens
          )
            .slice(0, 10)
            .join(", ")}, etc.`;
          break;
        case "toToken":
          nextQuestion = `Which token would you like to invest into? Popular choices: ETH, BTC, ARB, WBTC, etc.`;
          break;
        case "amount":
          nextQuestion = `How much ${planData.fromToken || "tokens"
            } would you like to invest per execution?`;
          break;
        case "interval":
          nextQuestion = `How often would you like to invest? (e.g., "2 minutes", "daily", "weekly", "monthly")`;
          break;
        case "duration":
          nextQuestion = `For how long should this plan run? (e.g., "1 day", "3 weeks", "2 months", "1 year")`;
          break;
      }
    }

    return {
      isComplete: missingFields.length === 0 && validationErrors.length === 0,
      missingFields,
      nextQuestion,
      validationErrors,
    };
  }

  /**
   * Generate plan summary for confirmation
   */
  generatePlanSummary(planData: DCAPlanData): string {
    const tokenInfoArray = availableTokens[planData.fromToken?.toUpperCase() || ''];
    const tokenInfo =
      tokenInfoArray && tokenInfoArray.length > 0
        ? tokenInfoArray[0]
        : undefined;
    // Format token address for mobile display
    const formatTokenAddress = (address: string) => {
      if (!address) return "N/A";
      if (address.length <= 20) return address;
      return `${address.slice(0, 8)}...${address.slice(-6)}`;
    };

    // Determine if this was originally a dollar amount request
    // Check if the USD estimate significantly differs from amount * price (indicating conversion happened)
    const wasOriginallyDollarAmount = planData.usdEstimate &&
      planData.usdEstimate.amountUsd &&
      planData.usdEstimate.tokenPriceUsd &&
      Math.abs((Number(planData.amount) * planData.usdEstimate.tokenPriceUsd) - planData.usdEstimate.amountUsd) > 0.05;

    const investmentLine = wasOriginallyDollarAmount
      ? `• Investment: $${planData.usdEstimate!.amountUsd.toFixed(2)} worth of ${planData.fromToken} (${planData.amount} ${planData.fromToken})`
      : `• Investment: ${planData.amount} ${planData.fromToken}${planData.usdEstimate
        ? ` (~$${planData.usdEstimate.amountUsd.toFixed(2)})`
        : ""
      }`;

    const usdLine =
      planData.usdEstimate && isFinite(planData.usdEstimate.amountUsd) && !wasOriginallyDollarAmount
        ? `• USD equivalent (per execution): ~$${planData.usdEstimate.amountUsd.toFixed(
          2
        )}\n`
        : "";

    return (
      `📊 **DCA Plan Summary:**\n` +
      `${investmentLine}\n` +
      `• Target: ${planData.toToken}\n` +
      `• Duration: ${planData.duration}\n` +
      `• Interval: ${planData.interval}\n` +
      `• Slippage: ${planData.slippage || "2"}%\n` +
      usdLine +
      `\n` +
      `💰 **Token:** ${formatTokenAddress(tokenInfo?.address || "")}\n` +
      `⚠️ **Note:** You'll need to approve a spending allowance for ${planData.fromToken} tokens to the executor.`
    );
  }

  /**
   * Get token address for approval
   */
  getTokenAddress(tokenSymbol: string): string | null {
    const tokens = availableTokens[tokenSymbol];
    return tokens && tokens.length > 0 ? tokens[0].address : null;
  }

  /**
   * Check if tokens exist in our tokenMap
   */
  validateTokens(
    fromToken: string,
    toToken: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (
      !availableTokens[fromToken] ||
      availableTokens[fromToken].length === 0
    ) {
      errors.push(`${fromToken} is not available on Arbitrum`);
    }
    if (!availableTokens[toToken] || availableTokens[toToken].length === 0) {
      errors.push(`${toToken} is not available on Arbitrum`);
    }
    if (fromToken === toToken) {
      errors.push("From token and to token cannot be the same");
    }

    return { valid: errors.length === 0, errors };
  }

}

function sanitizeSymbol(symbol?: string): string | null {
  if (!symbol) return null;
  return symbol.trim().toUpperCase();
}

async function fetchTokenUsdPrice(
  tokenSymbol: string
): Promise<{ priceUsd: number; address: string } | null> {
  console.log('🔍 [Token Price] Fetching USD price for:', tokenSymbol);
  const normalized = sanitizeSymbol(tokenSymbol);
  if (!normalized) return null;
  const tokenInfo = availableTokens[normalized]?.[0];
  if (!tokenInfo?.address) return null;

  const address = tokenInfo.address;
  const cacheKey = address.toLowerCase();
  const cached = tokenPriceCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < TOKEN_PRICE_CACHE_TTL_MS) {
    return { priceUsd: cached.priceUsd, address };
  }

  try {
    const endpoint = `https://api.coingecko.com/api/v3/simple/token_price/arbitrum-one?contract_addresses=${encodeURIComponent(
      address
    )}&vs_currencies=usd`;
    const response = await fetch(endpoint, { method: "GET" });
    if (!response.ok) {
      console.warn(
        "[TokenPrice] Coingecko request failed",
        response.status,
        await response.text()
      );
      return null;
    }
    const data = await response.json();
    const lookupKey = address.toLowerCase();
    const price =
      data?.[lookupKey]?.usd ??
      data?.[address]?.usd ??
      data?.[lookupKey]?.USD ??
      data?.[address]?.USD;

    if (typeof price !== "number" || !isFinite(price)) {
      return null;
    }

    tokenPriceCache.set(cacheKey, { priceUsd: price, fetchedAt: now });
    return { priceUsd: price, address };
  } catch (error) {
    console.error("[TokenPrice] Failed to fetch USD price:", error);
    return null;
  }
}

export interface DollarIntentResult {
  detected: boolean;
  usdAmount?: number;
}

export function detectDollarIntent(message: string): DollarIntentResult {
  if (!message) return { detected: false };

  console.log('🔍 [Dollar Intent] Analyzing message:', message);

  const normalized = message.replace(/,/g, "");
  const lowerMessage = normalized.toLowerCase();

  // Check for patterns like "X dollar of TOKEN", "$X of TOKEN", "X dollars worth of TOKEN"
  const dollarOfTokenPattern = /(\d+(?:\.\d+)?)\s*(?:dollars?|\$)\s*(?:of|worth\s*of)\s*(?:usdc|usdt|dai|eth|btc|arb|weth|wbtc)/i;
  const dollarOfTokenMatch = normalized.match(dollarOfTokenPattern);

  if (dollarOfTokenMatch) {
    console.log('🔍 [Dollar Intent] Found "dollar of token" pattern:', dollarOfTokenMatch[0]);
    return {
      detected: true,
      usdAmount: parseFloat(dollarOfTokenMatch[1])
    };
  }

  // Check for simple $ patterns
  const hasDollarSymbol = /\$/.test(normalized);
  const hasUsdWord = /usd|dollar/.test(lowerMessage);
  let usdAmount: number | undefined;

  if (hasDollarSymbol) {
    const match = normalized.match(/\$\s*(\d+(?:\.\d+)?)/);
    if (match) {
      usdAmount = parseFloat(match[1]);
      console.log('🔍 [Dollar Intent] Found $ symbol pattern:', match[0]);
    }
  }

  if (usdAmount === undefined && hasUsdWord) {
    const match = normalized.match(/(\d+(?:\.\d+)?)\s*(usd|dollars?)/i);
    if (match) {
      usdAmount = parseFloat(match[1]);
      console.log('🔍 [Dollar Intent] Found USD word pattern:', match[0]);
    }
  }

  const result = { detected: hasDollarSymbol || hasUsdWord, usdAmount };
  console.log('🔍 [Dollar Intent] Final result:', result);
  return result;
}

export async function applyUsdIntelligence(
  planData: DCAPlanData,
  usdInputAmount?: number
): Promise<void> {
  console.log('🔍 [USD Intelligence] Input:', { planData, usdInputAmount });

  const priceInfo = await fetchTokenUsdPrice(planData.fromToken);
  if (!priceInfo) {
    console.log('🔍 [USD Intelligence] No price info found for token:', planData.fromToken);
    return;
  }

  console.log('🔍 [USD Intelligence] Price info:', priceInfo);

  // Check if the amount is specified in dollars
  // ONLY convert if explicitly marked as dollar amount OR if usdInputAmount is provided
  // Do NOT convert if _isDollarAmount is explicitly false
  const isDollarAmount = planData._isDollarAmount === true || (usdInputAmount && usdInputAmount > 0);
  const dollarAmount = usdInputAmount || (isDollarAmount ? Number(planData.amount) : 0);

  console.log('🔍 [USD Intelligence] Analysis:', {
    isDollarAmount,
    dollarAmount,
    _isDollarAmount: planData._isDollarAmount,
    originalAmount: planData.amount
  });

  if (isDollarAmount && dollarAmount > 0) {
    // Convert USD amount to token amount
    const tokenAmount = dollarAmount / priceInfo.priceUsd;
    // Round to reasonable precision to avoid floating point issues
    const formattedTokenAmount = tokenAmount.toFixed(6);

    console.log('🔍 [USD Intelligence] Converting USD to token:', {
      dollarAmount,
      tokenPrice: priceInfo.priceUsd,
      calculatedTokenAmount: tokenAmount,
      formattedTokenAmount
    });

    planData.amount = formattedTokenAmount;
    planData.usdEstimate = {
      amountUsd: dollarAmount,
      tokenPriceUsd: priceInfo.priceUsd,
    };
    // Clean up internal flag
    delete planData._isDollarAmount;
  } else {
    // Amount is in token units - keep original amount, just calculate USD equivalent
    const tokenAmount = Number(planData.amount);
    if (!isFinite(tokenAmount) || tokenAmount <= 0) return;

    console.log('🔍 [USD Intelligence] Calculating USD equivalent for token amount:', {
      tokenAmount,
      tokenPrice: priceInfo.priceUsd,
      usdEquivalent: tokenAmount * priceInfo.priceUsd
    });

    // Don't modify the amount - keep user's original input
    planData.usdEstimate = {
      amountUsd: tokenAmount * priceInfo.priceUsd,
      tokenPriceUsd: priceInfo.priceUsd,
    };
    // Clean up internal flag
    delete planData._isDollarAmount;
  }

  console.log('🔍 [USD Intelligence] Final planData:', planData);
}

/**
 * Singleton instance
 */
export const gptIntelligence = new GPTIntelligenceService();
