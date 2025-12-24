import { useReadContract } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatUnits, type Address } from 'viem'
import { TOKEN_ABI } from '@/config/abis'

interface TokenBalance {
  balance: bigint
  formattedBalance: string
  symbol: string
  decimals: number
  isLoading: boolean
  error: Error | null
}

export function useTokenBalance(
  tokenAddress: Address,
  walletAddress?: Address,
  decimals: number = 18
) {
  const [tokenInfo, setTokenInfo] = useState<TokenBalance>({
    balance: 0n,
    formattedBalance: '0',
    symbol: '',
    decimals,
    isLoading: true,
    error: null,
  })

  // Get token balance
  const { data: balance, error: balanceError } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [walletAddress as `0x${string}`],
    query: {
      enabled: Boolean(walletAddress && tokenAddress),
    },
  })

  // Get token symbol
  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'symbol',
    query: {
      enabled: Boolean(tokenAddress),
    },
  })

  useEffect(() => {
    const updateTokenInfo = () => {
      try {
        const rawBalance = balance as bigint || 0n
        const formattedBalance = formatUnits(rawBalance, decimals)

        setTokenInfo({
          balance: rawBalance,
          formattedBalance,
          symbol: (symbol as string) || '',
          decimals,
          isLoading: false,
          error: balanceError ? new Error(balanceError.message) : null,
        })
      } catch (error) {
        setTokenInfo(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        }))
      }
    }

    updateTokenInfo()
  }, [balance, symbol, decimals, balanceError])

  return tokenInfo
}
