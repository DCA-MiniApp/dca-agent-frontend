import React from "react";

interface ChatInputProps {
  inputMessage: string;
  isWalletConnected: boolean;
  isConnected: boolean;
  isLoading: boolean;
  isApprovalLoading: boolean;
  isApprovePending: boolean;
  isApprovalConfirming: boolean;
  isPlanCreationLoading: boolean;
  isInPlanCreationFlow: boolean;
  quickStartInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onInputFocus: () => void;
  onAdjustHeight: () => void;
}

export function ChatInput({
  inputMessage,
  isWalletConnected,
  isConnected,
  isLoading,
  isApprovalLoading,
  isApprovePending,
  isApprovalConfirming,
  isPlanCreationLoading,
  isInPlanCreationFlow,
  quickStartInputRef,
  onInputChange,
  onSendMessage,
  onInputFocus,
  onAdjustHeight,
}: ChatInputProps) {
  const canSend =
    isWalletConnected &&
    !isLoading &&
    !isApprovalLoading &&
    !isApprovePending &&
    !isApprovalConfirming &&
    !isPlanCreationLoading &&
    inputMessage.trim().length > 0;

  const isAnySending = isLoading || isApprovalLoading || isPlanCreationLoading;

  return (
    <>
      {/* Plan Creation Mode Indicator */}
      {isInPlanCreationFlow && (
        <div className="flex items-center gap-2 mb-1 text-xs">
          <div className="w-2 h-2 rounded-full bg-[#c199e4] animate-pulse" />
          <span className="text-[#c199e4]/80">
            Plan Creation Mode - Review your investment details
          </span>
        </div>
      )}

      <div className="flex items-center space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={quickStartInputRef}
            value={inputMessage}
            onChange={(e) => {
              onInputChange(e.target.value);
              onAdjustHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSendMessage();
              }
            }}
            onFocus={onInputFocus}
            placeholder={
              isInPlanCreationFlow
                ? "Review the plan details above and click 'Review Plan Details' to proceed..."
                : isConnected
                  ? "Ask me anything about DCA investing..."
                  : "Connect wallet first, then ask about DCA strategies"
            }
            className="w-full px-4 py-2 border border-white/30 rounded-2xl bg-white/10 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#c199e4]/50 focus:border-[#c199e4]/50 transition-all duration-300 resize-none leading-relaxed"
            rows={1}
            style={{ minHeight: 44, maxHeight: 180, overflowY: "auto" }}
          />
        </div>
        <button
          onClick={onSendMessage}
          disabled={
            !isConnected ||
            !inputMessage.trim() ||
            isLoading ||
            isApprovalLoading ||
            isApprovePending ||
            isApprovalConfirming ||
            isPlanCreationLoading
          }
          className="h-11 w-11 p-0 bg-gradient-to-br from-[#c199e4] to-[#b380db] hover:from-[#d9b3ed] hover:to-[#c199e4] disabled:from-white/20 disabled:to-white/10 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg backdrop-blur-sm"
          aria-label="Send message"
        >
          {isAnySending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19V5m0 0l-7 7m7-7l7 7"
              />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
