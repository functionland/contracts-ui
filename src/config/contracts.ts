import { type Address } from 'viem'
import { TOKEN_ABI, DISTRIBUTION_ABI, TESTNET_MINING_ABI, STAKING_ABI, STAKING_ENGINE_LINEAR_ABI, STORAGE_POOL_ABI, REWARD_ENGINE_ABI, PROPOSAL_TYPES } from './abis';
import { ROLES, CONTRACT_TYPES } from './constants';
import { CHAIN_IDS } from './chains';

// Contract Addresses - These are public and safe to expose in GitHub Pages
// Ethereum Mainnet
const ETHEREUM_TOKEN_ADDRESS = '0x92217cCaEDBdbc54C76c15feA18823db1558fDc9' as Address;
const ETHEREUM_VESTING_CONTRACT_ADDRESS = '0xBaC63ba0c874A73847b389f426d603AFcb597424' as Address;

// Base
const BASE_TOKEN_ADDRESS = '0x9e12735d77c72c5C3670636D428f2F3815d8A4cB' as Address;
const BASE_VESTING_CONTRACT_ADDRESS = '0x0C85A8E992E3Eb04A22027F7E0BC53392A331aC8' as Address;
const BASE_AIRDROP_CONTRACT_ADDRESS = '0x0AF8Bf19C18a3c7352f831cf950CA8971202e4Be' as Address;
const BASE_TESTNET_MINING_CONTRACT_ADDRESS = '0x1Def7229f6d6Ca5fbA4f9e28Cd1cf4e2688e545d' as Address;
const BASE_STAKING_CONTRACT_ADDRESS = '0x32A2b049b1E7A6c8C26284DE49e7F05A00466a5d' as Address;
const BASE_STORAGE_POOL_CONTRACT_ADDRESS = '0xb093fF4B3B3B87a712107B26566e0cCE5E752b4D' as Address;
const BASE_REWARD_ENGINE_CONTRACT_ADDRESS = '0x31029f90405fd3D9cB0835c6d21b9DFF058Df45A' as Address;
const BASE_STAKING_ENGINE_LINEAR_CONTRACT_ADDRESS = '0xb2064743e3da40bB4C18e80620A02a38e87fB145' as Address;

// IoTeX
const IOTEX_TOKEN_ADDRESS = '0x9e12735d77c72c5C3670636D428f2F3815d8A4cB' as Address;
const IOTEX_AIRDROP_CONTRACT_ADDRESS = '0x92217cCaEDBdbc54C76c15feA18823db1558fDc9' as Address;
const IOTEX_STAKING_CONTRACT_ADDRESS = '0xfe3574Fc1CC7c389fd916e891A497A4D986a8268' as Address;

// SKALE Europa
const SKALE_TOKEN_ADDRESS = '0x9e12735d77c72c5C3670636D428f2F3815d8A4cB' as Address;
const SKALE_TESTNET_MINING_CONTRACT_ADDRESS = '0x92217cCaEDBdbc54C76c15feA18823db1558fDc9' as Address;
const SKALE_STAKING_CONTRACT_ADDRESS = '0xA002a09Fb3b9E8ac930B72C61De6F3979335bFa2' as Address;
const SKALE_STORAGE_POOL_CONTRACT_ADDRESS = '0xf9176Ffde541bF0aa7884298Ce538c471Ad0F015' as Address;
const SKALE_REWARD_ENGINE_CONTRACT_ADDRESS = '0xF7c64248294C45Eb3AcdD282b58675F1831fb047' as Address;

// Sepolia (Testnet)
const SEPOLIA_TOKEN_ADDRESS = '0xF12DB2c20d92cC18eD9922b03b55ECC352b9013c' as Address;
const SEPOLIA_VESTING_CONTRACT_ADDRESS = '0x3A21d01BE82ECED19e00e4BAf9485C83a90E2186' as Address;
const SEPOLIA_AIRDROP_CONTRACT_ADDRESS = '0xAF45F3887044CB57Be15d6C0e92823481E09837b' as Address;
const SEPOLIA_TESTNET_MINING_CONTRACT_ADDRESS = '0xc854A41F5A0956CA09C2704efBb0f266a2Ba48F3' as Address;

// Local (Hardhat)
const LOCAL_TOKEN_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address;
const LOCAL_VESTING_CONTRACT_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as Address;
const LOCAL_AIRDROP_CONTRACT_ADDRESS = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788' as Address;
const LOCAL_TESTNET_MINING_CONTRACT_ADDRESS = '0x68B1D87F95878fE05B998F19b66F4baba5De1aed' as Address;

// Contract Addresses for vesting
export const VESTING_CONTRACT_ADDRESSES: Record<number, Address> = {
  [CHAIN_IDS.SEPOLIA]: SEPOLIA_VESTING_CONTRACT_ADDRESS,
  [CHAIN_IDS.HARDHAT]: LOCAL_VESTING_CONTRACT_ADDRESS,
  [CHAIN_IDS.MAINNET]: ETHEREUM_VESTING_CONTRACT_ADDRESS,
  [CHAIN_IDS.BASE]: BASE_VESTING_CONTRACT_ADDRESS,
}

