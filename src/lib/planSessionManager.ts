/**
 * Plan Session Manager
 * 
 * Manages conversation state for intelligent DCA plan creation.
 * Tracks partial plan data across multiple user messages.
 */

import type { DCAPlanData } from './gptIntelligence';

export interface PlanSession {
  id: string;
  userAddress?: string;
  planData: Partial<DCAPlanData>;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  isActive: boolean;
  createdAt: string;
  lastActiveAt: string;
}

/**
 * Plan Session Manager
 */
class PlanSessionManager {
  private sessions: Map<string, PlanSession> = new Map();
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes

  /**
   * Create or get existing session for user
   */
  getOrCreateSession(userAddress?: string): PlanSession {
    const sessionId = userAddress || 'anonymous';
    
    let session = this.sessions.get(sessionId);
    
    // Create new session if doesn't exist or expired
    if (!session || this.isSessionExpired(session)) {
      session = {
        id: sessionId,
        userAddress,
        planData: {},
        conversationHistory: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
      this.sessions.set(sessionId, session);
    }

    // Update last active time
    session.lastActiveAt = new Date().toISOString();
    return session;
  }

  /**
   * Update session with new plan data
   */
  updateSessionPlanData(sessionId: string, planData: Partial<DCAPlanData>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.planData = { ...session.planData, ...planData };
      session.lastActiveAt = new Date().toISOString();
    }
  }

  /**
   * Add message to conversation history
   */
  addToConversationHistory(
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.conversationHistory.push({
        role,
        content,
        timestamp: new Date().toISOString(),
      });
      
      // Keep only last 10 messages to avoid too much context
      if (session.conversationHistory.length > 10) {
        session.conversationHistory = session.conversationHistory.slice(-10);
      }
      
      session.lastActiveAt = new Date().toISOString();
    }
  }

  /**
   * Clear session (after plan creation or cancellation)
   */
  clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.planData = {};
      session.conversationHistory = [];
      session.isActive = false;
    }
  }

  /**
   * Get session data
   */
  getSession(sessionId: string): PlanSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || this.isSessionExpired(session)) {
      return null;
    }
    return session;
  }

  /**
   * Check if session has any plan data
   */
  hasPartialPlanData(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    return Object.keys(session.planData).length > 0;
  }

  /**
   * Get conversation context for GPT
   */
  getConversationContext(sessionId: string): Array<{role: string, content: string}> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    
    return session.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Check if message is plan creation intent
   */
  isPlanCreationIntent(message: string, sessionId?: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Strong plan creation indicators
    const strongIndicators = [
      'create plan', 'create dca', 'set up plan', 'start plan',
      'make plan', 'new plan', 'investment plan', 'dca strategy'
    ];
    
    const hasStrongIndicator = strongIndicators.some(indicator => 
      lowerMessage.includes(indicator)
    );
    
    if (hasStrongIndicator) return true;
    
    // Check if user is already in a plan creation conversation
    if (sessionId && this.hasPartialPlanData(sessionId)) {
      return true;
    }
    
    // Weaker indicators combined with investment terms
    const creationKeywords = ['create', 'make', 'set up', 'start', 'begin', 'invest'];
    const investmentKeywords = ['dca', 'plan', 'strategy', 'investment', 'buy', 'swap'];
    const tokenKeywords = ['usdc', 'eth', 'btc', 'arb', 'token'];
    
    const hasCreationKeyword = creationKeywords.some(kw => lowerMessage.includes(kw));
    const hasInvestmentKeyword = investmentKeywords.some(kw => lowerMessage.includes(kw));
    const hasTokenKeyword = tokenKeywords.some(kw => lowerMessage.includes(kw));
    
    return hasCreationKeyword && (hasInvestmentKeyword || hasTokenKeyword);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: PlanSession): boolean {
    const lastActive = new Date(session.lastActiveAt).getTime();
    const now = Date.now();
    return (now - lastActive) > this.sessionTimeout;
  }

  /**
   * Get session stats (for debugging)
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    sessionsWithPlanData: number;
  } {
    let activeSessions = 0;
    let sessionsWithPlanData = 0;
    
    for (const session of this.sessions.values()) {
      if (!this.isSessionExpired(session)) {
        activeSessions++;
        if (Object.keys(session.planData).length > 0) {
          sessionsWithPlanData++;
        }
      }
    }
    
    return {
      totalSessions: this.sessions.size,
      activeSessions,
      sessionsWithPlanData,
    };
  }
}

/**
 * Singleton instance
 */
export const planSessionManager = new PlanSessionManager();

// Clean up expired sessions every 10 minutes
setInterval(() => {
  planSessionManager.cleanupExpiredSessions();
}, 10 * 60 * 1000);
