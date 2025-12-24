

import { useState, useEffect } from 'react'
import { useVestingContract } from '@/hooks/useVestingContract'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Alert, Typography, Box, TextField, Button } from '@mui/material'
import { VestingInfo } from './VestingInfo'
import ClientOnly from '@/components/common/ClientOnly'
import { useContractContext } from '@/contexts/ContractContext'
import { CONTRACT_TYPES } from '@/config/constants'

export function VestingDashboard() {
  const { activeContract } = useContractContext()
  const [inputWallet, setInputWallet] = useState('')
  const [hasSubmittedWallet, setHasSubmittedWallet] = useState(false)
  const [walletError, setWalletError] = useState('')
  const { vestingData, isLoading, error, loadTestnetData } = useVestingContract()

  const getTitle = () => {
    return activeContract === CONTRACT_TYPES.VESTING 
      ? "Token Vesting Allocations"
      : activeContract === CONTRACT_TYPES.TESTNET_MINING
        ? "Testnet Mining Allocations"
        : "Airdrop Vesting Allocations"
  }

  const validateSubstrateWallet = (address: string): boolean => {
    // Substrate addresses are 48 characters long and start with a specific format
    const substrateAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/
    return substrateAddressRegex.test(address)
  }

  const handleSubmitWallet = () => {
    setWalletError('')
  
    if (!inputWallet) {
      setWalletError('Please enter a wallet address')
      return
    }
  
    if (!validateSubstrateWallet(inputWallet)) {
      setWalletError('Please enter a valid Substrate wallet address')
      return
    }

    setHasSubmittedWallet(true)
    loadTestnetData(inputWallet)
  }

  // Show substrate wallet input for testnet mining tab
  if (activeContract === CONTRACT_TYPES.TESTNET_MINING && !hasSubmittedWallet) {
    return (
      <ClientOnly>
        <Typography variant="h5" gutterBottom>
          {getTitle()}
        </Typography>
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Please enter your substrate wallet address to view your testnet mining allocations
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Substrate Wallet Address"
              value={inputWallet}
              onChange={(e) => {
                setInputWallet(e.target.value)
                setWalletError('')
              }}
              placeholder="Enter your substrate wallet address"
              error={!!walletError}
              helperText={walletError}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmitWallet()
                }
              }}
            />
            <Button
              variant="contained"
              onClick={handleSubmitWallet}
              disabled={!inputWallet}
              fullWidth
            >
              View Allocations
            </Button>
          </Box>
        </Box>
      </ClientOnly>
    )
  }

  return (
    <ClientOnly>
      <Typography variant="h5" gutterBottom>
        {getTitle()}
      </Typography>
      <div className="space-y-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <Alert severity="error" className="mb-4">
            Error loading vesting data: {error.message}
          </Alert>
        ) : vestingData.size === 0 ? (
          <Alert severity="info" className="mb-4">
            No vesting allocations found for your wallet
          </Alert>
        ) : (
          Array.from(vestingData.values()).map((data) => (
            <VestingInfo 
              key={data.capId} 
              vestingData={data}
            />
          ))
        )}
      </div>
    </ClientOnly>
  )
}