// Contract Addresses for airdrop
export const AIRDROP_CONTRACT_ADDRESSES: Record<number, Address> = {
  [CHAIN_IDS.SEPOLIA]: SEPOLIA_AIRDROP_CONTRACT_ADDRESS,
  [CHAIN_IDS.HARDHAT]: LOCAL_AIRDROP_CONTRACT_ADDRESS,
  [CHAIN_IDS.BASE]: BASE_AIRDROP_CONTRACT_ADDRESS,
  [CHAIN_IDS.IOTEX]: IOTEX_AIRDROP_CONTRACT_ADDRESS,
}

// Contract Addresses for testnet mining
export const TESTNET_MINING_CONTRACT_ADDRESSES: Record<number, Address> = {
  [CHAIN_IDS.SEPOLIA]: SEPOLIA_TESTNET_MINING_CONTRACT_ADDRESS,
  [CHAIN_IDS.HARDHAT]: LOCAL_TESTNET_MINING_CONTRACT_ADDRESS,
  [CHAIN_IDS.BASE]: BASE_TESTNET_MINING_CONTRACT_ADDRESS,
  [CHAIN_IDS.SKALE]: SKALE_TESTNET_MINING_CONTRACT_ADDRESS,
}

// Contract Addresses for staking
export const STAKING_CONTRACT_ADDRESSES: Record<number, Address> = {
  [CHAIN_IDS.BASE]: BASE_STAKING_CONTRACT_ADDRESS,
  [CHAIN_IDS.IOTEX]: IOTEX_STAKING_CONTRACT_ADDRESS,
  [CHAIN_IDS.SKALE]: SKALE_STAKING_CONTRACT_ADDRESS,
}

// Contract Addresses for storage pool
export const STORAGE_POOL_CONTRACT_ADDRESSES: Record<number, Address> = {
  [CHAIN_IDS.BASE]: BASE_STORAGE_POOL_CONTRACT_ADDRESS,
  [CHAIN_IDS.SKALE]: SKALE_STORAGE_POOL_CONTRACT_ADDRESS,
}

// Contract Addresses for reward engine
export const REWARD_ENGINE_CONTRACT_ADDRESSES: Record<number, Address> = {
  [CHAIN_IDS.BASE]: BASE_REWARD_ENGINE_CONTRACT_ADDRESS,
  [CHAIN_IDS.SKALE]: SKALE_REWARD_ENGINE_CONTRACT_ADDRESS,
}

// Contract Addresses for staking engine linear (VIP Staking)
export const STAKING_ENGINE_LINEAR_CONTRACT_ADDRESSES: Record<number, Address> = {
  [CHAIN_IDS.BASE]: BASE_STAKING_ENGINE_LINEAR_CONTRACT_ADDRESS,
}

// Token Addresses
export const TOKEN_ADDRESSES: Record<number, Address> = {
  [CHAIN_IDS.SEPOLIA]: SEPOLIA_TOKEN_ADDRESS,
  [CHAIN_IDS.HARDHAT]: LOCAL_TOKEN_ADDRESS,
  [CHAIN_IDS.MAINNET]: ETHEREUM_TOKEN_ADDRESS,
  [CHAIN_IDS.BASE]: BASE_TOKEN_ADDRESS,
  [CHAIN_IDS.IOTEX]: IOTEX_TOKEN_ADDRESS,
  [CHAIN_IDS.SKALE]: SKALE_TOKEN_ADDRESS,
}

