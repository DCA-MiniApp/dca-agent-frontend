'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMiniApp } from '@neynar/react';
import { ShareButton } from '../Share';
 
import { type Haptics } from '@farcaster/miniapp-sdk';
import { APP_URL } from '~/lib/constants';
import { useAccount } from 'wagmi';
import { truncateAddress } from "../../../lib/truncateAddress";

/**
 * ActionsTab component handles mini app actions like sharing, notifications, and haptic feedback.
 * 
 * NEW: Now includes a ChatGPT-style chat interface for DCA agent interactions.
 *
 * This component provides the main interaction interface for users to:
 * - Chat with the DCA agent using natural language
 * - Share the mini app with others
 * - Sign in with Farcaster
 * - Send notifications to their account
 * - Trigger haptic feedback
 * - Add the mini app to their client
 * - Copy share URLs
 *
 * The component uses the useMiniApp hook to access Farcaster context and actions.
 * All state is managed locally within this component.
 *
 * @example
 * ```tsx
 * <ActionsTab />
 * ```
 */

// Chat message interface
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Helper to format addresses nicely (e.g., 0x1234...ABCD)
function formatAddress(address: string, prefixLength = 6, suffixLength = 4): string {
  if (!address) return '';
  if (address.length <= prefixLength + suffixLength) return address;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

export function ActionsTab() {
  // --- Hooks ---
  const { actions, added, notificationDetails, haptics, context } =
    useMiniApp();

    const { address, isConnected } = useAccount();
  // --- State ---
  const [notificationState, setNotificationState] = useState({
    sendStatus: '',
    shareUrlCopied: false,
  });
  const [selectedHapticIntensity, setSelectedHapticIntensity] =
    useState<Haptics.ImpactOccurredType>('medium');

  // --- Chat State ---
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your DCA (Dollar Cost Averaging) investment assistant powered by AI. I can help you:\n\n🎯 Create automated investment strategies\n📊 Analyze your portfolio performance\n⚙️ Manage your DCA plans\n💡 Get personalized investment advice\n\n${isConnected ? `I see your wallet is connected (${formatAddress(address || '')}) - we're ready to get started!` : 'Please connect your wallet to access all features.'}\n\nWhat would you like to do today?`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | null>(null);

  // --- Layout/Refs for better UX ---
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const [inputContainerHeight, setInputContainerHeight] = useState<number>(72);

  // Respect miniapp safe area insets
  const safeTop = context?.client?.safeAreaInsets?.top ?? 0;
  const safeBottom = context?.client?.safeAreaInsets?.bottom ?? 0;

  useEffect(() => {
    // Keep input height in sync (handles textarea growth and device rotations)
    if (!inputContainerRef.current) return;
    const el = inputContainerRef.current;
    const updateHeight = () => setInputContainerHeight(el.getBoundingClientRect().height);
    updateHeight();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateHeight());
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, []);

  const scrollToBottom = (smooth = true) => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
  };

  useEffect(() => {
    // Auto-scroll on new messages or while loading
    scrollToBottom(true);
  }, [messages, isLoading]);

  useEffect(() => {
    // Update chat context when wallet connection changes
    if (isConnected && address) {
      setConnectionStatus('connected');
      // Add a system message about wallet connection
      const connectionMessage: ChatMessage = {
        id: `wallet-${Date.now()}`,
        role: 'assistant',
        content: `✅ Great! Your wallet (${formatAddress(address)}) is now connected. I can now help you with:\n\n• Creating DCA investment plans\n• Viewing your existing strategies\n• Managing plan status (pause/resume)\n• Tracking your portfolio performance\n\nWhat would you like to do first?`,
        timestamp: new Date()
      };
      
      setMessages(prev => {
        // Only add if not already added for this address
        const hasConnectionMessage = prev.some(msg => msg.content.includes(formatAddress(address)));
        if (!hasConnectionMessage) {
          return [...prev, connectionMessage];
        }
        return prev;
      });
    } else if (!isConnected && connectionStatus === 'connected') {
      // Wallet was disconnected
      setConnectionStatus(null);
      const disconnectionMessage: ChatMessage = {
        id: `wallet-disconnect-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Your wallet has been disconnected. Some features like creating DCA plans and viewing your portfolio will be limited. Please reconnect your wallet to access all features.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, disconnectionMessage]);
    }
  }, [isConnected, address, connectionStatus]);

  // --- Chat Handlers ---
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    console.log('userMessage', userMessage);

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    scrollToBottom(false);

    try {
      // Set connecting status
      setConnectionStatus('connecting');
      
      // Call our DCA chat API endpoint
      const response = await fetch('/api/dca-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          userAddress: address,
          conversationHistory: messages.slice(-6) // Include last 6 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('DCA Chat API response:', result);

      if (result.success) {
        // Set connected status on successful response
        setConnectionStatus('connected');
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response || 'I received your message but had trouble generating a response.',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Handle specific actions if provided
        if (result.action) {
          handleChatAction(result.action, result.data);
        }
      } else {
        setConnectionStatus('error');
        throw new Error(result.error || 'Unknown API error');
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('Error sending message to DCA backend:', error);
      
      // Fallback to local response generation on error
      const fallbackResponse = generateAssistantResponse(currentInput);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ I'm having trouble connecting to the DCA backend right now. Here's a basic response:\n\n${fallbackResponse}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
      scrollToBottom(true);
    }
  }, [inputMessage, isLoading, address, messages]);

  // --- Chat Action Handlers ---
  const handleChatAction = useCallback((action: string, data?: any) => {
    console.log('Handling chat action:', action, data);
    
    switch (action) {
      case 'request_wallet_connection':
        // Could trigger wallet connection modal or guide user
        console.log('Action: Request wallet connection');
        break;
        
      case 'plan_created':
        // Could show success animation or redirect to plans view
        console.log('Action: Plan created successfully');
        break;
        
      case 'show_plans':
        // Could display plans in a structured format or table
        console.log('Action: Show user plans', data);
        break;
        
      case 'show_stats':
        // Could display stats in a chart or structured format
        console.log('Action: Show platform stats', data);
        break;
        
      case 'execution_triggered':
        // Could show transaction status or redirect to transaction view
        console.log('Action: DCA execution triggered');
        break;
        
      case 'plan_paused':
      case 'plan_resumed':
        // Could show confirmation message
        console.log('Action: Plan status changed');
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  }, []);

  const generateAssistantResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('create') && lowerInput.includes('strategy')) {
      return "I'll help you create a DCA strategy! Here are some popular options:\n\n1. **Daily DCA**: Invest $10-50 daily into ETH\n2. **Weekly DCA**: Invest $100-500 weekly into BTC\n3. **Monthly DCA**: Invest $500-2000 monthly into a crypto basket\n\nWhat's your preferred investment amount and frequency?";
    }
    
    if (lowerInput.includes('balance') || lowerInput.includes('portfolio')) {
      return "Your current portfolio status:\n\n💰 **USDC Balance**: $1,250.75\n📈 **Total Invested**: $2,450.00\n🎯 **Active Strategies**: 1\n📊 **Portfolio Value**: $2,680.50 (+9.4%)\n\nWould you like to see detailed breakdown or adjust your strategy?";
    }
    
    if (lowerInput.includes('eth') || lowerInput.includes('ethereum')) {
      return "Ethereum is a great choice for DCA! Here's what I recommend:\n\n📊 **Current ETH Price**: $3,240\n💡 **Strategy**: Daily $25-50 into ETH\n📈 **Historical Performance**: ETH has shown strong long-term growth\n\nShould I set up an automated ETH DCA strategy for you?";
    }
    
    if (lowerInput.includes('stop') || lowerInput.includes('pause')) {
      return "I can help you pause or modify your investment strategy. Currently you have:\n\n⏸️ **DCA Strategy #1**: Active (Daily $50 into ETH)\n\nWould you like to:\n1. Pause this strategy temporarily\n2. Modify the investment amount\n3. Change the frequency\n4. Stop completely\n\nWhat would you prefer?";
    }
    
    if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
      return "I'm your DCA investment assistant! Here's what I can help you with:\n\n🎯 **Create Strategies**: Set up automated investment plans\n💰 **Portfolio Management**: Track your investments and performance\n📊 **Market Analysis**: Get insights on crypto trends\n⚙️ **Strategy Adjustments**: Modify or pause your DCA plans\n💡 **Investment Advice**: Get personalized recommendations\n\nJust ask me anything about your investments!";
    }
    
    return "I understand you're asking about: \"" + userInput + "\"\n\nI'm here to help with your DCA investment strategy. You can ask me to:\n\n• Create a new investment strategy\n• Check your portfolio balance\n• Modify existing strategies\n• Get market insights\n• Pause or stop investments\n\nWhat would you like to do?";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputFocus = () => {
    // Ensure the input is visible above the keyboard in miniapp environments
    setTimeout(() => scrollToBottom(false), 50);
  };

  // --- Original Handlers (Commented for now) ---
  /**
   * Sends a notification to the current user's Farcaster account.
   *
   * This function makes a POST request to the /api/send-notification endpoint
   * with the user's FID and notification details. It handles different response
   * statuses including success (200), rate limiting (429), and errors.
   *
   * @returns Promise that resolves when the notification is sent or fails
   */
  const sendFarcasterNotification = useCallback(async () => {
    setNotificationState((prev) => ({ ...prev, sendStatus: '' }));
    if (!notificationDetails || !context) {
      return;
    }
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        mode: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: context.user.fid,
          notificationDetails,
        }),
      });
      if (response.status === 200) {
        setNotificationState((prev) => ({ ...prev, sendStatus: 'Success' }));
        return;
      } else if (response.status === 429) {
        setNotificationState((prev) => ({
          ...prev,
          sendStatus: 'Rate limited',
        }));
        return;
      }
      const responseText = await response.text();
      setNotificationState((prev) => ({
        ...prev,
        sendStatus: `Error: ${responseText}`,
      }));
    } catch (error) {
      setNotificationState((prev) => ({
        ...prev,
        sendStatus: `Error: ${error}`,
      }));
    }
  }, [context, notificationDetails]);

  /**
   * Copies the share URL for the current user to the clipboard.
   *
   * This function generates a share URL using the user's FID and copies it
   * to the clipboard. It shows a temporary "Copied!" message for 2 seconds.
   */
  const copyUserShareUrl = useCallback(async () => {
    if (context?.user?.fid) {
      const userShareUrl = `${APP_URL}/share/${context.user.fid}`;
      await navigator.clipboard.writeText(userShareUrl);
      setNotificationState((prev) => ({ ...prev, shareUrlCopied: true }));
      setTimeout(
        () =>
          setNotificationState((prev) => ({ ...prev, shareUrlCopied: false })),
        2000
      );
    }
  }, [context?.user?.fid]);

  /**
   * Triggers haptic feedback with the selected intensity.
   *
   * This function calls the haptics.impactOccurred method with the current
   * selectedHapticIntensity setting. It handles errors gracefully by logging them.
   */
  const triggerHapticFeedback = useCallback(async () => {
    try {
      await haptics.impactOccurred(selectedHapticIntensity);
    } catch (error) {
      console.error('Haptic feedback failed:', error);
    }
  }, [haptics, selectedHapticIntensity]);



  // --- Render ---
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-0 relative" style={{ paddingTop: safeTop, paddingBottom: safeBottom }}>
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 pt-1 pb-4 space-y-3"
          style={{ paddingBottom: (inputContainerHeight + safeBottom + 8) }}
        >
          {/* Address pill above first message, right aligned */}
          <div className="flex justify-end">
            <div className="px-2.5 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 text-xs font-mono text-gray-800 dark:text-gray-200 shadow-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 3.134-7 7h2c0-2.761 2.239-5 5-5s5 2.239 5 5h2c0-3.866-3.134-7-7-7z" />
              </svg>
              {address && formatAddress(address)}
            </div>
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Anchor to scroll to bottom */}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Chat Input */}
        <div
          ref={inputContainerRef}
          className="border-t border-gray-200 dark:border-gray-700 p-4 sticky bottom-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur"
          style={{ paddingBottom: Math.max(12, 12 + safeBottom) }}
        >
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setInputMessage('Show my DCA plans')}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              📊 My Plans
            </button>
            <button
              onClick={() => setInputMessage('Create a new DCA strategy')}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              🎯 Create Plan
            </button>
            <button
              onClick={() => setInputMessage('Platform statistics')}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              📈 Stats
            </button>
            <button
              onClick={() => setInputMessage('Help me understand DCA')}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              ❓ Help
            </button>
          </div>

          {/* Connection Status Indicator */}
          {connectionStatus && (
            <div className="flex items-center gap-2 mb-3 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`} />
              <span className="text-gray-600 dark:text-gray-400">
                {connectionStatus === 'connected' && 'Connected to DCA Backend'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'error' && 'Connection Error'}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                placeholder={isConnected ? "Ask me anything about DCA investing..." : "Connect wallet first, then ask about DCA strategies"}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                style={{ minHeight: 44, maxHeight: 120 }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="h-11 w-11 p-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors flex items-center justify-center"
              aria-label="Send message"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Original Actions (Commented out for now) */}
      {/*
      <div className="space-y-3 px-6 w-full max-w-md mx-auto">
        <ShareButton
          buttonText="Share Mini App"
          cast={{
            text: 'Check out this awesome frame @1 @2 @3! 🚀🪐',
            bestFriends: true,
            embeds: [`${APP_URL}/share/${context?.user?.fid || ''}`],
          }}
          className="w-full"
        />

        <SignIn />

        <Button
          onClick={() =>
            actions.openUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
          }
          className="w-full"
        >
          Open Link
        </Button>

        <Button onClick={actions.addMiniApp} disabled={added} className="w-full">
          Add Mini App to Client
        </Button>

        {notificationState.sendStatus && (
          <div className="text-sm w-full">
            Send notification result: {notificationState.sendStatus}
          </div>
        )}
        <Button
          onClick={sendFarcasterNotification}
          disabled={!notificationDetails}
          className="w-full"
        >
          Send notification
        </Button>

        <Button
          onClick={copyUserShareUrl}
          disabled={!context?.user?.fid}
          className="w-full"
        >
          {notificationState.shareUrlCopied ? 'Copied!' : 'Copy share URL'}
        </Button>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Haptic Intensity
          </label>
          <select
            value={selectedHapticIntensity}
            onChange={(e) =>
              setSelectedHapticIntensity(
                e.target.value as Haptics.ImpactOccurredType
              )
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={'light'}>Light</option>
            <option value={'medium'}>Medium</option>
            <option value={'heavy'}>Heavy</option>
            <option value={'soft'}>Soft</option>
            <option value={'rigid'}>Rigid</option>
          </select>
          <Button onClick={triggerHapticFeedback} className="w-full">
            Trigger Haptic Feedback
          </Button>
        </div>
      </div>
      */}
    </div>
  );
}
