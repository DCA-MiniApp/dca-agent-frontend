# DCA Agent 🤖💰

A **Farcaster Mini App** for automated cryptocurrency investment using Dollar Cost Averaging (DCA) strategies. Built with Next.js, TypeScript, and integrated with Farcaster's social protocol.

## 🌟 Features

### 💬 AI-Powered Chat Interface
- **Natural Language Processing**: Chat with an intelligent DCA assistant using conversational commands
- **Smart Plan Creation**: Simply say "I want to invest $50 USDC into ETH daily for 3 months" and the AI will create your strategy


### 📈 Automated DCA Strategies
- **Flexible Investment Plans**: Create automated investment strategies with customizable parameters
- **Multiple Token Support**: Invest in popular cryptocurrencies (USDC, ETH, BTC, ARB, WBTC, DAI, USDT)
- **Smart Scheduling**: Choose from various intervals (daily, weekly, hourly, or custom minutes)
- **Duration Control**: Set investment periods from days to months
- **Slippage Protection**: Configurable slippage tolerance (default 2%)

### 🏦 Multi-Chain Wallet Integration
- **Arbitrum Network**: Primary network for DCA execution
- **Wallet Support**: Connect with Farcaster custody wallets or external wallets
- **Token Approvals**: Secure token approval system for automated transactions


### 📊 Portfolio Management
- **Live Portfolio Overview**: Track total invested amounts and USD values
- **Plan Status Tracking**: Monitor active, paused, and completed strategies
- **Execution History**: Detailed transaction history with gas fees and exchange rates
- **Performance Analytics**: Real-time portfolio performance metrics

### 🎯 User Experience
- **Farcaster Integration**: Native Farcaster mini app with social features
- **Responsive Design**: Optimized for mobile and desktop
- **Smooth Animations**: Beautiful UI with Framer Motion animations
- **Onboarding Flow**: Interactive tutorial for new users


## 🚀 How It Works

### 1. **Connect Your Wallet**
- Link your Farcaster wallet or external wallet
- Ensure you're on the Arbitrum network
- Have USDC or other supported tokens ready

### 2. **Create DCA Plans**
- Use natural language: *"Create a DCA plan with 100 USDC to ETH every day for 2 months"*
- Or use the guided interface to set parameters manually
- Review and confirm your strategy

### 3. **Approve Token Spending**
- Approve the DCA contract to spend your tokens
- Set appropriate slippage tolerance
- Confirm the transaction

### 4. **Automated Execution**
- The system automatically executes your DCA strategy
- Trades are executed at specified intervals
- Monitor progress in real-time

### 5. **Manage & Monitor**
- Pause, resume, or cancel strategies anytime
- View detailed execution history
- Track portfolio performance

## 🛠️ Technical Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Wagmi** - Ethereum wallet integration

### Backend & APIs
- **Farcaster SDK** - Social protocol integration
- **Neynar API** - Farcaster data and user management
- **VibeKit Agent** - AI-powered conversation handling



## 📱 Supported Networks & Tokens

### Networks
- **Arbitrum One** (Primary)
- **Ethereum Mainnet** (Wallet connection)

### Supported Tokens
- **USDC** - USD Coin
- **ETH** - Ethereum
- **BTC/WBTC** - Bitcoin (Wrapped)
- **ARB** - Arbitrum Token
- **DAI** - Dai Stablecoin
- **USDT** - Tether USD

## 🎮 Usage Examples

### Chat Commands
```
"Create a DCA plan with 50 USDC to ETH daily for 1 month"
"Show my active plans"
"Pause plan [plan-id]"
"Platform stats"
"What can you help me with?"
```

### Plan Parameters
- **Amount**: Any amount in supported tokens
- **Frequency**: Daily, weekly, hourly, or custom intervals
- **Duration**: Days, weeks, or months
- **Slippage**: 0.1% to 5% (default 2%)

## 🔧 Development

### Prerequisites
- Node.js 18+
- Yarn package manager
- Farcaster account
- Arbitrum wallet with test tokens

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd dca-agent

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.local
# Configure your environment variables

# Run development server
yarn dev
```

### Available Scripts
- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn deploy:vercel` - Deploy to Vercel

## 🏗️ Architecture

### Components Structure
```
src/
├── app/                 # Next.js App Router
├── components/          # React components
│   ├── ui/             # UI components
│   │   ├── tabs/       # Tab components (Home, Actions, Context, Wallet)
│   │   └── wallet/     # Wallet-specific components
│   └── providers/      # Context providers
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
└── api/                # API routes
```

### Key Features
- **Tab-based Navigation**: Home, Actions (Chat), Context (History), Wallet
- **Real-time Updates**: Live portfolio and plan status
- **Error Handling**: Comprehensive error management
- **Responsive Design**: Mobile-first approach


*Start your automated investment journey today with DCA Agent!*