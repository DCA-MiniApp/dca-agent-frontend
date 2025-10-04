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
  validationErrors?: string[];
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

/**
 * Main GPT Intelligence Service
 */
export class GPTIntelligenceService {
  private readonly openaiApiKey: string;
  private readonly apiUrl = "https://api.openai.com/v1/chat/completions";

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || "";
    if (!this.openaiApiKey) {
      console.warn(
        "[GPT Intelligence] No OpenAI API key provided. Using fallback extraction."
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
      }
    }
    
    // Temporary: Force fallback mode due to quota issues
    // Remove this line once OpenAI quota is resolved
    if (process.env.FORCE_FALLBACK_MODE === 'true') {
      console.warn("[GPT Intelligence] FORCE_FALLBACK_MODE enabled. Using rule-based extraction only.");
      this.openaiApiKey = "";
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
    try {
      // If we have OpenAI API key, use GPT for intelligent extraction
      if (this.openaiApiKey) {
        return await this.extractWithGPT(
          userMessage,
          conversationHistory,
          currentPlanData
        );
      } else {
        // Fallback to rule-based extraction
        return this.extractWithRules(userMessage, currentPlanData);
      }
    } catch (error) {
      console.error("[GPT Intelligence] Extraction error:", error);
      // Fallback to rule-based on error
      return this.extractWithRules(userMessage, currentPlanData);
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
- amount: Investment amount per execution
- interval: Frequency string ("2 minutes", "daily", "weekly", etc.)
- duration: Duration string ("1 day", "3 weeks", "2 months", etc.)
- slippage: Optional slippage percentage

CRITICAL: Your response must be ONLY valid JSON in this exact format:
{
  "extractedData": {
    "fromToken": null,
    "toToken": null,
    "amount": null,
    "interval": null,
    "duration": null,
    "slippage": null
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
      const response = await fetch(this.apiUrl, {
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
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GPT Intelligence] OpenAI API error: ${response.status}`, errorText);
        
        if (response.status === 429) {
          console.error("[GPT Intelligence] Rate limit exceeded. This could be due to:");
          console.error("1. Too many requests per minute");
          console.error("2. Quota exceeded");
          console.error("3. Server overload");
          console.error("Falling back to rule-based extraction.");
        }
        
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const gptResponse = result.choices[0]?.message?.content;

      if (!gptResponse) {
        throw new Error("No response from GPT");
      }

      // Clean and parse GPT response
      console.log("[GPT Intelligence] Raw GPT response:", gptResponse);

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

      console.log("[GPT Intelligence] Cleaned response:", cleanedResponse);

      const parsed = JSON.parse(cleanedResponse);
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
        nextQuestion: parsed.nextQuestion || validation.nextQuestion,
        validationErrors:
          parsed.validationErrors || validation.validationErrors,
      };
    } catch (error) {
      console.error("[GPT Intelligence] GPT extraction failed:", error);
      // Fallback to rule-based extraction
      return this.extractWithRules(userMessage, currentPlanData);
    }
  }

  /**
   * Rule-based fallback extraction
   */
  private extractWithRules(
    userMessage: string,
    currentPlanData: Partial<DCAPlanData>
  ): ExtractionResult {
    const extracted = this.extractParametersWithRules(userMessage);
    const updatedPlanData = { ...currentPlanData, ...extracted };
    const validation = this.validatePlanData(updatedPlanData);

    return {
      isComplete: validation.isComplete,
      planData: updatedPlanData,
      missingFields: validation.missingFields,
      nextQuestion: validation.nextQuestion,
      validationErrors: validation.validationErrors,
    };
  }

  /**
   * Rule-based parameter extraction
   */
  private extractParametersWithRules(message: string): Partial<DCAPlanData> {
    const lowerMessage = message.toLowerCase();
    const extracted: Partial<DCAPlanData> = {};

    // Extract amount
    const amountMatch = message.match(
      /(\d+(?:\.\d+)?)\s*(?:usdc|usdt|dai|eth|btc|arb|weth|wbtc|dollars?|\$)/i
    );
    if (amountMatch) {
      extracted.amount = amountMatch[1];
    }

    // Extract tokens
    const tokens = Object.keys(availableTokens);
    const tokenRegex = new RegExp(`\\b(${tokens.join("|")})\\b`, "gi");
    const foundTokens = message.match(tokenRegex) || [];

    if (foundTokens.length >= 2) {
      extracted.fromToken = foundTokens[0]!.toUpperCase();
      extracted.toToken = foundTokens[1]!.toUpperCase();
    } else if (foundTokens.length === 1) {
      // Try to determine if it's from or to based on context
      const token = foundTokens[0]!.toUpperCase();
      if (
        lowerMessage.includes("from " + token.toLowerCase()) ||
        lowerMessage.includes(token.toLowerCase() + " into")
      ) {
        extracted.fromToken = token;
      } else if (
        lowerMessage.includes("into " + token.toLowerCase()) ||
        lowerMessage.includes("buy " + token.toLowerCase())
      ) {
        extracted.toToken = token;
      }
    }

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
      extracted.duration = `${duration} ${unit}${
        parseInt(duration) > 1 ? "s" : ""
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
   * Validate plan data completeness and correctness
   */
  private validatePlanData(planData: Partial<DCAPlanData>): {
    isComplete: boolean;
    missingFields: string[];
    nextQuestion?: string;
    validationErrors?: string[];
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
      (!availableTokens[planData.fromToken] ||
        availableTokens[planData.fromToken].length === 0)
    ) {
      validationErrors.push(
        `Token ${planData.fromToken} is not available on Arbitrum`
      );
    }
    if (
      planData.toToken &&
      (!availableTokens[planData.toToken] ||
        availableTokens[planData.toToken].length === 0)
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

    // No duration validation - backend handles all formats and durations

    // Generate next question
    let nextQuestion: string | undefined;
    if (missingFields.length > 0) {
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
          nextQuestion = `How much ${
            planData.fromToken || "tokens"
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
    const tokenInfoArray = availableTokens[planData.fromToken];
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

    return (
      `📊 **DCA Plan Summary:**\n` +
      `• Investment: ${planData.amount} ${planData.fromToken}\n` +
      `• Target: ${planData.toToken}\n` +
      `• Duration: ${planData.duration}\n` +
      `• Interval: ${planData.interval}\n` +
      `• Slippage: ${planData.slippage || "2"}%\n\n` +
      `💰 **Token:** ${formatTokenAddress(tokenInfo?.address || "")}\n` +
      `⚠️ **Note:** You'll need to approve unlimited spending for ${planData.fromToken} tokens to the executor.`
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

/**
 * Singleton instance
 */
export const gptIntelligence = new GPTIntelligenceService();
