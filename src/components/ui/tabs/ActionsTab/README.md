# ActionsTab Refactoring Plan

## Current Status
- **Original File Size**: 2,623 lines
- **Current File Size**: 1,703 lines
- **Total Reduction**: 920 lines (35.1%)
- **Status**: Phase 7 Complete ✅ (Final)

## Completed Phases

### ✅ Phase 1: Extract Constants, Types, and Utilities
**Reduction**: 286 lines (10.9%)
- Created `constants/index.ts` (56 lines)
- Created `types/index.ts` (33 lines)
- Created `utils/helpers.ts` (113 lines)
- Extracted PLAN_SIMULATION_STEPS, ChatMessage, StepStatus, etc.

### ✅ Phase 2: Extract getEthersSigner Utility
**Reduction**: Included in Phase 1
- Created `utils/signer.ts` (166 lines)
- Handles complex wallet client scenarios (Wagmi, Farcaster SDK, window.ethereum)

### ✅ Phase 3: Extract Custom Hooks
**Reduction**: 141 lines (6.6%)
- Created `hooks/useScrollBehavior.tsx` (92 lines)
  - Auto-scroll logic, scroll tracking, jump to latest
- Created `hooks/usePlanSimulation.tsx` (73 lines)
  - Plan simulation state, progress tracking, micro-ticker
- Enhanced `utils/helpers.ts` with `isPlanCreationRequest()` (48 lines)

### ✅ Phase 4: Extract Message Components
**Reduction**: 247 lines (11.5%)
- Created `components/PlanCreationProgress.tsx` (113 lines)
  - Simulation UI, step indicators, progress bar, ETA display
- Created `components/LoadingIndicator.tsx` (included in PlanCreationProgress)
  - Bouncing dots animation
- Created `components/ConfirmationButtons.tsx` (151 lines)
  - Approve/cancel buttons, status badges, loading states
- Created `components/DepositUI.tsx` (93 lines)
  - Deposit input, button, status display, responsive layout

## Remaining Work

### ✅ Phase 5: Extract Input Components
**Reduction**: 144 lines (7.6%)
- Created `components/QuickActionButtons.tsx` (71 lines)
  - Main action buttons (My Plans, Create Plan, Stats, Help)
  - Token quick-create buttons (WETH, ARB, WBTC, GMX, AAVE, wstETH)
  - Toggle between modes with smooth transitions
- Created `components/ChatInput.tsx` (123 lines)
  - Auto-resizing textarea with keyboard shortcuts
  - Plan creation mode indicator
  - Smart send button with loading states
  - Contextual placeholders based on wallet/plan state

### ✅ Phase 6: Create Additional Hooks
**Reduction**: 78 lines (4.4%)
- Created `hooks/useDepositFlow.tsx` (78 lines)
  - Deposit amount state management
  - Deposit status tracking
  - Loading state management
  - Deposit transaction handling with TriggerX integration
  - Error handling and user feedback

### ✅ Phase 7: Final Cleanup
**Reduction**: Optimized imports and extracted utilities
- Created `utils/markdown.tsx` (45 lines)
  - Extracted `renderMarkdownText` function
  - Supports **bold text** and line breaks
  - Reusable across the app
- Optimized import statements
- Organized code structure
- **Kept all console logs** for debugging

**Note**: Additional bugs were fixed during refactoring:
- Fixed approval process getting stuck on errors
- Added proper state resets on validation failures
- Improved typo handling in duration/interval parsing
- Fixed confirmation status when user cancels approval

## File Structure
```
ActionsTab/
├── components/
│   ├── ChatMessageBubble.tsx
│   ├── ConfirmationMessage.tsx
│   ├── DepositMessage.tsx
│   ├── PlanCreationProgress.tsx
│   ├── LoadingIndicator.tsx
│   ├── ChatInput.tsx
│   ├── QuickActionButtons.tsx
│   └── index.ts
├── hooks/
│   ├── useChatMessages.tsx
│   ├── useApprovalFlow.tsx
│   ├── usePlanCreation.tsx
│   ├── usePlanSimulation.tsx
│   ├── useScrollBehavior.tsx
│   └── index.ts
├── utils/
│   ├── helpers.ts (✅ Done)
│   ├── signer.ts (TODO)
│   └── index.ts
├── constants/
│   └── index.ts (✅ Done)
├── types/
│   └── index.ts (✅ Done)
└── README.md (✅ Done)
```

## Benefits of Refactoring
- **Maintainability**: Easier to find and fix bugs
- **Reusability**: Components can be reused
- **Testability**: Isolated units are easier to test
- **Readability**: Clear separation of concerns
- **Performance**: Easier to optimize individual components

## Next Steps
1. ✅ ~~Extract `getEthersSigner` to utils/signer.ts~~
2. ✅ ~~Create custom hooks (useScrollBehavior, usePlanSimulation)~~
3. ✅ ~~Extract message components (PlanCreationProgress, ConfirmationButtons, DepositUI)~~
4. ✅ ~~Extract input components (ChatInput, QuickActionButtons)~~
5. Create additional hooks (useChatMessages, useApprovalFlow, usePlanCreation)
6. Final cleanup and optimization

**Final Result**: 35.1% reduction (920 lines removed)
**Achievement**: Successfully refactored from 2,623 → 1,703 lines
**Code Quality**: Significantly improved maintainability and organization

## Notes
- The file contains complex approval and plan creation flows
- Multiple state machines need careful extraction
- WebSocket/API integrations need to be preserved
- All existing functionality must be maintained
