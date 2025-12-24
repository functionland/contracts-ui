

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
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
  Divider,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { ethers } from 'ethers'
import { ConnectButton } from '@/components/common/ConnectButton'
import { useAdminContract } from '@/hooks/useAdminContract'
import { useContractContext } from '@/contexts/ContractContext'
import { CONTRACT_TYPES } from '@/config/constants'

export function RewardEngineAdmin() {
  const { isConnected } = useAccount()
  const { setActiveContract } = useContractContext()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    tokenAddress: '',
    amount: '',
    recipient: '',
    monthlyRewardPerPeer: '',
    expectedPeriod: '',
    upgradeAddress: '',
    account: '',
    peerId: '',
    poolId: '',
    targetAddress: '',
    role: '',
    proposalId: '',
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
    rewardEngineProposals,
    handleSetRoleTransactionLimit,
    handleSetRoleQuorum,
    checkRoleConfig,
    checkHasRole,
    createRoleProposal,
  } = useAdminContract()

  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [isSettingReward, setIsSettingReward] = useState(false)
  const [isSettingPeriod, setIsSettingPeriod] = useState(false)
  const [isTripping, setIsTripping] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isCreatingRoleProposal, setIsCreatingRoleProposal] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isSettingLimit, setIsSettingLimit] = useState(false)
  const [roleCheckResult, setRoleCheckResult] = useState<{ transactionLimit: bigint, quorum: number } | null>(null)
  const [isCheckingRole, setIsCheckingRole] = useState(false)
  const [hasRoleResult, setHasRoleResult] = useState<boolean | null>(null)

  // Set the active contract to REWARD_ENGINE when the component mounts
  useEffect(() => {
    setActiveContract(CONTRACT_TYPES.REWARD_ENGINE)
  }, [setActiveContract])

  const handleEmergencyWithdraw = async () => {
    try {
      setIsWithdrawing(true)
      setError(null)

      if (!formData.tokenAddress || !formData.amount) {
        throw new Error('Please enter token address and amount')
      }

      // This would need to be implemented in useAdminContract
      // await emergencyWithdraw(formData.tokenAddress, formData.amount)

      setFormData(prev => ({ ...prev, tokenAddress: '', amount: '' }))
    } catch (err) {
      console.error('Error performing emergency withdraw:', err)
      setError(err instanceof Error ? err.message : 'Failed to perform emergency withdraw')
    } finally {
      setIsWithdrawing(false)
    }
  }

  const handleAdminRecoverERC20 = async () => {
    try {
      setIsRecovering(true)
      setError(null)

      if (!formData.tokenAddress || !formData.recipient || !formData.amount) {
        throw new Error('Please enter token address, recipient, and amount')
      }

      // This would need to be implemented in useAdminContract
      // await adminRecoverERC20(formData.tokenAddress, formData.recipient, formData.amount)

      setFormData(prev => ({ ...prev, tokenAddress: '', recipient: '', amount: '' }))
    } catch (err) {
      console.error('Error recovering ERC20:', err)
      setError(err instanceof Error ? err.message : 'Failed to recover ERC20')
    } finally {
      setIsRecovering(false)
    }
  }

  const handleSetMonthlyRewardPerPeer = async () => {
    try {
      setIsSettingReward(true)
      setError(null)

      if (!formData.monthlyRewardPerPeer) {
        throw new Error('Please enter monthly reward per peer')
      }

      // This would need to be implemented in useAdminContract
      // await setMonthlyRewardPerPeer(formData.monthlyRewardPerPeer)

      setFormData(prev => ({ ...prev, monthlyRewardPerPeer: '' }))
    } catch (err) {
      console.error('Error setting monthly reward per peer:', err)
      setError(err instanceof Error ? err.message : 'Failed to set monthly reward per peer')
    } finally {
      setIsSettingReward(false)
    }
  }

  const handleSetExpectedPeriod = async () => {
    try {
      setIsSettingPeriod(true)
      setError(null)

      if (!formData.expectedPeriod) {
        throw new Error('Please enter expected period')
      }

      // This would need to be implemented in useAdminContract
      // await setExpectedPeriod(formData.expectedPeriod)

      setFormData(prev => ({ ...prev, expectedPeriod: '' }))
    } catch (err) {
      console.error('Error setting expected period:', err)
      setError(err instanceof Error ? err.message : 'Failed to set expected period')
    } finally {
      setIsSettingPeriod(false)
    }
  }

  const handleTripCircuitBreaker = async () => {
    try {
      setIsTripping(true)
      setError(null)

      // This would need to be implemented in useAdminContract
      // await tripCircuitBreaker()
    } catch (err) {
      console.error('Error tripping circuit breaker:', err)
      setError(err instanceof Error ? err.message : 'Failed to trip circuit breaker')
    } finally {
      setIsTripping(false)
    }
  }

  const handleResetCircuitBreaker = async () => {
    try {
      setIsResetting(true)
      setError(null)

      // This would need to be implemented in useAdminContract
      // await resetCircuitBreaker()
    } catch (err) {
      console.error('Error resetting circuit breaker:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset circuit breaker')
    } finally {
      setIsResetting(false)
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
        Reward Engine Contract Administration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Accordion defaultExpanded sx={{ mt: 4 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Emergency Functions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="subtitle1" gutterBottom>Emergency Withdraw</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Token Address"
                value={formData.tokenAddress}
                onChange={(e) => setFormData({ ...formData, tokenAddress: e.target.value })}
                helperText="Address of the token to withdraw"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                helperText="Amount to withdraw"
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleEmergencyWithdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? <CircularProgress size={24} /> : 'Emergency Withdraw'}
            </Button>
          </Box>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 4 }}>Admin Recover ERC20</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Token Address"
                value={formData.tokenAddress}
                onChange={(e) => setFormData({ ...formData, tokenAddress: e.target.value })}
                helperText="Address of the token to recover"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Recipient"
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                helperText="Address to send recovered tokens"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                helperText="Amount to recover"
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleAdminRecoverERC20}
              disabled={isRecovering}
            >
              {isRecovering ? <CircularProgress size={24} /> : 'Recover ERC20'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Reward Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Monthly Reward Per Peer"
                type="number"
                value={formData.monthlyRewardPerPeer}
                onChange={(e) => setFormData({ ...formData, monthlyRewardPerPeer: e.target.value })}
                helperText="Monthly reward amount per peer"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Expected Period"
                type="number"
                value={formData.expectedPeriod}
                onChange={(e) => setFormData({ ...formData, expectedPeriod: e.target.value })}
                helperText="Expected period in seconds"
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleSetMonthlyRewardPerPeer}
              disabled={isSettingReward}
            >
              {isSettingReward ? <CircularProgress size={24} /> : 'Set Monthly Reward'}
            </Button>
            <Button
              variant="contained"
              onClick={handleSetExpectedPeriod}
              disabled={isSettingPeriod}
            >
              {isSettingPeriod ? <CircularProgress size={24} /> : 'Set Expected Period'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Circuit Breaker</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Circuit breaker controls can halt reward operations in emergency situations.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleTripCircuitBreaker}
              disabled={isTripping}
            >
              {isTripping ? <CircularProgress size={24} /> : 'Trip Circuit Breaker'}
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleResetCircuitBreaker}
              disabled={isResetting}
            >
              {isResetting ? <CircularProgress size={24} /> : 'Reset Circuit Breaker'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Reward Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            View reward information for specific accounts and peers.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Account Address"
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                helperText="Account address to check rewards"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Peer ID"
                value={formData.peerId}
                onChange={(e) => setFormData({ ...formData, peerId: e.target.value })}
                helperText="Peer ID to check rewards"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Pool ID"
                type="number"
                value={formData.poolId}
                onChange={(e) => setFormData({ ...formData, poolId: e.target.value })}
                helperText="Pool ID to check rewards"
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                // This would need to be implemented to call view functions
                console.log('Check rewards for:', formData.account, formData.peerId, formData.poolId)
              }}
            >
              Check Rewards
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
          {rewardEngineProposals && rewardEngineProposals.length > 0 ? (
            <Box>
              {rewardEngineProposals.map((proposal) => {
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
    </Box>
  )
}
