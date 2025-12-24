import { useConnection, useBalance, useChainId } from 'wagmi'
import { useState, useEffect } from 'react'

export function useWalletInfo() {
  const { address, isConnected } = useConnection()
  const chainId = useChainId()
  const [ensName, setEnsName] = useState<string | null>(null)

  const { data: balance } = useBalance({
    address,
    query: {
      enabled: !!address
    }
  })

  // Fetch ENS name if on mainnet
  useEffect(() => {
    const fetchEnsName = async () => {
      if (address && chainId === 1) {
        try {
          const response = await fetch(`https://api.ensideas.com/ens/resolve/${address}`)
          const data = await response.json()
          setEnsName(data.name || null)
        } catch (error) {
          console.error('Failed to fetch ENS name:', error)
          setEnsName(null)
        }
      }
    }

    fetchEnsName()
  }, [address, chainId])

  return {
    address,
    ensName,
    balance: balance?.value || 0n,
    chainId,
    isConnected,
    isSupported: true, // Removed chain?.unsupported check as useChainId returns a number
  }
}
