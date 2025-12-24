import { ContractError } from '@/types/contracts'
import { ERROR_MESSAGES } from '@/config/constants'

export class VestingError extends Error {
  code: string
  reason?: string

  constructor(message: string, code: string, reason?: string) {
    super(message)
    this.name = 'VestingError'
    this.code = code
    this.reason = reason
  }
}

export function handleContractError(error: ContractError): VestingError {
  // Common error codes
  const errorMap: Record<string, string> = {
    'INSUFFICIENT_BALANCE': ERROR_MESSAGES.INSUFFICIENT_BALANCE,
    'CLIFF_NOT_REACHED': ERROR_MESSAGES.CLIFF_NOT_REACHED,
    'ACTION_REJECTED': 'Transaction was rejected by user',
    'NETWORK_ERROR': 'Network connection error',
    'UNPREDICTABLE_GAS_LIMIT': 'Failed to estimate gas',
  }

  const message = errorMap[error.code] || error.reason || 'Transaction failed'
  return new VestingError(message, error.code, error.reason)
}

export function isContractError(error: unknown): error is ContractError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as ContractError).code === 'string'
  )
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isContractError(error)) {
      throw handleContractError(error)
    }
    throw new VestingError(
      `Failed to ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'OPERATION_FAILED'
    )
  }
}
