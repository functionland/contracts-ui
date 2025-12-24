

import { useState, useEffect } from 'react'
import { useConnection, useWriteContract, usePublicClient } from 'wagmi'
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,


} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { ethers } from 'ethers'
import { ConnectButton } from '@/components/common/ConnectButton'
import { useAdminContract } from '@/hooks/useAdminContract'
import { useStoragePoolData, peerIdToBytes32 } from '@/hooks/useStoragePoolData'
import { STORAGE_POOL_ABI } from '@/config/abis'
import { STORAGE_POOL_CONTRACT_ADDRESSES } from '@/config/contracts'
import { useChainId } from 'wagmi'
import { useContractContext } from '@/contexts/ContractContext'
import { CONTRACT_TYPES } from '@/config/constants'



// Contract Diagnostics Component
function ContractDiagnostics({ contractAddress }: { contractAddress: string }) {
  const { address } = useConnection()
  const publicClient = usePublicClient()
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    if (!contractAddress || !publicClient || !address) return

    setLoading(true)
    const results: any = {}

    try {
      // Check if contract exists
      const code = await publicClient.getBytecode({ address: contractAddress as `0x${string}` })
      results.contractExists = !!code && code !== '0x'

      // Try to read create pool lock amount
      try {
        const lockAmount = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: STORAGE_POOL_ABI,
          functionName: 'createPoolLockAmount'
        } as any)
        results.createPoolLockAmount = lockAmount?.toString()
      } catch (err) {
        results.lockAmountError = (err as Error).message
      }

      // Try to read storage token address
      try {
        const storageToken = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: STORAGE_POOL_ABI,
          functionName: 'storageToken'
        } as any)
        results.storageToken = storageToken
      } catch (err) {
        results.storageTokenError = (err as Error).message
      }

      // Check if user has admin role (from governance)
      try {
        const hasAdminRole = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: STORAGE_POOL_ABI,
          functionName: 'hasRole',
          args: [ethers.ZeroHash, address] // DEFAULT_ADMIN_ROLE
        } as any)
        results.hasAdminRole = hasAdminRole
      } catch (err) {
        results.adminRoleError = (err as Error).message
      }

    } catch (err) {
      results.generalError = (err as Error).message
    }

    setDiagnostics(results)
    setLoading(false)
  }

  return (
    <Box>
      <Button variant="outlined" onClick={runDiagnostics} disabled={loading}>
        {loading ? <CircularProgress size={20} /> : 'Run Diagnostics'}
      </Button>

      {diagnostics && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Diagnostic Results:</Typography>
          <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </Box>
      )}
    </Box>
  )
}

