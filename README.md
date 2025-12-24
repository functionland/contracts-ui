# FULA Token Vesting Dashboard

A decentralized application for managing and claiming vested FULA tokens. Built with React, Vite, and wagmi for seamless wallet integration.

## Features

- **Token Vesting**: View and claim vested tokens on Ethereum Mainnet and Base
- **Airdrop Claims**: Claim airdrop allocations on IoTeX and Base
- **Testnet Mining**: Claim testnet mining rewards on SKALE Europa
- **Multi-Chain Support**: Works with Ethereum Mainnet, Base, SKALE Europa, and IoTeX
- **Mobile & Desktop**: Works on both desktop and mobile browsers with wallet extensions

## Supported Chains

- Ethereum Mainnet
- Base
- SKALE Europa
- IoTeX

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Web3 wallet (MetaMask, Coinbase Wallet, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/functionland/claim-ui.git
cd claim-ui

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

This project is configured for GitHub Pages deployment. Simply push to the `main` branch and the GitHub Actions workflow will automatically build and deploy.

### Manual Deployment

1. Build the project: `npm run build`
2. Deploy the `dist` folder to any static hosting service

### GitHub Pages Configuration

1. Go to your repository settings
2. Navigate to "Pages"
3. Set source to "GitHub Actions"
4. Push to main branch to trigger deployment

## Project Structure

```
src/
├── components/       # React components
│   ├── admin/       # Admin panel components
│   ├── common/      # Shared components (ConnectButton, etc.)
│   └── vesting/     # Vesting-related components
├── config/          # Configuration files
│   ├── abis.ts      # Contract ABIs
│   ├── chains.ts    # Chain configurations
│   ├── constants.ts # App constants
│   └── contracts.ts # Contract addresses
├── contexts/        # React contexts
├── hooks/           # Custom React hooks
├── pages/           # Page components
├── types/           # TypeScript types
└── utils/           # Utility functions
```

## Smart Contracts

The dashboard interacts with the following contracts:

- **Token Contract**: ERC20 FULA token
- **Distribution Contract**: Token vesting/distribution
- **Airdrop Contract**: Airdrop claims
- **Testnet Mining Contract**: Testnet mining rewards
- **Staking Contract**: Token staking
- **Storage Pool Contract**: Storage pool management
- **Reward Engine Contract**: Reward calculations

## Wallet Connection

This app uses wagmi with injected wallet connectors, supporting:

- MetaMask
- Coinbase Wallet
- Any browser wallet that injects the ethereum provider

No WalletConnect project ID is required - the app works with browser-based wallets out of the box.

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## License

MIT License

## Support

For support, please contact hi@fx.land
