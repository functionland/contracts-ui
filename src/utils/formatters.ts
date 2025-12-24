import { formatUnits } from 'viem'
import { UI_CONSTANTS } from '@/config/constants'

export function formatToken(
  amount: bigint,
  decimals: number = 18,
  maxDecimals: number = UI_CONSTANTS.MAX_DECIMALS_DISPLAY
): string {
  const formatted = formatUnits(amount, decimals)
  const [whole, fraction] = formatted.split('.')
  
  if (!fraction) return whole
  
  return `${whole}.${fraction.slice(0, maxDecimals)}`
}

export function formatPercentage(
  value: number,
  maxDecimals: number = 2
): string {
  return `${Number(value.toFixed(maxDecimals))}%`
}

export function formatDate(
  timestamp: number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  return new Date(timestamp).toLocaleDateString(undefined, options)
}

export function formatAddress(
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address) return ''
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (years > 0) {
    return `${years}y ${months % 12}m`
  }
  if (months > 0) {
    return `${months}m ${days % 30}d`
  }
  return `${days}d`
}