export function StoragePoolAdmin() {
  const { isConnected, address } = useConnection()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { setActiveContract } = useContractContext()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedPool, setSelectedPool] = useState<number | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedJoinRequests, setSelectedJoinRequests] = useState<string[]>([])
  const [fetchedMembers, setFetchedMembers] = useState<Array<{
    address: string
    memberIndex: number
    totalPeerIds: number
    peerIds: Array<{
      peerId: string
      peerIdBytes32: string
      lockedTokens: string
    }>
  }>>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [membersPage, setMembersPage] = useState(0)
  const [membersPerPage] = useState(20) // Show 20 members per page
  const [totalMembers, setTotalMembers] = useState(0)
  const [dialogOpen, setDialogOpen] = useState<{
    type: 'members' | 'joinRequests' | 'addMember' | 'emergencyWithdraw' | null
    poolId?: number
  }>({ type: null })

  const [formData, setFormData] = useState({
    amount: '',
    poolId: '',
    maxMembers: '',
    name: '',
    region: '',
    requiredTokens: '',
    minPingTime: '',
    maxChallengeResponsePeriod: '',
    peerId: '',
    upgradeAddress: '',
    targetAddress: '',
    role: '',
    proposalId: '',
    createPoolLockAmount: '',
    memberAddress: '',
    tokenAddress: '',
    withdrawAmount: '',
    transactionLimit: '',
    quorum: '',
    roleAddress: '',
    roleType: '1', // Default to "Add Role" (1)
  })

  const {
    emergencyAction,
    upgradeContract,
    createProposal,
    approveProposal,
    executeProposal,
    storagePoolProposals,
    handleSetRoleTransactionLimit,
    handleSetRoleQuorum,
    checkRoleConfig,
    checkHasRole,
    createRoleProposal,
  } = useAdminContract()

  const {
    pools,
    isLoading: poolsLoading,
    error: poolsError,
    refreshData,
    fetchPoolMembersPage,
  } = useStoragePoolData()

  const contractAddress = STORAGE_POOL_CONTRACT_ADDRESSES[chainId]
  const { writeContractAsync } = useWriteContract()

  // Set the active contract to STORAGE_POOL when the component mounts
  useEffect(() => {
    setActiveContract(CONTRACT_TYPES.STORAGE_POOL)
  }, [setActiveContract])

  const [isCreatingPool, setIsCreatingPool] = useState(false)
  const [isSettingTokens, setIsSettingTokens] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isRemovingMembers, setIsRemovingMembers] = useState(false)
  const [isDeletingPool, setIsDeletingPool] = useState(false)
  const [isCreatingRoleProposal, setIsCreatingRoleProposal] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isProcessingJoinRequests, setIsProcessingJoinRequests] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isSettingLimit, setIsSettingLimit] = useState(false)
  const [roleCheckResult, setRoleCheckResult] = useState<{ transactionLimit: bigint, quorum: number } | null>(null)
  const [isCheckingRole, setIsCheckingRole] = useState(false)
  const [hasRoleResult, setHasRoleResult] = useState<boolean | null>(null)

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  // Role Configuration handlers
  const handleCheckRoleConfig = async () => {
    if (!formData.role) return;

    try {
      setIsCheckingRole(true);
      setError(null);
      const result = await checkRoleConfig(formData.role);
      if (result && result.transactionLimit !== undefined && result.quorum !== undefined) {
        setRoleCheckResult({
          transactionLimit: result.transactionLimit,
          quorum: Number(result.quorum)
        });
      } else {
        setError('Failed to fetch role configuration');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to check role configuration');
    } finally {
      setIsCheckingRole(false);
    }
  };

  const checkUserHasRole = async (address: string, role: string) => {
    try {
      setIsCheckingRole(true);
      setHasRoleResult(null);
      setError(null);

      const result = await checkHasRole(address, role);
      setHasRoleResult(result);
    } catch (error: any) {
      setError(error.message || 'Failed to check role');
    } finally {
      setIsCheckingRole(false);
    }
  };

  const handleSetTransactionLimit = async () => {
    try {
      setError(null)
      setIsSettingLimit(true)
      await handleSetRoleTransactionLimit(formData.role, formData.transactionLimit)
      // Clear form on success
      setFormData(prev => ({
        ...prev,
        role: '',
        transactionLimit: '',
      }))
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSettingLimit(false)
    }
  }

  const handleSetQuorum = async () => {
    try {
      setError(null)
      setIsSettingLimit(true)
      await handleSetRoleQuorum(formData.role, formData.quorum)
      // Clear form on success
      setFormData(prev => ({
        ...prev,
        role: '',
        quorum: '',
      }))
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSettingLimit(false)
    }
  }

  // Format transaction limit for display (convert from wei to ETH)
  const formatTransactionLimit = (limit: bigint | null) => {
    if (!limit) return '0';
    return ethers.formatEther(limit);
  };

  const handleOpenMembersDialog = async (poolId: number) => {
    setDialogOpen({ type: 'members', poolId })
    setMembersPage(0) // Reset to first page
    await loadMembersPage(poolId, 0)
  }

  const loadMembersPage = async (poolId: number, page: number) => {
    setLoadingMembers(true)

    try {
      // Get total member count first
      const pool = pools.find(p => p.id === poolId)
      const totalMemberCount = pool?.memberCount || 0
      setTotalMembers(totalMemberCount)

      // Calculate pagination
      const startIndex = page * membersPerPage
      const endIndex = Math.min(startIndex + membersPerPage, totalMemberCount)

      console.log(`Loading members page ${page + 1}, showing ${startIndex + 1}-${endIndex} of ${totalMemberCount}`)

      // Fetch only the members for this page
      const pageMembers = await fetchPoolMembersPage(poolId, startIndex, endIndex - startIndex)
      setFetchedMembers(pageMembers)
      setMembersPage(page)
    } catch (err) {
      console.error('Error fetching members page:', err)
      setFetchedMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleSetRequiredTokens = async () => {
    try {
      setIsSettingTokens(true)
      clearMessages()

      if (!formData.poolId || !formData.amount) {
        throw new Error('Please enter both pool ID and required tokens amount')
      }

      // Validate that the pool exists
      const poolExists = pools.some(pool => pool.id === Number(formData.poolId))
      if (!poolExists) {
        throw new Error(`Pool ${formData.poolId} does not exist`)
      }

      await writeContractAsync({
        address: contractAddress,
        abi: STORAGE_POOL_ABI,
        functionName: 'setRequiredTokens',
        args: [Number(formData.poolId), BigInt(formData.amount)] // uint32 poolId, uint256 newRequired
      } as any)

      setSuccess(`Required tokens for pool ${formData.poolId} updated successfully`)
      setFormData(prev => ({ ...prev, poolId: '', amount: '' }))
      await refreshData()
    } catch (err) {
      console.error('Error setting required tokens:', err)
      setError(err instanceof Error ? err.message : 'Failed to set required tokens')
    } finally {
      setIsSettingTokens(false)
    }
  }

  const handleSetCreatePoolLockAmount = async () => {
    try {
      setIsSettingTokens(true)
      clearMessages()

      if (!formData.createPoolLockAmount) {
        throw new Error('Please enter the pool creation lock amount')
      }

      const amount = BigInt(formData.createPoolLockAmount)
      const maxAmount = BigInt('100000000') * BigInt(10 ** 18) // 100M tokens

      if (amount > maxAmount) {
        throw new Error('Amount cannot exceed 100,000,000 tokens')
      }

      await writeContractAsync({
        address: contractAddress,
        abi: STORAGE_POOL_ABI,
        functionName: 'setCreatePoolLockAmount',
        args: [amount]
      } as any)

      setSuccess(`Pool creation lock amount updated to ${formData.createPoolLockAmount} tokens`)
      setFormData(prev => ({ ...prev, createPoolLockAmount: '' }))
    } catch (err) {
      console.error('Error setting create pool lock amount:', err)
      setError(err instanceof Error ? err.message : 'Failed to set create pool lock amount')
    } finally {
      setIsSettingTokens(false)
    }
  }

  const handleCreatePool = async () => {
    try {
      setIsCreatingPool(true)
      clearMessages()

      const { name, region, requiredTokens, minPingTime, maxChallengeResponsePeriod, maxMembers, peerId } = formData

      if (!name || !region || !requiredTokens || !minPingTime || !maxChallengeResponsePeriod || !maxMembers || !peerId) {
        throw new Error('Please fill in all fields')
      }

      // Debug: Log the parameters being sent
      console.log('Creating pool with parameters:', {
        name,
        region,
        requiredTokens: BigInt(requiredTokens).toString(),
        maxChallengeResponsePeriod: Number(maxChallengeResponsePeriod),
        minPingTime: BigInt(minPingTime).toString(),
        maxMembers: Number(maxMembers),
        peerId,
        contractAddress
      })

      // Pre-flight checks
      try {
        // Check the pool creation lock amount
        const createPoolLockAmount = await publicClient?.readContract({
          address: contractAddress,
          abi: STORAGE_POOL_ABI,
          functionName: 'createPoolLockAmount'
        } as any)

        console.log('Pool creation lock amount:', createPoolLockAmount?.toString())

        // Check user's token balance (if we have token contract info)
        // This would need the token contract address and ABI

      } catch (preflightError) {
        console.warn('Pre-flight checks failed:', preflightError)
        // Continue anyway, let the actual transaction reveal the issue
      }

      // Convert peerId string to bytes32 digest for storage
      const peerIdBytes32 = peerIdToBytes32(peerId)

      console.log('Converting peerId:', {
        original: peerId,
        originalLength: peerId.length,
        bytes32: peerIdBytes32,
        note: 'Storing 32-byte digest, can reconstruct full PeerID from digest'
      })

      await writeContractAsync({
        address: contractAddress,
        abi: STORAGE_POOL_ABI,
        functionName: 'createPool',
        args: [
          name,
          Number(maxMembers),
          Number(requiredTokens),
          peerId
        ] // string, uint32, uint256, string
      } as any)

      setSuccess('Data pool created successfully')
      await refreshData() // Refresh pool list

      // Reset form
      setFormData(prev => ({
        ...prev,
        name: '',
        region: '',
        requiredTokens: '',
        minPingTime: '',
        maxChallengeResponsePeriod: '',
        maxMembers: '',
        peerId: '',
      }))
    } catch (err) {
      console.error('Error creating data pool:', err)

      // Enhanced error handling
      let errorMessage = 'Failed to create data pool'
      if (err instanceof Error) {
        if (err.message.includes('execution reverted')) {
          errorMessage = 'Transaction reverted. Possible issues: insufficient tokens, missing approvals, or access control restrictions.'
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction'
        } else if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    } finally {
      setIsCreatingPool(false)
    }
  }

  const handleRemoveMembersBatch = async () => {
    try {
      setIsRemovingMembers(true)
      setError(null)

      if (!formData.poolId || !formData.maxMembers) {
        throw new Error('Please enter pool ID and max members')
      }

      // This would need to be implemented in useAdminContract
      // await removeMembersBatch(formData.poolId, formData.maxMembers)

      setFormData(prev => ({ ...prev, poolId: '', maxMembers: '' }))
    } catch (err) {
      console.error('Error removing members:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove members')
    } finally {
      setIsRemovingMembers(false)
    }
  }

  const handleDeletePool = async (poolId?: number) => {
    try {
      setIsDeletingPool(true)
      clearMessages()

      const targetPoolId = poolId || formData.poolId
      if (!targetPoolId) {
        throw new Error('Please enter pool ID')
      }

      await writeContractAsync({
        address: contractAddress,
        abi: STORAGE_POOL_ABI,
        functionName: 'deletePool',
        args: [Number(targetPoolId)] // uint32
      } as any)

      setSuccess('Pool deleted successfully')
      await refreshData()
      if (!poolId) {
        setFormData(prev => ({ ...prev, poolId: '' }))
      }
    } catch (err) {
      console.error('Error deleting pool:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete pool')
    } finally {
      setIsDeletingPool(false)
    }
  }

  // New handlers for additional functionality
  const handleAddMember = async (poolId: number, memberAddress: string, peerId: string) => {
    try {
      setIsAddingMember(true)
      clearMessages()

      if (!peerId) {
        throw new Error('Peer ID is required')
      }

      await writeContractAsync({
        address: contractAddress,
        abi: STORAGE_POOL_ABI,
        functionName: 'addMember',
        args: [Number(poolId), memberAddress as `0x${string}`, peerId] // uint32, address, string
      } as any)

      setSuccess('Member added successfully')
      await refreshData()
      setDialogOpen({ type: null })
    } catch (err) {
      console.error('Error adding member:', err)
      setError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMemberByPeerId = async (poolId: number, peerId: string) => {
    try {
      clearMessages()

      await writeContractAsync({
        address: contractAddress,
        abi: STORAGE_POOL_ABI,
        functionName: 'removeMemberPeerId',
        args: [Number(poolId), peerId] // uint32, string
      } as any)

      setSuccess('Member removed successfully')
      await refreshData()
    } catch (err) {
      console.error('Error removing member:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const handleApproveJoinRequest = async (poolId: number, peerId: string) => {
    try {
      setIsProcessingJoinRequests(true)
      clearMessages()

      await writeContractAsync({
        address: contractAddress,
        abi: STORAGE_POOL_ABI,
        functionName: 'approveJoinRequest',
        args: [Number(poolId), peerId] // uint32, string
      } as any)

      setSuccess('Join request approved successfully')
      await refreshData()
    } catch (err) {
      console.error('Error approving join request:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve join request')
    } finally {
      setIsProcessingJoinRequests(false)
    }
  }

  const handleRejectJoinRequest = async (poolId: number, peerId: string) => {
    try {
      setIsProcessingJoinRequests(true)
      clearMessages()

      await writeContractAsync({
        address: contractAddress,
        abi: STORAGE_POOL_ABI,
        functionName: 'cancelJoinRequest', // Using cancel since there's no direct reject
        args: [Number(poolId), peerId] // uint32, string
      } as any)

      setSuccess('Join request rejected successfully')
      await refreshData()
    } catch (err) {
      console.error('Error rejecting join request:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject join request')
    } finally {
      setIsProcessingJoinRequests(false)
    }
  }

  // Note: Batch operations are not available in the current contract
  // Each join request must be processed individually

  const handleBatchApproveJoinRequests = async (poolId: number, peerIds: string[]) => {
    try {
      setIsProcessingJoinRequests(true)
      clearMessages()

      for (const peerId of peerIds) {
        await handleApproveJoinRequest(poolId, peerId)
      }

      setSuccess(`Approved ${peerIds.length} join requests successfully`)
      // Clear selection after batch operation
      setSelectedJoinRequests([])
    } catch (err) {
      console.error('Error in batch approve:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve join requests')
    } finally {
      setIsProcessingJoinRequests(false)
    }
  }

  const handleBatchRejectJoinRequests = async (poolId: number, peerIds: string[]) => {
    try {
      setIsProcessingJoinRequests(true)
      clearMessages()

      for (const peerId of peerIds) {
        await handleRejectJoinRequest(poolId, peerId)
      }

      setSuccess(`Rejected ${peerIds.length} join requests successfully`)
      // Clear selection after batch operation
      setSelectedJoinRequests([])
    } catch (err) {
      console.error('Error in batch reject:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject join requests')
    } finally {
      setIsProcessingJoinRequests(false)
    }
  }

  const handleEmergencyWithdraw = async () => {
    try {
      setIsWithdrawing(true)
      clearMessages()

      if (!formData.withdrawAmount) {
        throw new Error('Please enter amount')
      }

      await writeContractAsync({
        address: contractAddress,
        abi: STORAGE_POOL_ABI,
        functionName: 'emergencyRecoverTokens',
        args: [BigInt(formData.withdrawAmount)] // Only amount, recovers storage tokens
      } as any)

      setSuccess('Emergency token recovery completed successfully')
      setFormData(prev => ({ ...prev, withdrawAmount: '' }))
      setDialogOpen({ type: null })
    } catch (err) {
      console.error('Error during emergency token recovery:', err)
      setError(err instanceof Error ? err.message : 'Failed to perform emergency token recovery')
    } finally {
      setIsWithdrawing(false)
    }
  }

  const handleCreateRoleProposal = async () => {
    try {
      setIsCreatingRoleProposal(true)
      setError(null)

      const { roleAddress, role, roleType } = formData

      if (!roleAddress || !role) {
        throw new Error('Please fill in all required fields')
      }

      // Convert roleType to number
      const proposalType = parseInt(roleType)

      // Create role proposal
      await createRoleProposal(proposalType, roleAddress, role)

      // Reset form
      setFormData(prev => ({
        ...prev,
        roleAddress: '',
        role: '',
      }))
    } catch (error: any) {
      console.error(error)
      setError(error.message)
    } finally {
      setIsCreatingRoleProposal(false)
    }
  }

  const handleApproveProposal = async (proposalId: string) => {
    try {
      setError(null)
      setIsApproving(true)
      await approveProposal(proposalId)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsApproving(false)
    }
  }

  const handleExecuteProposal = async (proposalId: string) => {
    try {
      setError(null)
      setIsExecuting(true)
      await executeProposal(proposalId)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleCreateUpgradeProposal = async () => {
    try {
      setIsUpgrading(true)
      setError(null)

      if (!ethers.isAddress(formData.upgradeAddress)) {
        throw new Error('Invalid Ethereum address')
      }

      const hash = await createProposal(
        3, // Upgrade proposal type
        0,
        formData.upgradeAddress,
        ethers.ZeroHash,
        '0',
        ethers.ZeroAddress
      )
      console.log('Upgrade proposal created with transaction hash:', hash)

      setFormData(prev => ({ ...prev, upgradeAddress: '' }))
    } catch (error: any) {
      console.error(error)
      setError(error.message)
    } finally {
      setIsUpgrading(false)
    }
  }

  if (!isConnected) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" gutterBottom>
          Please connect your wallet to access the admin panel
        </Typography>
        <Box sx={{ mt: 2 }}>
          <ConnectButton />
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Storage Pool Contract Administration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Contract Diagnostics Section */}
      <Accordion sx={{ mt: 4 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Contract Diagnostics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <ContractDiagnostics contractAddress={contractAddress} />
        </AccordionDetails>
      </Accordion>

      {/* Pool Overview Section */}
      <Accordion defaultExpanded sx={{ mt: 4 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Pool Overview</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {poolsLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          ) : poolsError ? (
            <Alert severity="error">{poolsError}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Pool ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Required Tokens</TableCell>
                    <TableCell>Members</TableCell>
                    <TableCell>Join Requests</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pools.map((pool) => (
                    <TableRow key={pool.id}>
                      <TableCell>{pool.id}</TableCell>
                      <TableCell>{pool.name}</TableCell>
                      <TableCell>{pool.region}</TableCell>
                      <TableCell>
                        {pool.requiredTokens.toString()}
                        {/* Debug: {typeof pool.requiredTokens} - {pool.requiredTokens === BigInt(0) ? 'zero' : 'nonzero'} */}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleOpenMembersDialog(pool.id)}
                        >
                          {pool.memberCount} members
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => setDialogOpen({ type: 'joinRequests', poolId: pool.id })}
                          disabled={pool.joinRequests.length === 0}
                        >
                          {pool.joinRequests.length} requests
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pool.memberCount > 0 ? 'Active' : 'Empty'}
                          color={pool.memberCount > 0 ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => setDialogOpen({ type: 'addMember', poolId: pool.id })}
                          title="Add Member"
                        >
                          <PersonAddIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, poolId: pool.id.toString() }))
                            handleDeletePool()
                          }}
                          title="Delete Pool"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={refreshData} disabled={poolsLoading}>
              {poolsLoading ? <CircularProgress size={20} /> : 'Refresh Pool Data'}
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Pool data is fetched directly from contract. Check browser console for debugging info.
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded sx={{ mt: 4 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Pool Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Pool ID"
                type="number"
                value={formData.poolId}
                onChange={(e) => setFormData({ ...formData, poolId: e.target.value })}
                helperText="ID of the pool to update"
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Required Tokens"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                helperText="New required tokens amount for the pool"
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleSetRequiredTokens}
              disabled={isSettingTokens || !formData.poolId || !formData.amount}
            >
              {isSettingTokens ? <CircularProgress size={24} /> : 'Set Required Tokens'}
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Updates the required tokens amount for a specific pool. Cannot increase if there are pending join requests.
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Global Pool Creation Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Pool Creation Lock Amount"
                type="number"
                value={formData.createPoolLockAmount}
                onChange={(e) => setFormData({ ...formData, createPoolLockAmount: e.target.value })}
                helperText="Amount of tokens non-admin users must lock to create a pool (max: 100,000,000)"
                inputProps={{ min: 0, max: 100000000 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleSetCreatePoolLockAmount}
              disabled={isSettingTokens || !formData.createPoolLockAmount}
            >
              {isSettingTokens ? <CircularProgress size={24} /> : 'Set Pool Creation Lock Amount'}
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Sets the global amount of tokens that non-admin users must lock when creating a new pool.
              Admins can create pools without locking tokens. Current value shown in diagnostics above.
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Create Pool</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Pool Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                helperText="Name for the storage pool"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                helperText="Geographic region for the pool"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Required Tokens"
                type="number"
                value={formData.requiredTokens}
                onChange={(e) => setFormData({ ...formData, requiredTokens: e.target.value })}
                helperText="Tokens required to join the pool"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Min Ping Time (ms)"
                type="number"
                value={formData.minPingTime}
                onChange={(e) => setFormData({ ...formData, minPingTime: e.target.value })}
                helperText="Minimum ping time requirement"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Max Challenge Response Period (ms)"
                type="number"
                value={formData.maxChallengeResponsePeriod}
                onChange={(e) => setFormData({ ...formData, maxChallengeResponsePeriod: e.target.value })}
                helperText="Maximum time to respond to challenges"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Max Members"
                type="number"
                value={formData.maxMembers}
                onChange={(e) => setFormData({ ...formData, maxMembers: e.target.value })}
                helperText="Maximum number of members in the pool"
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Peer ID"
                value={formData.peerId}
                onChange={(e) => setFormData({ ...formData, peerId: e.target.value })}
                helperText="Peer ID of the pool creator"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleCreatePool}
              disabled={isCreatingPool}
            >
              {isCreatingPool ? <CircularProgress size={24} /> : 'Create Pool'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Pool Management</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Pool ID"
                type="number"
                value={formData.poolId}
                onChange={(e) => setFormData({ ...formData, poolId: e.target.value })}
                helperText="ID of the pool to manage"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Max Members to Remove"
                type="number"
                value={formData.maxMembers}
                onChange={(e) => setFormData({ ...formData, maxMembers: e.target.value })}
                helperText="Maximum number of members to remove in batch"
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleRemoveMembersBatch}
              disabled={isRemovingMembers}
            >
              {isRemovingMembers ? <CircularProgress size={24} /> : 'Remove Members Batch'}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleDeletePool()}
              disabled={isDeletingPool}
            >
              {isDeletingPool ? <CircularProgress size={24} /> : 'Delete Pool'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Role Configuration */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Role Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box component="form" noValidate sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Role"
                  value={formData.role || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  margin="normal"
                >
                  <MenuItem value="ADMIN_ROLE">Admin Role</MenuItem>
                  <MenuItem value="CONTRACT_OPERATOR_ROLE">Contract Operator Role</MenuItem>
                  <MenuItem value="BRIDGE_OPERATOR_ROLE">Bridge Operator Role</MenuItem>
                  <MenuItem value="POOL_ADMIN_ROLE">Pool Admin Role</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Transaction Limit (ETH)"
                  type="number"
                  value={formData.transactionLimit || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, transactionLimit: e.target.value }))}
                  margin="normal"
                  inputProps={{
                    step: "0.000000000000000001" // Allow for 18 decimal places
                  }}
                  helperText="Enter the limit in ETH"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Quorum"
                  type="number"
                  value={formData.quorum || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, quorum: e.target.value }))}
                  margin="normal"
                  inputProps={{
                    min: "1",
                    max: "65535",
                    step: "1"
                  }}
                  helperText="Enter a number between 1 and 65535"
                />
              </Grid>
              <Grid size={12}>
                <Button
                  variant="contained"
                  onClick={handleSetTransactionLimit}
                  disabled={!formData.role || !formData.transactionLimit || isSettingLimit}
                  sx={{ mr: 1 }}
                >
                  {isSettingLimit ? <CircularProgress size={24} /> : 'Set Transaction Limit'}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSetQuorum}
                  disabled={
                    !formData.role ||
                    !formData.quorum ||
                    Number(formData.quorum) < 1 ||
                    Number(formData.quorum) > 65535 ||
                    isSettingLimit
                  }
                  sx={{ mr: 1 }}
                >
                  {isSettingLimit ? <CircularProgress size={24} /> : 'Set Quorum'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCheckRoleConfig}
                  disabled={!formData.role || isCheckingRole}
                  sx={{ mr: 1 }}
                >
                  {isCheckingRole ? <CircularProgress size={24} /> : 'Check Role Config'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    if (!formData.role) return;
                    try {
                      const result = await checkRoleConfig(formData.role);
                      if (result) {
                        const formattedLimit = formatTransactionLimit(result.transactionLimit);
                        setFormData(prev => ({
                          ...prev,
                          transactionLimit: formattedLimit,
                          quorum: result.quorum.toString()
                        }));
                      }
                    } catch (error: any) {
                      console.error('Error loading current values:', error);
                      setError(error.message || 'Failed to fetch current values');
                    }
                  }}
                  disabled={!formData.role}
                >
                  Load Current Values
                </Button>
              </Grid>
              {roleCheckResult && (
                <Grid size={12}>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Role Configuration:</Typography>
                    <Typography>
                      Transaction Limit: {formatTransactionLimit(roleCheckResult.transactionLimit)} ETH
                    </Typography>
                    <Typography>
                      Quorum: {roleCheckResult.quorum}
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Role Management</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box component="form" noValidate sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.roleAddress || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleAddress: e.target.value }))}
                  margin="normal"
                  placeholder="0x..."
                  helperText="Address to check or modify role"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Role"
                  value={formData.role || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  margin="normal"
                  helperText="Select the role to check or modify"
                >
                  <MenuItem value="ADMIN_ROLE">Admin Role</MenuItem>
                  <MenuItem value="CONTRACT_OPERATOR_ROLE">Contract Operator Role</MenuItem>
                  <MenuItem value="BRIDGE_OPERATOR_ROLE">Bridge Operator Role</MenuItem>
                  <MenuItem value="POOL_ADMIN_ROLE">Pool Admin Role</MenuItem>
                </TextField>
              </Grid>
              <Grid size={12}>
                <Button
                  variant="outlined"
                  onClick={() => checkUserHasRole(formData.roleAddress, formData.role)}
                  disabled={!formData.roleAddress || !formData.role || isCheckingRole}
                  sx={{ mr: 1 }}
                >
                  {isCheckingRole ? <CircularProgress size={24} /> : 'Check Role'}
                </Button>
                {hasRoleResult !== null && (
                  <Typography sx={{ mt: 1 }}>
                    {hasRoleResult
                      ? `Address ${formData.roleAddress} HAS the ${formData.role} role.`
                      : `Address ${formData.roleAddress} DOES NOT HAVE the ${formData.role} role.`}
                  </Typography>
                )}
              </Grid>
              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Create Role Proposal
                </Typography>
                <TextField
                  select
                  fullWidth
                  label="Proposal Type"
                  value={formData.roleType || '1'}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleType: e.target.value }))}
                  margin="normal"
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="1">Add Role</MenuItem>
                  <MenuItem value="2">Remove Role</MenuItem>
                </TextField>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Note: Role changes require multi-signature approval through the proposal system.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleCreateRoleProposal}
                  disabled={!formData.roleAddress || !formData.role || !formData.roleType || isCreatingRoleProposal}
                >
                  {isCreatingRoleProposal ? <CircularProgress size={24} /> : 'Create Role Proposal'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Pending Proposals</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {storagePoolProposals && storagePoolProposals.length > 0 ? (
            <Box>
              {storagePoolProposals.map((proposal) => {
                const now = Math.floor(Date.now() / 1000)
                const isExpired = proposal?.config?.expiryTime ?
                  Number(proposal.config.expiryTime) < now : false
                const canExecute = proposal?.config?.executionTime &&
                  proposal?.config?.status !== undefined &&
                  proposal?.config?.approvals !== undefined ?
                  Number(proposal.config.executionTime) <= now &&
                  proposal.config.status === 0 &&
                  Number(proposal.config.approvals) >= 2 : false

                return (
                  <Box key={proposal.proposalId} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2">Proposal ID: {proposal.proposalId}</Typography>
                    <Typography variant="body2">Type: {proposal.proposalType === 1 ? 'Add Role' : proposal.proposalType === 3 ? 'Upgrade' : 'Other'}</Typography>
                    <Typography variant="body2">Target: {proposal.target}</Typography>
                    <Typography variant="body2">Status: {proposal.config.status === 1 ? 'Executed' : isExpired ? 'Expired' : 'Pending'}</Typography>
                    <Typography variant="body2">Approvals: {proposal.config.approvals?.toString() || '0'}</Typography>

                    {proposal.config.status !== 1 && !isExpired && (
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={() => handleApproveProposal(proposal.proposalId)}
                          disabled={isApproving}
                          sx={{ mr: 1 }}
                        >
                          {isApproving ? <CircularProgress size={20} /> : 'Approve'}
                        </Button>
                        {canExecute && (
                          <Button
                            variant="contained"
                            onClick={() => handleExecuteProposal(proposal.proposalId)}
                            disabled={isExecuting}
                          >
                            {isExecuting ? <CircularProgress size={20} /> : 'Execute'}
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
          ) : (
            <Alert severity="info">No pending proposals found</Alert>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Upgrade Proposal</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="New Contract Address"
                value={formData.upgradeAddress}
                onChange={(e) => setFormData({ ...formData, upgradeAddress: e.target.value })}
                helperText="Enter the new contract address"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleCreateUpgradeProposal}
              disabled={isUpgrading}
            >
              {isUpgrading ? <CircularProgress size={24} /> : 'Create Upgrade Proposal'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Execute Upgrade</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="New Implementation Address"
                value={formData.upgradeAddress || ''}
                onChange={(e) => setFormData({ ...formData, upgradeAddress: e.target.value })}
                helperText="Enter the new contract implementation address"
              />
            </Grid>
            <Grid size={12}>
              <Button
                variant="contained"
                onClick={async () => {
                  try {
                    setError(null);
                    if (!formData.upgradeAddress || !ethers.isAddress(formData.upgradeAddress)) {
                      throw new Error('Invalid contract address');
                    }
                    await upgradeContract(formData.upgradeAddress);
                    setFormData(prev => ({ ...prev, upgradeAddress: '' }));
                  } catch (error: any) {
                    console.error('Error executing upgrade:', error);
                    setError(error.message);
                  }
                }}
                disabled={!formData.upgradeAddress || !ethers.isAddress(formData.upgradeAddress)}
              >
                Execute Upgrade
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Emergency Actions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Button
                variant="contained"
                color="warning"
                onClick={async () => {
                  try {
                    setError(null);
                    await emergencyAction(1);
                  } catch (error: any) {
                    console.error('Error pausing contract:', error);
                    setError(error.message);
                  }
                }}
                sx={{ mr: 2 }}
              >
                Pause
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={async () => {
                  try {
                    setError(null);
                    await emergencyAction(2);
                  } catch (error: any) {
                    console.error('Error unpausing contract:', error);
                    setError(error.message);
                  }
                }}
              >
                Unpause
              </Button>
            </Grid>
          </Grid>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Emergency Withdrawal Section */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Emergency Token Withdrawal</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Button
            variant="contained"
            color="error"
            onClick={() => setDialogOpen({ type: 'emergencyWithdraw' })}
          >
            Emergency Withdraw Tokens
          </Button>
        </AccordionDetails>
      </Accordion>

      {/* Dialogs */}
      {/* Members Dialog */}
      <Dialog
        open={dialogOpen.type === 'members'}
        onClose={() => setDialogOpen({ type: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Pool Members - Pool {dialogOpen.poolId}
        </DialogTitle>
        <DialogContent>
          {dialogOpen.poolId !== undefined && (
            <>
              {/* Pagination Info */}
              {!loadingMembers && totalMembers > 0 && (
                <Box sx={{ mb: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    Showing {membersPage * membersPerPage + 1}-{Math.min((membersPage + 1) * membersPerPage, totalMembers)} of {totalMembers} members
                  </Typography>
                </Box>
              )}

              {loadingMembers ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress />
                  <Typography sx={{ ml: 2 }}>Loading members...</Typography>
                </Box>
              ) : fetchedMembers.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No members found using contract getter functions.
                  <br />
                  Pool shows {pools.find(p => p.id === dialogOpen.poolId)?.memberCount || 0} members but getPoolMembers() returned empty.
                  <br />
                  <br />
                  This could indicate:
                  <br />
                  • Contract getter functions are not working as expected
                  <br />
                  • Member data structure mismatch
                  <br />
                  • Pool ID mismatch
                </Typography>
              ) : (
                <>
                  <Box>
                    {fetchedMembers.map((member, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          mb: 2,
                          border: '1px solid',
                          borderColor: 'grey.300',
                          borderRadius: 2,
                          position: 'relative'
                        }}
                      >
                        <Box sx={{ pr: 6 }}> {/* Add padding-right for remove button */}
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {member.address} (Index: {member.memberIndex})
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {member.totalPeerIds} peer IDs
                          </Typography>
                          {member.peerIds.map((peer, peerIndex) => (
                            <Box key={peerIndex} sx={{ ml: 1, mt: 1, p: 1, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                              <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                Peer ID:
                              </Typography>
                              <Box
                                component="div"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.75rem',
                                  wordBreak: 'break-all',
                                  backgroundColor: 'grey.100',
                                  p: 0.5,
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: 'grey.200'
                                  }
                                }}
                                onClick={() => {
                                  navigator.clipboard.writeText(peer.peerId)
                                  setSuccess('Peer ID copied to clipboard!')
                                  setTimeout(() => setSuccess(null), 2000)
                                }}
                                title="Click to copy peer ID"
                              >
                                {peer.peerId}
                              </Box>
                              <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                                Locked Tokens: {peer.lockedTokens}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        {/* Remove button positioned absolutely */}
                        <IconButton
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8
                          }}
                          onClick={() => handleRemoveMemberByPeerId(dialogOpen.poolId!, member.address)}
                          color="error"
                          title="Remove Member"
                          size="small"
                        >
                          <PersonRemoveIcon />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>

                  {/* Pagination Controls */}
                  {totalMembers > membersPerPage && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, gap: 1 }}>
                      <IconButton
                        onClick={() => loadMembersPage(dialogOpen.poolId!, membersPage - 1)}
                        disabled={membersPage === 0 || loadingMembers}
                        size="small"
                      >
                        <ChevronLeftIcon />
                      </IconButton>

                      <Typography variant="body2" sx={{ mx: 2 }}>
                        Page {membersPage + 1} of {Math.ceil(totalMembers / membersPerPage)}
                      </Typography>

                      <IconButton
                        onClick={() => loadMembersPage(dialogOpen.poolId!, membersPage + 1)}
                        disabled={membersPage >= Math.ceil(totalMembers / membersPerPage) - 1 || loadingMembers}
                        size="small"
                      >
                        <ChevronRightIcon />
                      </IconButton>
                    </Box>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen({ type: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Join Requests Dialog */}
      <Dialog
        open={dialogOpen.type === 'joinRequests'}
        onClose={() => setDialogOpen({ type: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Join Requests - Pool {dialogOpen.poolId}
        </DialogTitle>
        <DialogContent>
          {dialogOpen.poolId !== undefined && (
            <>
              <List>
                {pools.find(p => p.id === dialogOpen.poolId)?.joinRequests.map((request, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${request.account} (${request.peerId})`}
                      secondary={`Status: ${request.status}, Approvals: ${request.approvals}, Rejections: ${request.rejections}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleApproveJoinRequest(dialogOpen.poolId!, request.peerId)}
                        color="success"
                        disabled={isProcessingJoinRequests}
                        title="Approve"
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleRejectJoinRequest(dialogOpen.poolId!, request.peerId)}
                        color="error"
                        disabled={isProcessingJoinRequests}
                        title="Reject"
                      >
                        <CloseIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              {selectedJoinRequests.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleBatchApproveJoinRequests(dialogOpen.poolId!, selectedJoinRequests)}
                    disabled={isProcessingJoinRequests}
                  >
                    Approve Selected ({selectedJoinRequests.length})
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleBatchRejectJoinRequests(dialogOpen.poolId!, selectedJoinRequests)}
                    disabled={isProcessingJoinRequests}
                  >
                    Reject Selected ({selectedJoinRequests.length})
                  </Button>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen({ type: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog
        open={dialogOpen.type === 'addMember'}
        onClose={() => setDialogOpen({ type: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Member to Pool {dialogOpen.poolId}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Member Address"
            value={formData.memberAddress}
            onChange={(e) => setFormData({ ...formData, memberAddress: e.target.value })}
            margin="normal"
            placeholder="0x..."
          />
          <TextField
            fullWidth
            label="Peer ID"
            value={formData.peerId}
            onChange={(e) => setFormData({ ...formData, peerId: e.target.value })}
            margin="normal"
            placeholder="12D3KooW..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen({ type: null })}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (dialogOpen.poolId !== undefined && formData.memberAddress && formData.peerId) {
                handleAddMember(dialogOpen.poolId, formData.memberAddress, formData.peerId)
                setFormData(prev => ({ ...prev, memberAddress: '', peerId: '' }))
              }
            }}
            disabled={!formData.memberAddress || !formData.peerId || isAddingMember}
          >
            {isAddingMember ? <CircularProgress size={24} /> : 'Add Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Emergency Withdraw Dialog */}
      <Dialog
        open={dialogOpen.type === 'emergencyWithdraw'}
        onClose={() => setDialogOpen({ type: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Emergency Token Recovery</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will recover storage tokens from the token pool. Only admins can perform this action.
          </Typography>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={formData.withdrawAmount}
            onChange={(e) => setFormData({ ...formData, withdrawAmount: e.target.value })}
            margin="normal"
            inputProps={{ min: 0 }}
            helperText="Amount of storage tokens to recover"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen({ type: null })}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEmergencyWithdraw}
            disabled={!formData.withdrawAmount || isWithdrawing}
          >
            {isWithdrawing ? <CircularProgress size={24} /> : 'Emergency Recover'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
