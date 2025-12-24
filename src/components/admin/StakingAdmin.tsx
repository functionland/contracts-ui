

import { useState, useEffect } from 'react'
import { 
  Typography, 
  Box, 
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText
} from '@mui/material'
import { useContractContext } from '@/contexts/ContractContext'
import { ethers } from 'ethers'
import { CONTRACT_CONFIG } from '@/config/contracts'
import { CONTRACT_TYPES } from '@/config/constants'
import { STAKING_ABI } from '@/config/abis'
import { useConnection, useWalletClient } from 'wagmi'
import { walletClientToSigner } from '@/lib/ethersAdapters'

interface UpgradeProposal {
  implementation: string
  proposer: string
  proposalTime: number
  executionTime: number
}

export const StakingAdmin = () => {
  const { contracts, chainId, address: connectedWalletAddress } = useContractContext()
  const { address: accountAddress, isConnected } = useConnection()
  const { data: walletClient } = useWalletClient()
  
  // Get contract address from config for debugging
  const stakingContractAddress = chainId ? 
    CONTRACT_CONFIG.address[CONTRACT_TYPES.STAKING]?.[chainId] : 
    'Not connected to a network'
  
  // State for staking configuration
  const [rewardRate, setRewardRate] = useState<string>('')
  const [lockPeriod, setLockPeriod] = useState<string>('')
  
  // State for upgrade section
  const [newImplementation, setNewImplementation] = useState<string>('')
  const [pendingUpgrade, setPendingUpgrade] = useState<UpgradeProposal | null>(null)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [isProposing, setIsProposing] = useState<boolean>(false)
  const [isApproving, setIsApproving] = useState<boolean>(false)
  const [isCancelling, setIsCancelling] = useState<boolean>(false)
  
  // Statistics
  const [totalStaked, setTotalStaked] = useState<string>('0')
  const [totalRewards, setTotalRewards] = useState<string>('0')
  const [activeStakers, setActiveStakers] = useState<number>(0)

  // Fetch contract data
  useEffect(() => {
    const fetchContractData = async () => {
      if (!contracts?.staking) return

      try {
        
        // Fetch pending upgrade if any
        const pendingImplementation = await contracts.staking.pendingImplementation()
        
        if (pendingImplementation && pendingImplementation !== ethers.ZeroAddress) {
          const proposer = await contracts.staking.upgradeProposer()
          const proposalTime = await contracts.staking.upgradeProposalTime()
          const timelock = await contracts.staking.UPGRADE_TIMELOCK()
          
          setPendingUpgrade({
            implementation: pendingImplementation,
            proposer,
            proposalTime: Number(proposalTime),
            executionTime: Number(proposalTime) + Number(timelock)
          })
        } else {
          setPendingUpgrade(null)
        }
      } catch (err) {
        console.error('Error fetching contract data:', err)
      }
    }

    fetchContractData()
  }, [contracts?.staking, chainId])

  // Handle propose upgrade
  const handleProposeUpgrade = async () => {
    if (!contracts?.staking) {
      setError('Staking contract not available')
      return
    }
    if (!ethers.isAddress(newImplementation)) {
      setError('Invalid implementation address')
      return
    }
    if (!isConnected || !accountAddress || !walletClient) {
      setError('Please connect your wallet')
      return
    }

    try {
      setError('')
      setSuccess('')
      setIsProposing(true)
      
      console.log('Proposing upgrade to:', newImplementation)
      
      const signer = walletClientToSigner(walletClient)
      const stakingAddress = CONTRACT_CONFIG.address[CONTRACT_TYPES.STAKING]?.[chainId!];
      
      if (!stakingAddress) {
        throw new Error(`No staking contract address found for chain ${chainId}`);
      }
      
      const stakingContract = new ethers.Contract(
        stakingAddress,
        STAKING_ABI,
        signer
      );
      
      const tx = await stakingContract.proposeUpgrade(newImplementation);
      console.log('Transaction submitted:', tx.hash);
      
      // Show transaction hash in UI
      setSuccess(`Transaction submitted! Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      setSuccess('Upgrade proposal submitted successfully');
      setNewImplementation('');
      
      // Refetch contract data
      const pendingImplementation = await contracts.staking.pendingImplementation();
      const proposer = await contracts.staking.upgradeProposer();
      const proposalTime = await contracts.staking.upgradeProposalTime();
      const timelock = await contracts.staking.UPGRADE_TIMELOCK();
      
      setPendingUpgrade({
        implementation: pendingImplementation,
        proposer,
        proposalTime: Number(proposalTime),
        executionTime: Number(proposalTime) + Number(timelock)
      });
    } catch (err: any) {
      console.error('Error proposing upgrade:', err);
      setError(err.message || 'Failed to propose upgrade');
    } finally {
      setIsProposing(false);
    }
  }

  // Handle approve upgrade
  const handleApproveUpgrade = async () => {
    if (!contracts?.staking || !pendingUpgrade) {
      setError('No pending upgrade found')
      return
    }
    if (!isConnected || !accountAddress || !walletClient) {
      setError('Please connect your wallet')
      return
    }

    try {
      setError('')
      setSuccess('')
      setIsApproving(true)
      
      console.log('Approving upgrade to:', pendingUpgrade.implementation)
      
      const signer = walletClientToSigner(walletClient)
      const stakingAddress = CONTRACT_CONFIG.address[CONTRACT_TYPES.STAKING]?.[chainId!];
      
      if (!stakingAddress) {
        throw new Error(`No staking contract address found for chain ${chainId}`);
      }
      
      const stakingContract = new ethers.Contract(
        stakingAddress,
        STAKING_ABI,
        signer
      );
      
      // Important: Pass the implementation address to approveUpgrade
      // The contract validates this matches the pendingImplementation
      const tx = await stakingContract.approveUpgrade(pendingUpgrade.implementation);
      console.log('Transaction submitted:', tx.hash);
      
      // Show transaction hash in UI
      setSuccess(`Transaction submitted! Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      setSuccess('Upgrade approved and executed successfully');
      setPendingUpgrade(null);
      
      // Refetch contract data to verify the upgrade completed
      const pendingImplementation = await contracts.staking.pendingImplementation();
      if (pendingImplementation === ethers.ZeroAddress) {
        setPendingUpgrade(null);
      }
    } catch (err: any) {
      console.error('Error approving upgrade:', err);
      setError(err.message || 'Failed to approve upgrade');
    } finally {
      setIsApproving(false);
    }
  }

  // Handle cancel upgrade
  const handleCancelUpgrade = async () => {
    if (!contracts?.staking || !pendingUpgrade) {
      setError('No pending upgrade to cancel')
      return
    }
    if (!isConnected || !accountAddress || !walletClient) {
      setError('Please connect your wallet')
      return
    }

    try {
      setError('')
      setSuccess('')
      setIsCancelling(true)

      console.log('Cancelling upgrade proposal for:', pendingUpgrade.implementation)

      const signer = walletClientToSigner(walletClient)
      const stakingAddress = CONTRACT_CONFIG.address[CONTRACT_TYPES.STAKING]?.[chainId!];

      if (!stakingAddress) {
        throw new Error(`No staking contract address found for chain ${chainId}`);
      }

      const stakingContract = new ethers.Contract(
        stakingAddress,
        STAKING_ABI,
        signer
      );

      const tx = await stakingContract.cancelUpgrade();
      console.log('Transaction submitted for cancel:', tx.hash);
      setSuccess(`Cancel transaction submitted! Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`);
      
      await tx.wait();
      console.log('Cancel transaction confirmed');
      setSuccess('Upgrade proposal cancelled successfully');
      setPendingUpgrade(null); // Clear pending upgrade state

    } catch (err: any) {
      console.error('Error cancelling upgrade:', err);
      setError(err.message || 'Failed to cancel upgrade');
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>Staking Administration</Typography>
      
      {/* Debug information */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Network ID:</strong> {chainId || 'Not connected'}
        </Typography>
        <Typography variant="body2">
          <strong>Staking Contract Address:</strong> {stakingContractAddress}
        </Typography>
        <Typography variant="body2">
          <strong>Staking Contract Available:</strong> {contracts?.staking ? 'Yes' : 'No'}
        </Typography>
      </Alert>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Contract Upgrade
          </Typography>
          <Grid container spacing={3}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="New Implementation Address"
                variant="outlined"
                value={newImplementation}
                onChange={(e) => setNewImplementation(e.target.value)}
                placeholder="0x..."
              />
            </Grid>
            <Grid size={12}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleProposeUpgrade}
                disabled={!newImplementation || isProposing}
              >
                {isProposing ? 'Proposing...' : 'Propose Upgrade'}
              </Button>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Pending Upgrade Proposals
          </Typography>
          
          {pendingUpgrade ? (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Implementation Address" 
                    secondary={pendingUpgrade.implementation} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Proposer" 
                    secondary={pendingUpgrade.proposer} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Proposal Time" 
                    secondary={new Date(pendingUpgrade.proposalTime * 1000).toLocaleString()} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Execution Time" 
                    secondary={new Date(pendingUpgrade.executionTime * 1000).toLocaleString()} 
                  />
                </ListItem>
              </List>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="success"
                  onClick={handleApproveUpgrade}
                  disabled={Date.now() < pendingUpgrade.executionTime * 1000 || isApproving}
                >
                  {isApproving ? 'Approving...' : 'Execute Upgrade'}
                </Button>
                <Button 
                  variant="outlined" 
                  color="error"
                  onClick={handleCancelUpgrade}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Upgrade'}
                </Button>
              </Box>
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No pending upgrade proposals
            </Typography>
          )}
        </CardContent>
      </Card>
      
    </Box>
  )
} 
