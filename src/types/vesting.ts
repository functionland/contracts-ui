import { type Address } from 'viem'

export interface VestingData {
  capId: number
  name: string
  totalAllocation: bigint
  claimed: bigint
  claimable: bigint
  initialRelease: number
  cliff: number
  vestingTerm: number
  vestingPlan: number
  startDate: number
  errorMessage?: string
  ratio?: bigint
  allocatedToWallets?: bigint
  maxRewardsPerMonth?: bigint
  substrateRewards?: {
    lastUpdate: bigint
    amount: bigint
  }
  walletInfo?: VestingWalletInfo
}

export interface VestingCap {
  totalAllocation: bigint
  name: string | Uint8Array
  cliff: bigint
  vestingTerm: bigint
  vestingPlan: bigint
  initialRelease: bigint
  startDate: bigint
  allocatedToWallets: bigint
  wallets: Address[]
  maxRewardsPerMonth?: bigint
  ratio?: bigint
}

export interface VestingWalletInfo {
  capId: bigint
  name: string | Uint8Array
  amount: bigint
  claimed: bigint
  claimableAmount?: bigint
  errorMessage?: string
  monthlyClaimedRewards?: bigint
  lastClaimMonth?: bigint
}

export type VestingStatus = 'Locked' | 'Available' | 'Claimed'

export interface VestingScheduleItem {
  date: Date
  amount: bigint
  cumulative: bigint
  status: VestingStatus
  percentage: number
}