// Contract ABI
export const CONTRACT_ABI = [
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "capIds",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: 'uint256', name: 'capId', type: 'uint256' }],
    name: 'getWalletsInCap',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'vestingCaps',
    outputs: [
      { internalType: 'uint256', name: 'totalAllocation', type: 'uint256' },
      { internalType: 'bytes32', name: 'name', type: 'bytes32' },
      { internalType: 'uint256', name: 'cliff', type: 'uint256' },
      { internalType: 'uint256', name: 'vestingTerm', type: 'uint256' },
      { internalType: 'uint256', name: 'vestingPlan', type: 'uint256' },
      { internalType: 'uint256', name: 'initialRelease', type: 'uint256' },
      { internalType: 'uint256', name: 'startDate', type: 'uint256' },
      { internalType: 'uint256', name: 'allocatedToWallets', type: 'uint256' },
      { internalType: 'uint256', name: 'maxRewardsPerMonth', type: 'uint256' },
      { internalType: 'uint256', name: 'ratio', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'vestingWallets',
    outputs: [
      { internalType: 'uint256', name: 'capId', type: 'uint256' },
      { internalType: 'bytes32', name: 'name', type: 'bytes32' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'claimed', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'capId', type: 'uint256' },
      { internalType: 'uint256', name: 'chainId', type: 'uint256' },
    ],
    name: 'claimTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'wallet', type: 'address' },
      { internalType: 'uint256', name: 'capId', type: 'uint256' },
    ],
    name: 'calculateDueTokens',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    type: "error",
    name: "TGENotInitiated",
    inputs: []
  },
  {
    type: "error",
    name: "NothingDue",
    inputs: []
  },
  {
    type: "error",
    name: "LowContractBalance",
    inputs: [
      { name: "available", type: "uint256" },
      { name: "required", type: "uint256" }
    ]
  },
  {
    type: "error",
    name: "TransferFailed",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidAllocationParameters",
    inputs: []
  },
  {
    type: "error",
    name: "NothingToClaim",
    inputs: []
  },
  {
    type: "error",
    name: "CliffNotReached",
    inputs: [
      { name: "currentTime", type: "uint256" },
      { name: "startDate", type: "uint256" },
      { name: "cliffEnd", type: "uint256" }
    ]
  },
  {
    type: "error",
    name: "OperationFailed",
    inputs: [
      { name: "status", type: "uint8" }
    ]
  },
  {
    type: "error",
    name: "TGEAlreadyInitiated",
    inputs: []
  },
  {
    type: "error",
    name: "AllocationTooHigh",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "allocated", type: "uint256" },
      { name: "maximum", type: "uint256" },
      { name: "capId", type: "uint256" }
    ]
  },
  {
    type: "error",
    name: "InsufficientContractBalance",
    inputs: [
      { name: "required", type: "uint256" },
      { name: "available", type: "uint256" }
    ]
  },
  {
    type: "error",
    name: "CapExists",
    inputs: [
      { name: "capId", type: "uint256" }
    ]
  },
  {
    type: "error",
    name: "InvalidAllocation",
    inputs: []
  },
  {
    type: "error",
    name: "InitialReleaseTooLarge",
    inputs: []
  },
  {
    type: "error",
    name: "OutOfRangeVestingPlan",
    inputs: []
  },
  {
    type: "error",
    name: "CapHasWallets",
    inputs: []
  },
  {
    type: "error",
    name: "ExceedsMaximumSupply",
    inputs: [
      { name: "amount", type: "uint256" }
    ]
  },
  {
    type: "error",
    name: "StartDateNotSet",
    inputs: [
      { name: "capId", type: "uint256" }
    ]
  },
  {
    type: "error",
    name: "WalletExistsInCap",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "capId", type: "uint256" }
    ]
  },
  {
    type: "error",
    name: "InvalidCapId",
    inputs: [
      { name: "capId", type: "uint256" }
    ]
  },
  {
    type: "error",
    name: "WalletNotInCap",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "capId", type: "uint256" }
    ]
  },
  {
    type: "error",
    name: "NoWalletBalance",
    inputs: []
  },
] as const

export type ContractType = typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES];

interface ContractConfig {
  address: {
    [key in ContractType]: {
      [chainId: number]: `0x${string}`;
    };
  };
  abi: {
    [key in ContractType]: readonly any[];
  };
}

export const CONTRACT_CONFIG: ContractConfig = {
  address: {
    [CONTRACT_TYPES.TOKEN]: TOKEN_ADDRESSES,
    [CONTRACT_TYPES.VESTING]: VESTING_CONTRACT_ADDRESSES,
    [CONTRACT_TYPES.AIRDROP]: AIRDROP_CONTRACT_ADDRESSES,
    [CONTRACT_TYPES.TESTNET_MINING]: TESTNET_MINING_CONTRACT_ADDRESSES,
    [CONTRACT_TYPES.STAKING]: STAKING_CONTRACT_ADDRESSES,
    [CONTRACT_TYPES.STORAGE_POOL]: STORAGE_POOL_CONTRACT_ADDRESSES,
    [CONTRACT_TYPES.REWARD_ENGINE]: REWARD_ENGINE_CONTRACT_ADDRESSES,
    [CONTRACT_TYPES.STAKING_ENGINE_LINEAR]: STAKING_ENGINE_LINEAR_CONTRACT_ADDRESSES,
  },
  abi: {
    [CONTRACT_TYPES.TOKEN]: TOKEN_ABI,
    [CONTRACT_TYPES.VESTING]: DISTRIBUTION_ABI,
    [CONTRACT_TYPES.AIRDROP]: DISTRIBUTION_ABI,
    [CONTRACT_TYPES.TESTNET_MINING]: TESTNET_MINING_ABI,
    [CONTRACT_TYPES.STAKING]: STAKING_ABI,
    [CONTRACT_TYPES.STORAGE_POOL]: STORAGE_POOL_ABI,
    [CONTRACT_TYPES.REWARD_ENGINE]: REWARD_ENGINE_ABI,
    [CONTRACT_TYPES.STAKING_ENGINE_LINEAR]: STAKING_ENGINE_LINEAR_ABI,
  },
};

// Export common types and constants
export { ROLES, PROPOSAL_TYPES };
