import { keccak256, toBytes } from 'viem';

export const APP_NAME = 'FULA Token Vesting Dashboard'
export const APP_DESCRIPTION = 'Manage and claim your vested tokens'

export const SUPPORTED_CHAINS = [
  'mainnet',
  'sepolia',
  'hardhat',
  'iotex',
  'skale-testnet',
  'sfi',
  'base',
  'skale',
  'base-sepolia'
] as const
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number]

export const CHAIN_NAMES = {
  mainnet: 'Ethereum Mainnet',
  sepolia: 'Sepolia Testnet',
  hardhat: 'Hardhat',
  iotex: 'IoTeX Mainnet',
  'skale-testnet': 'SKALE Testnet',
  sfi: 'SFI Testnet',
  base: 'Base',
  'base-sepolia': 'Base Sepolia',
  skale: 'SKALE Europa',
} as const

export const DEFAULT_CHAIN = 'mainnet'

export const TIME_CONSTANTS = {
  SECONDS_PER_DAY: 86400,
  SECONDS_PER_MONTH: 2592000, // 30 days
  MILLISECONDS_PER_DAY: 86400000,
} as const

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  WRONG_NETWORK: 'Please switch to a supported network',
  NO_VESTING_DATA: 'No vesting data found',
  CLAIM_FAILED: 'Failed to claim tokens',
  INSUFFICIENT_BALANCE: 'Insufficient contract balance',
  CLIFF_NOT_REACHED: 'Cliff period not reached',
} as const

export const UI_CONSTANTS = {
  MAX_DECIMALS_DISPLAY: 6,
  TRANSACTION_TIMEOUT: 30000, // 30 seconds
  POLLING_INTERVAL: 15000, // 15 seconds
} as const

export const CONTRACT_TYPES = {
  TOKEN: 'token',
  VESTING: 'vesting',
  AIRDROP: 'airdrop',
  TESTNET_MINING: 'testnet_mining',
  STAKING: 'staking',
  STORAGE_POOL: 'storage_pool',
  REWARD_ENGINE: 'reward_engine',
  STAKING_ENGINE_LINEAR: 'staking_engine_linear',
} as const

export type ContractType = typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES]

export const LINKS = {
  DOCS: 'https://docs.fx.land',
  TERMS: 'https://fx.land/terms',
  PRIVACY: 'https://fx.land/privacy',
  SUPPORT: 'https://support.fx.land',
} as const

export const ROLES = {
  BRIDGE_OPERATOR_ROLE: keccak256(toBytes('BRIDGE_OPERATOR_ROLE')),
  CONTRACT_OPERATOR_ROLE: keccak256(toBytes('CONTRACT_OPERATOR_ROLE')),
  ADMIN_ROLE: keccak256(toBytes('ADMIN_ROLE')),
  POOL_ADMIN_ROLE: keccak256(toBytes('POOL_ADMIN_ROLE')),
} as const;

export const ROLE_NAMES = {
  [ROLES.BRIDGE_OPERATOR_ROLE]: 'Bridge Operator',
  [ROLES.CONTRACT_OPERATOR_ROLE]: 'Contract Operator',
  [ROLES.ADMIN_ROLE]: 'Admin',
  [ROLES.POOL_ADMIN_ROLE]: 'Pool Admin',
} as const;

export const PROPOSAL_TYPES = {
  NA: 0,
  AddRole: 1,
  RemoveRole: 2,
  Upgrade: 3,
  Recovery: 4,
  AddWhitelist: 5,
  RemoveWhitelist: 6,
  AddDistributionWallets: 7,
  RemoveDistributionWallet: 8,
  AddToBlacklist: 9,
  RemoveFromBlacklist: 10,
  ChangeTreasuryFee: 11
} as const;
