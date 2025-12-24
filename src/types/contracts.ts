import { Address } from 'viem'
import { CONTRACT_ABI } from '@/config/contracts'

export type ContractAbi = typeof CONTRACT_ABI

export interface ContractConfig {
  address: Address
  abi: ContractAbi
}

export interface TransactionResponse {
  hash: string
  wait: () => Promise<TransactionReceipt>
}

export interface TransactionReceipt {
  status: number
  transactionHash: string
  blockNumber: number
  gasUsed: bigint
}

export interface ContractError extends Error {
  code: string
  reason?: string
  transaction?: {
    hash: string
    from: string
    to: string
    data: string
  }
}

export type ContractEventName = 
  | 'TokensClaimed'
  | 'ClaimProcessed'
  | 'DistributionWalletAdded'
  | 'DistributionWalletRemoved'
