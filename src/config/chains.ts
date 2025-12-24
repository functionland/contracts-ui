import type { Chain } from 'viem'
import { mainnet, sepolia, base, baseSepolia, iotex, skaleEuropa } from 'wagmi/chains'
import { SupportedChain } from './constants'

// Chain IDs
export const CHAIN_IDS = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  HARDHAT: 31337,
  IOTEX_TESTNET: 4690,
  SKALE_TESTNET: 1444673419,
  SFI_TESTNET: 751,
  BASE_SEPOLIA: 84532,
  BASE: 8453,
  IOTEX: 4689,
  SKALE: 2046399126,
  SFI: 752,
} as const

// RPC Configuration
export const RPC_URLS: Record<SupportedChain, string> = {
  mainnet: `https://rpc.flashbots.net`,
  sepolia: `https://1rpc.io/sepolia`,
  hardhat: 'http://127.0.0.1:8545',
  iotex: 'https://babel-api.mainnet.iotex.one',
  'skale-testnet': 'https://testnet.skalenodes.com/v1/juicy-low-small-testnet',
  "skale": 'https://mainnet.skalenodes.com/v1/elated-tan-skat',
  sfi: 'https://rpc-testnet.singularityfinance.ai',
  base: `https://base-rpc.publicnode.com`,
  'base-sepolia': 'https://sepolia.base.org',
}

// Network names mapping
export const NETWORK_NAMES: Record<number, string> = {
  [CHAIN_IDS.MAINNET]: 'Ethereum Mainnet',
  [CHAIN_IDS.SEPOLIA]: 'Sepolia Testnet',
  [CHAIN_IDS.HARDHAT]: 'Hardhat',
  [CHAIN_IDS.IOTEX_TESTNET]: 'IoTeX Testnet',
  [CHAIN_IDS.SKALE_TESTNET]: 'SKALE Testnet',
  [CHAIN_IDS.SFI_TESTNET]: 'SFI Testnet',
  [CHAIN_IDS.BASE_SEPOLIA]: 'Base Sepolia',
  [CHAIN_IDS.BASE]: 'Base',
  [CHAIN_IDS.IOTEX]: 'IoTeX',
  [CHAIN_IDS.SKALE]: 'SKALE Europa',
  [CHAIN_IDS.SFI]: 'SFI Mainnet',
} as const

// Custom chain configurations
export const customMainnet: Chain = {
  ...mainnet,
  rpcUrls: {
    ...mainnet.rpcUrls,
    default: {
      http: [RPC_URLS.mainnet],
    },
    public: {
      http: [RPC_URLS.mainnet],
    },
  },
}

export const customSepolia: Chain = {
  ...sepolia,
  rpcUrls: {
    ...sepolia.rpcUrls,
    default: {
      http: [RPC_URLS.sepolia],
    },
    public: {
      http: [RPC_URLS.sepolia],
    },
  },
}

export const iotexTestnet: Chain = {
  id: CHAIN_IDS.IOTEX_TESTNET,
  name: NETWORK_NAMES[CHAIN_IDS.IOTEX_TESTNET],
  nativeCurrency: {
    name: 'IoTeX',
    symbol: 'IOTX',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://babel-api.testnet.iotex.io'],
    },
    public: {
      http: ['https://babel-api.testnet.iotex.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'IoTeX Explorer',
      url: 'https://testnet.iotexscan.io',
    },
  },
} as const satisfies Chain

export const skaleTestnet: Chain = {
  id: CHAIN_IDS.SKALE_TESTNET,
  name: NETWORK_NAMES[CHAIN_IDS.SKALE_TESTNET],
  nativeCurrency: {
    name: 'SKALE',
    symbol: 'sFUEL',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.skalenodes.com/v1/juicy-low-small-testnet'],
    },
    public: {
      http: ['https://testnet.skalenodes.com/v1/juicy-low-small-testnet'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SKALE Explorer',
      url: 'https://europa-explorer.testnet.skalenodes.com',
    },
  },
  testnet: true,
}

export const sfiTestnet: Chain = {
  id: CHAIN_IDS.SFI_TESTNET,
  name: NETWORK_NAMES[CHAIN_IDS.SFI_TESTNET],
  nativeCurrency: {
    name: 'SFI',
    symbol: 'SFI',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-testnet.singularityfinance.ai'],
    },
    public: {
      http: ['https://rpc-testnet.singularityfinance.ai'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SFI Explorer',
      url: 'https://testnet-explorer.singularityfinance.ai',
    },
  },
  testnet: true,
}

export const customBaseSepolia: Chain = {
  ...baseSepolia,
  rpcUrls: {
    ...baseSepolia.rpcUrls,
    default: {
      http: ['https://sepolia.base.org'],
    },
    public: {
      http: ['https://sepolia.base.org'],
    },
  },
}

export const customBase: Chain = {
  ...base,
  rpcUrls: {
    ...base.rpcUrls,
    default: {
      http: [RPC_URLS.base || 'https://mainnet.base.org'],
    },
    public: {
      http: [RPC_URLS.base || 'https://mainnet.base.org'],
    },
  },
}

export const customIotex: Chain = {
  ...iotex,
}

export const customSkale: Chain = {
  ...skaleEuropa,
}

export const hardhat: Chain = {
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Placeholder Token',
    symbol: 'PLACEHOLDER',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  testnet: true,
}

// Supported chains configuration
export const supportedChains = [
  customMainnet,
  customBase,
  customSkale,
  customIotex,
  customSepolia,
  iotexTestnet,
  skaleTestnet,
  sfiTestnet,
  customBaseSepolia,
  hardhat,
] as const

// Block explorers
export const BLOCK_EXPLORERS: Record<number, string> = {
  [CHAIN_IDS.MAINNET]: 'https://etherscan.io',
  [CHAIN_IDS.SEPOLIA]: 'https://sepolia.etherscan.io',
  [CHAIN_IDS.HARDHAT]: 'https://sepolia.etherscan.io',
  [CHAIN_IDS.IOTEX_TESTNET]: 'https://testnet.iotexscan.io',
  [CHAIN_IDS.SKALE_TESTNET]: 'https://giant-half-dual-testnet.explorer.testnet.skalenodes.com',
  [CHAIN_IDS.SFI_TESTNET]: 'https://testnet-explorer.singularityfinance.ai',
  [CHAIN_IDS.BASE_SEPOLIA]: 'https://sepolia.explorer.base.org',
  [CHAIN_IDS.BASE]: 'https://explorer.base.org',
  [CHAIN_IDS.IOTEX]: 'https://iotexscan.io',
  [CHAIN_IDS.SKALE]: 'https://elated-tan-skat.explorer.mainnet.skalenodes.com',
  [CHAIN_IDS.SFI]: 'https://testnet-explorer.singularityfinance.ai',
} as const

// Helper functions
export function isSupported(chainId: number): boolean {
  return chainId in NETWORK_NAMES;
}

export function getNetworkName(chainId: number): string {
  return NETWORK_NAMES[chainId as keyof typeof NETWORK_NAMES] || 'Unknown Network';
}

export function getExplorerUrl(chainId: number, hash: string, type: 'tx' | 'address' = 'tx'): string {
  const baseUrl = BLOCK_EXPLORERS[chainId as keyof typeof BLOCK_EXPLORERS];
  if (!baseUrl) return '';
  return `${baseUrl}/${type}/${hash}`;
}
