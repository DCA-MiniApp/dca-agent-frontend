'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMiniApp } from '@neynar/react';
 
import { type Haptics } from '@farcaster/miniapp-sdk';
import { APP_URL } from '~/lib/constants';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { IoPersonCircle } from 'react-icons/io5';
// import { TbRobot } from "react-icons/tb";
import { RiRobot2Fill } from "react-icons/ri";

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
  const {notificationDetails, haptics, context } =
    useMiniApp();

    const { address, isConnected } = useAccount();
    const router = useRouter();
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      {/* <div className="flex-shrink-0 bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center border border-[#c199e4]/20">
            <svg className="w-6 h-6 text-[#c199e4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              DCA Chat Assistant
            </h2>
            <p className="text-sm text-white/70">
              Get help with your dollar cost averaging strategies
            </p>
          </div>
        </div>
      </div> */}

      {/* Chat Container */}
      <div className="flex-1 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 overflow-hidden flex flex-col">
        {/* Address pill */}
        <div className="flex-shrink-0 flex justify-end p-3 pb-2">
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 border border-[#c199e4]/30 text-xs font-mono text-white/90 shadow-sm flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-[#c199e4]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 3.134-7 7h2c0-2.761 2.239-5 5-5s5 2.239 5 5h2c0-3.866-3.134-7-7-7z" />
            </svg>
            {address ? formatAddress(address) : 'Not Connected'}
          </div>
        </div>

        {/* Chat Messages - Scrollable */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: '#c199e4 transparent'
          }}
        >

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-1.5 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div className={`flex-shrink-0 size-6 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-gradient-to-br from-[#c199e4] to-[#b380db]' 
                  : 'bg-gradient-to-br from-white/20 to-white/10 border border-white/30'
              }`}>
                {message.role === 'user' ? (
                  <IoPersonCircle className="size-4 text-white" />
                ) : (
                  <RiRobot2Fill className="size-3.5 text-[#c199e4]" />
                )}
              </div>

              {/* Message Content */}
              <div
                className={`rounded-2xl px-3 py-3 ${
                  message.role === 'user'
                    ? 'max-w-[75%] bg-gradient-to-br from-[#c199e4] to-[#b380db] text-white shadow-lg'
                    : 'bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-sm text-white border border-white/20'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-white/80' : 'text-white/60'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Anchor to scroll to bottom */}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Chat Input - Fixed at Bottom */}
        <div
          ref={inputContainerRef}
          className="flex-shrink-0 border-t border-white/20 px-4 py-2 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-lg"
          // style={{ paddingBottom: Math.max(12, 12 + safeBottom) }}
        >
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => setInputMessage('Show my DCA plans')}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              My Plans
            </button>
            <button
              onClick={() => setInputMessage('Create a new DCA strategy')}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              Create Plan
            </button>
            <button
              onClick={() => setInputMessage('Platform statistics')}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              Stats
            </button>
            <button
              onClick={() => setInputMessage('Help me understand DCA')}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              Help
            </button>
          </div>

          {/* Connection Status Indicator */}
          {connectionStatus && (
            <div className="flex items-center gap-2 mb-1 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                'bg-red-400'
              }`} />
              <span className="text-white/70">
                {connectionStatus === 'connected' && 'Connected to DCA Backend'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'error' && 'Connection Error'}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onFocus={handleInputFocus}
                placeholder={isConnected ? "Ask me anything about DCA investing..." : "Connect wallet first, then ask about DCA strategies"}
                className="w-full px-4 py-1.5 border border-white/30 rounded-2xl bg-white/10 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#c199e4]/50 focus:border-[#c199e4]/50 transition-all duration-300"
                style={{ minHeight: 44 }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="h-11 w-11 p-0 bg-gradient-to-br from-[#c199e4] to-[#b380db] hover:from-[#d9b3ed] hover:to-[#c199e4] disabled:from-white/20 disabled:to-white/10 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg backdrop-blur-sm"
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
