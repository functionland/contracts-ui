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
  ListItemText,
  Chip,
  CircularProgress
} from '@mui/material'
import { useContractContext } from '@/contexts/ContractContext'
import { ethers } from 'ethers'
import { CONTRACT_CONFIG } from '@/config/contracts'
import { CONTRACT_TYPES } from '@/config/constants'
import { STAKING_ENGINE_LINEAR_ABI } from '@/config/abis'
import { useConnection, useWalletClient } from 'wagmi'
import { walletClientToSigner } from '@/lib/ethersAdapters'

interface UpgradeProposal {
  implementation: string
  proposer: string
  proposalTime: number
  executionTime: number
}

interface PoolStatus {
  totalPoolBalance: string
  stakedAmount: string
  rewardsAmount: string
}

export const StakingEngineLinearAdmin = () => {
  const { contracts, chainId, address: connectedWalletAddress } = useContractContext()
  const { address: accountAddress, isConnected } = useConnection()
  const { data: walletClient } = useWalletClient()
  
  // Get contract address from config
  const contractAddress = chainId ? 
    CONTRACT_CONFIG.address[CONTRACT_TYPES.STAKING_ENGINE_LINEAR]?.[chainId] : 
    'Not connected to a network'
  
  // State for upgrade section
  const [newImplementation, setNewImplementation] = useState<string>('')
  const [pendingUpgrade, setPendingUpgrade] = useState<UpgradeProposal | null>(null)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [isProposing, setIsProposing] = useState<boolean>(false)
  const [isCancelling, setIsCancelling] = useState<boolean>(false)
  
  // State for pool status
  const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [isPausing, setIsPausing] = useState<boolean>(false)
  const [isUnpausing, setIsUnpausing] = useState<boolean>(false)
  
  // State for add rewards
  const [rewardAmount, setRewardAmount] = useState<string>('')
  const [isAddingRewards, setIsAddingRewards] = useState<boolean>(false)
  
  // State for staking stats
  const [totalStaked, setTotalStaked] = useState<string>('0')
  const [totalStaked365, setTotalStaked365] = useState<string>('0')
  const [totalStaked730, setTotalStaked730] = useState<string>('0')
  const [totalStaked1095, setTotalStaked1095] = useState<string>('0')
  const [requiredRewards, setRequiredRewards] = useState<string>('0')
  const [excessRewards, setExcessRewards] = useState<string>('0')
  
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Create contract instance helper
  const getContract = async () => {
    if (!walletClient || !chainId) return null
    
    const address = CONTRACT_CONFIG.address[CONTRACT_TYPES.STAKING_ENGINE_LINEAR]?.[chainId]
    if (!address) return null
    
    const signer = walletClientToSigner(walletClient)
    return new ethers.Contract(address, STAKING_ENGINE_LINEAR_ABI, signer)
  }

  // Fetch contract data
  useEffect(() => {
    const fetchContractData = async () => {
      if (!chainId) {
        setIsLoading(false)
        return
      }

      const address = CONTRACT_CONFIG.address[CONTRACT_TYPES.STAKING_ENGINE_LINEAR]?.[chainId]
      if (!address) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        
        // Create a read-only provider
        const provider = new ethers.JsonRpcProvider(
          chainId === 8453 ? 'https://base-rpc.publicnode.com' : undefined
        )
        const contract = new ethers.Contract(address, STAKING_ENGINE_LINEAR_ABI, provider)
        
        // Fetch pending upgrade if any
        const pendingImplementation = await contract.pendingImplementation()
        
        if (pendingImplementation && pendingImplementation !== ethers.ZeroAddress) {
          const proposer = await contract.upgradeProposer()
          const proposalTime = await contract.upgradeProposalTime()
          const timelock = await contract.UPGRADE_TIMELOCK()
          
          setPendingUpgrade({
            implementation: pendingImplementation,
            proposer,
            proposalTime: Number(proposalTime),
            executionTime: Number(proposalTime) + Number(timelock)
          })
        } else {
          setPendingUpgrade(null)
        }

        // Fetch pool status
        const [totalPoolBalance, stakedAmount, rewardsAmount] = await contract.getPoolStatus()
        setPoolStatus({
          totalPoolBalance: ethers.formatEther(totalPoolBalance),
          stakedAmount: ethers.formatEther(stakedAmount),
          rewardsAmount: ethers.formatEther(rewardsAmount)
        })

        // Fetch paused state
        const paused = await contract.paused()
        setIsPaused(paused)

        // Fetch staking stats
        const total = await contract.getTotalStaked()
        setTotalStaked(ethers.formatEther(total))

        const staked365 = await contract.totalStaked365Days()
        setTotalStaked365(ethers.formatEther(staked365))

        const staked730 = await contract.totalStaked730Days()
        setTotalStaked730(ethers.formatEther(staked730))

        const staked1095 = await contract.totalStaked1095Days()
        setTotalStaked1095(ethers.formatEther(staked1095))

        const required = await contract.calculateRequiredRewards()
        setRequiredRewards(ethers.formatEther(required))

        const excess = await contract.getExcessRewards()
        setExcessRewards(ethers.formatEther(excess))

      } catch (err) {
        console.error('Error fetching contract data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContractData()
  }, [chainId])

  // Handle propose upgrade
  const handleProposeUpgrade = async () => {
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
      
      const contract = await getContract()
      if (!contract) {
        throw new Error('Failed to create contract instance')
      }
      
      const tx = await contract.proposeUpgrade(newImplementation)
      console.log('Transaction submitted:', tx.hash)
      
      setSuccess(`Transaction submitted! Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`)
      
      await tx.wait()
      
      setSuccess('Upgrade proposal submitted successfully')
      setNewImplementation('')
      
      // Refetch contract data
      const pendingImplementation = await contract.pendingImplementation()
      const proposer = await contract.upgradeProposer()
      const proposalTime = await contract.upgradeProposalTime()
      const timelock = await contract.UPGRADE_TIMELOCK()
      
      setPendingUpgrade({
        implementation: pendingImplementation,
        proposer,
        proposalTime: Number(proposalTime),
        executionTime: Number(proposalTime) + Number(timelock)
      })
    } catch (err: any) {
      console.error('Error proposing upgrade:', err)
      setError(err.message || 'Failed to propose upgrade')
    } finally {
      setIsProposing(false)
    }
  }

  // Handle cancel upgrade
  const handleCancelUpgrade = async () => {
    if (!pendingUpgrade) {
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

      const contract = await getContract()
      if (!contract) {
        throw new Error('Failed to create contract instance')
      }

      const tx = await contract.cancelUpgrade()
      console.log('Transaction submitted for cancel:', tx.hash)
      setSuccess(`Cancel transaction submitted! Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`)
      
      await tx.wait()
      setSuccess('Upgrade proposal cancelled successfully')
      setPendingUpgrade(null)

    } catch (err: any) {
      console.error('Error cancelling upgrade:', err)
      setError(err.message || 'Failed to cancel upgrade')
    } finally {
      setIsCancelling(false)
    }
  }

  // Handle pause
  const handlePause = async () => {
    if (!isConnected || !walletClient) {
      setError('Please connect your wallet')
      return
    }

    try {
      setError('')
      setSuccess('')
      setIsPausing(true)

      const contract = await getContract()
      if (!contract) {
        throw new Error('Failed to create contract instance')
      }

      const tx = await contract.emergencyPauseRewardDistribution()
      console.log('Pause transaction submitted:', tx.hash)
      setSuccess(`Pause transaction submitted! Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`)
      
      await tx.wait()
      setSuccess('Reward distribution paused successfully')
      setIsPaused(true)

    } catch (err: any) {
      console.error('Error pausing:', err)
      setError(err.message || 'Failed to pause')
    } finally {
      setIsPausing(false)
    }
  }

  // Handle unpause
  const handleUnpause = async () => {
    if (!isConnected || !walletClient) {
      setError('Please connect your wallet')
      return
    }

    try {
      setError('')
      setSuccess('')
      setIsUnpausing(true)

      const contract = await getContract()
      if (!contract) {
        throw new Error('Failed to create contract instance')
      }

      const tx = await contract.emergencyUnpauseRewardDistribution()
      console.log('Unpause transaction submitted:', tx.hash)
      setSuccess(`Unpause transaction submitted! Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`)
      
      await tx.wait()
      setSuccess('Reward distribution unpaused successfully')
      setIsPaused(false)

    } catch (err: any) {
      console.error('Error unpausing:', err)
      setError(err.message || 'Failed to unpause')
    } finally {
      setIsUnpausing(false)
    }
  }

  // Handle add rewards
  const handleAddRewards = async () => {
    if (!rewardAmount || parseFloat(rewardAmount) <= 0) {
      setError('Please enter a valid reward amount')
      return
    }
    if (!isConnected || !walletClient) {
      setError('Please connect your wallet')
      return
    }

    try {
      setError('')
      setSuccess('')
      setIsAddingRewards(true)

      const contract = await getContract()
      if (!contract) {
        throw new Error('Failed to create contract instance')
      }

      const amount = ethers.parseEther(rewardAmount)
      const tx = await contract.addRewardsToPool(amount)
      console.log('Add rewards transaction submitted:', tx.hash)
      setSuccess(`Add rewards transaction submitted! Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`)
      
      await tx.wait()
      setSuccess('Rewards added to pool successfully')
      setRewardAmount('')

      // Refresh pool status
      const [totalPoolBalance, stakedAmount, rewardsAmount] = await contract.getPoolStatus()
      setPoolStatus({
        totalPoolBalance: ethers.formatEther(totalPoolBalance),
        stakedAmount: ethers.formatEther(stakedAmount),
        rewardsAmount: ethers.formatEther(rewardsAmount)
      })

    } catch (err: any) {
      console.error('Error adding rewards:', err)
      setError(err.message || 'Failed to add rewards')
    } finally {
      setIsAddingRewards(false)
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        VIP Staking Administration (Staking Engine Linear)
      </Typography>
      
      {/* Contract Info */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Network ID:</strong> {chainId || 'Not connected'}
        </Typography>
        <Typography variant="body2">
          <strong>Contract Address:</strong> {contractAddress}
        </Typography>
        <Typography variant="body2">
          <strong>Status:</strong>{' '}
          <Chip 
            label={isPaused ? 'PAUSED' : 'ACTIVE'} 
            color={isPaused ? 'error' : 'success'} 
            size="small" 
          />
        </Typography>
      </Alert>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Pool Status */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Pool Status</Typography>
          <Grid container spacing={2}>
            <Grid size={4}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Total Pool Balance</Typography>
                <Typography variant="h6">{parseFloat(poolStatus?.totalPoolBalance || '0').toLocaleString()} FULA</Typography>
              </Paper>
            </Grid>
            <Grid size={4}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Staked Amount</Typography>
                <Typography variant="h6">{parseFloat(poolStatus?.stakedAmount || '0').toLocaleString()} FULA</Typography>
              </Paper>
            </Grid>
            <Grid size={4}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Rewards Amount</Typography>
                <Typography variant="h6">{parseFloat(poolStatus?.rewardsAmount || '0').toLocaleString()} FULA</Typography>
              </Paper>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>Staking by Lock Period</Typography>
          <Grid container spacing={2}>
            <Grid size={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Total Staked</Typography>
                <Typography variant="h6">{parseFloat(totalStaked).toLocaleString()}</Typography>
              </Paper>
            </Grid>
            <Grid size={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">365 Days (15% APY)</Typography>
                <Typography variant="h6">{parseFloat(totalStaked365).toLocaleString()}</Typography>
              </Paper>
            </Grid>
            <Grid size={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">730 Days (18% APY)</Typography>
                <Typography variant="h6">{parseFloat(totalStaked730).toLocaleString()}</Typography>
              </Paper>
            </Grid>
            <Grid size={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">1095 Days (24% APY)</Typography>
                <Typography variant="h6">{parseFloat(totalStaked1095).toLocaleString()}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid size={6}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Required Rewards</Typography>
                <Typography variant="h6">{parseFloat(requiredRewards).toLocaleString()} FULA</Typography>
              </Paper>
            </Grid>
            <Grid size={6}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Excess Rewards</Typography>
                <Typography variant="h6" color={parseFloat(excessRewards) > 0 ? 'success.main' : 'warning.main'}>
                  {parseFloat(excessRewards).toLocaleString()} FULA
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Emergency Controls</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={handlePause}
              disabled={isPaused || isPausing}
            >
              {isPausing ? 'Pausing...' : 'Pause Reward Distribution'}
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleUnpause}
              disabled={!isPaused || isUnpausing}
            >
              {isUnpausing ? 'Unpausing...' : 'Unpause Reward Distribution'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Add Rewards */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Add Rewards to Pool</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add FULA tokens to the reward pool. Make sure you have approved the contract to spend your tokens first.
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid size={8}>
              <TextField
                fullWidth
                label="Reward Amount (FULA)"
                variant="outlined"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                placeholder="0.0"
                type="number"
              />
            </Grid>
            <Grid size={4}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddRewards}
                disabled={!rewardAmount || isAddingRewards}
                fullWidth
              >
                {isAddingRewards ? 'Adding...' : 'Add Rewards'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Contract Upgrade */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Contract Upgrade</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Propose an upgrade to a new implementation. The upgrade requires a 2-day timelock before it can be executed by the owner.
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
                    primary="Execution Time (after timelock)" 
                    secondary={new Date(pendingUpgrade.executionTime * 1000).toLocaleString()} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Status" 
                    secondary={
                      Date.now() < pendingUpgrade.executionTime * 1000 
                        ? `Timelock active - ${Math.ceil((pendingUpgrade.executionTime * 1000 - Date.now()) / (1000 * 60 * 60))} hours remaining`
                        : 'Ready for execution by owner'
                    } 
                  />
                </ListItem>
              </List>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  color="error"
                  onClick={handleCancelUpgrade}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Upgrade'}
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Note: The owner executes the upgrade via upgradeToAndCall after the timelock expires.
              </Typography>
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No pending upgrade proposals
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Contract Info */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Contract Information</Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="Implementation Address" 
                secondary="0x2a8456fC608096E6375a37D201b4C26541a3860D" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Proxy Address" 
                secondary="0xb2064743e3da40bB4C18e80620A02a38e87fB145" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Token Address" 
                secondary="0x9e12735d77c72c5C3670636D428f2F3815d8A4cB" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Stake Pool" 
                secondary="0x03b1d607792253171fAb3F60d1765925ec7a3000" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Reward Pool" 
                secondary="0x92c7D86f573B7C0071EC8f9E5252799c5c2c0545" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Initial Owner" 
                secondary="0x383a6A34C623C02dcf9BB7069FAE4482967fb713" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Initial Admin" 
                secondary="0xFa8b02596a84F3b81B4144eA2F30482f8C33D446" 
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  )
}
