

import { useState, useEffect } from 'react'
import { Button, CircularProgress, Snackbar, Alert } from '@mui/material'
import { useVestingContract } from '@/hooks/useVestingContract'
import { formatEther } from 'viem'
import { useWaitForTransactionReceipt } from 'wagmi'
import type { FC } from 'react'
import { isContractError } from '../../utils/errors';
import { useContractContext } from '@/contexts/ContractContext';

interface ClaimButtonProps {
  readonly capId: number
  readonly claimableAmount: bigint
}

export const ClaimButton: FC<ClaimButtonProps> = ({ 
  capId,
  claimableAmount,
}) => {
  const [isWalletLoading, setIsWalletLoading] = useState(false)
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | undefined>()
  const [error, setError] = useState<string | null>(null)
  const { claimTokens, substrateWallet } = useVestingContract()
  const { activeContract } = useContractContext()
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError, isLoadingError, isPending } = useWaitForTransactionReceipt({
    hash: transactionHash,
  })

  useEffect(() => {
    console.log('isConfirmed:', isConfirmed, 'isConfirming:', isConfirming, 'isError:', isError, 'isLoadingError:', isLoadingError, 'isPending:', isPending)
    if (isConfirmed) {
      setIsWalletLoading(false)
      setTransactionHash(undefined)
      claimableAmount = 0n
      // Additional success handling
    }
  }, [isConfirmed, isConfirming, isError, isLoadingError, isPending])

  // Parse contract errors into user-friendly messages
  const parseContractError = (error: any): string => {
    // Check if the error is a ContractFunctionExecutionError with a decoded error
    if (error.message && error.message.includes('CliffNotReached')) {
      // Extract the parameters from the error message
      const regex = /CliffNotReached\(uint256 currentTime, uint256 startDate, uint256 cliffEnd\)\s*\((\d+), (\d+), (\d+)\)/;
      const match = error.message.match(regex);
      
      if (match) {
        const [_, currentTime, startDate, cliffEnd] = match.map(Number);
        const remainingTime = cliffEnd - currentTime;
        const daysRemaining = Math.ceil(remainingTime / (24 * 60 * 60));
        
        return `Cliff period not reached. ${daysRemaining > 0 ? `${daysRemaining} days remaining until tokens can be claimed.` : 'The cliff date is set but tokens are not yet claimable.'}`;
      }
    }
    
    // Extract error name and parameters for other errors
    const errorMatch = error.message?.match(/Error: ([a-zA-Z]+)\((.*?)\)\s*\((.*?)\)/);
    if (errorMatch) {
      const [_, errorName, paramTypes, values] = errorMatch;
      const valueArray = values.split(',').map(v => v.trim());
  
      switch (errorName) {
        case 'NothingToClaim':
          return 'No tokens available to claim at this time.';
        
        case 'NoWalletBalance':
          return 'You need to have tokens in your wallet to claim rewards.';
        
        case 'InvalidAllocationParameters':
          return 'Invalid allocation parameters. Please contact support.';
          
        case 'WalletNotInCap':
          return 'Your wallet is not associated with this vesting cap.';
          
        case 'InvalidCapId':
          return 'Invalid vesting cap ID.';
        
        default:
          return `${errorName}: ${valueArray.join(', ')}`;
      }
    }
  
    // Handle wallet errors
    if (error.code === -32603) {
      return 'Transaction failed. Please check your wallet has enough funds for gas fees.';
    }
    
    // Default error message
    return error instanceof Error ? error.message : String(error);
  };

  const handleClaim = async () => {
    try {
      setIsWalletLoading(true)
      setError(null)
      
      const hash = await claimTokens(capId)
      if (hash) {
        setTransactionHash(hash)
      }
    } catch (err) {
      console.error('Claim error:', err)
      setError(parseContractError(err))
    } finally {
      setIsWalletLoading(false)
    }
  }
  
  

  const isDisabled = claimableAmount <= 0n || isWalletLoading || isConfirming

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        disabled={isDisabled}
        onClick={handleClaim}
        startIcon={(isWalletLoading || isConfirming) && <CircularProgress size={20} color="inherit" />}
      >
        {isWalletLoading
          ? 'Confirm in Wallet...'
          : isConfirming
          ? 'Transaction Pending...'
          : isConfirmed
          ? 'Transaction Confirmed'
          : `Claim ${formatEther(claimableAmount)} Tokens`}
      </Button>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!transactionHash && isConfirming} 
        autoHideDuration={null}
      >
        <Alert severity="info">
          Transaction pending... 
        </Alert>
      </Snackbar>
    </>
  )
}
