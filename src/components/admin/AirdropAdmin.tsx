

import { useState } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { ethers } from 'ethers'
import { ConnectButton } from '@/components/common/ConnectButton'
import { useAdminContract } from '@/hooks/useAdminContract'
import { CONTRACT_TYPES, PROPOSAL_TYPES, ROLES, ROLE_NAMES } from '@/config/constants'

export function AirdropAdmin() {
  const { isConnected } = useAccount()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    capId: '',
    capName: '',
    startDate: '',
    totalAllocation: '',
    cliff: '',
    vestingTerm: '',
    vestingPlan: '',
    initialRelease: '',
    walletAddress: '',
    amount: '',
    note: '',
    proposalId: '',
    tgeTime: '',
    role: '',
    transactionLimit: '',
    quorum: '',
    upgradeAddress: '',
  })

  const {
    airdropProposals,
    addVestingCap,
    addVestingWallet,
    approveProposal,
    executeProposal,
    vestingCapTable,
    isLoading,
    tgeStatus,
    initiateTGE,
    cleanupExpiredProposals,
    createProposal,
    handleSetRoleTransactionLimit,
    handleSetRoleQuorum,
    roleConfigs,
    checkRoleConfig,
    upgradeContract,
    emergencyAction,
    transferBackToStorage,
  } = useAdminContract()

  const [isCreatingCap, setIsCreatingCap] = useState(false)
  const [isAddingWallet, setIsAddingWallet] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isSettingTGE, setIsSettingTGE] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isCheckingRole, setIsCheckingRole] = useState(false)
  const [roleCheckResult, setRoleCheckResult] = useState<{ transactionLimit: bigint, quorum: number } | null>(null)
  const [isSettingLimit, setIsSettingLimit] = useState(false)
  const [isTransferringToStorage, setIsTransferringToStorage] = useState(false)

  const handleCreateVestingCap = async () => {
    try {
      setIsCreatingCap(true)
      setError(null)

      const {
        capId,
        capName,
        startDate,
        totalAllocation,
        cliff,
        vestingTerm,
        vestingPlan,
        initialRelease,
      } = formData

      if (!capId || !capName || !totalAllocation || !cliff || !vestingTerm || !vestingPlan || !initialRelease) {
        throw new Error('Please fill in all fields')
      }

      await addVestingCap(
        capId,
        capName,
        startDate,
        totalAllocation,
        cliff,
        vestingTerm,
        vestingPlan,
        initialRelease
      )

      // Reset form
      setFormData({
        capId: '',
        capName: '',
        startDate: '',
        totalAllocation: '',
        cliff: '',
        vestingTerm: '',
        vestingPlan: '',
        initialRelease: '',
        walletAddress: '',
        amount: '',
        note: '',
        proposalId: '',
        tgeTime: '',
        role: '',
        transactionLimit: '',
        quorum: '',
        upgradeAddress: '',
      })
    } catch (err) {
      console.error('Error creating airdrop vesting cap:', err)
      setError(err instanceof Error ? err.message : 'Failed to create airdrop vesting cap')
    } finally {
      setIsCreatingCap(false)
    }
  }

  const handleAddVestingWallet = async () => {
    try {
      setError(null)
      setIsAddingWallet(true)
      await addVestingWallet(
        formData.walletAddress,
        Number(formData.capId),
        formData.amount,
        formData.note || 'Beneficiary'
      )
      // Clear form
      setFormData(prev => ({
        ...prev,
        walletAddress: '',
        capId: '',
        amount: '',
        note: '',
      }))
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsAddingWallet(false)
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

  const handleCleanupExpiredProposals = async () => {
    try {
      setError(null)
      setIsCleaning(true)
      await cleanupExpiredProposals(10)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsCleaning(false)
    }
  }

  const handleCreateUpgradeProposal = async () => {
    try {
      setIsUpgrading(true);
      setError(null);

      console.log(`Upgrade Address: ${formData.upgradeAddress}`);
      if (!ethers.isAddress(formData.upgradeAddress)) {
        throw new Error('Invalid Ethereum address');
      }

      const hash = await createProposal(
        PROPOSAL_TYPES.Upgrade,
        0, // id is not used for upgrade proposals
        formData.upgradeAddress,
        ethers.ZeroHash,
        '0',
        ethers.ZeroAddress
      );
      console.log('Upgrade proposal created with transaction hash:', hash);

      setFormData(prev => ({ ...prev, upgradeAddress: '' })); // Reset the input field
    } catch (error: any) {
      console.error(error);
      setError(error.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCheckRole = async () => {
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

  const formatTransactionLimit = (limit: bigint | null) => {
    if (!limit) return '';
    try {
      const limitStr = limit.toString();
      const length = limitStr.length;
      
      if (length <= 18) {
        const padded = limitStr.padStart(18, '0');
        const decimal = padded.slice(0, -18) || '0';
        const fraction = padded.slice(-18).replace(/0+$/, '');
        return fraction ? `${decimal}.${fraction}` : decimal;
      } else {
        const decimal = limitStr.slice(0, length - 18);
        const fraction = limitStr.slice(length - 18).replace(/0+$/, '');
        return fraction ? `${decimal}.${fraction}` : decimal;
      }
    } catch (error) {
      console.error('Error formatting transaction limit:', error);
      return '';
    }
  };

  const parseTransactionLimit = (value: string): bigint => {
    try {
      return ethers.parseEther(value);
    } catch (error) {
      console.error('Error parsing transaction limit:', error);
      return BigInt(0);
    }
  };

  const roleOptions = [
    { label: 'Admin', value: 'ADMIN_ROLE' },
    { label: 'Contract Operator', value: 'CONTRACT_OPERATOR_ROLE' },
    { label: 'Bridge Operator', value: 'BRIDGE_OPERATOR_ROLE' },
    { label: 'Default Admin', value: 'DEFAULT_ADMIN_ROLE' },
  ];

  const handleSetTransactionLimit = async () => {
    try {
      setError(null)
      setIsSettingLimit(true)
      await handleSetRoleTransactionLimit(formData.role, formData.transactionLimit)
      // Clear form
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
      // Clear form
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

  const handleTransferBackToStorage = async () => {
    try {
      setIsTransferringToStorage(true);
      setError(null);

      if (!formData.amount) {
        throw new Error('Please enter an amount to transfer');
      }

      const hash = await transferBackToStorage(formData.amount);
      console.log('Transfer back to storage transaction hash:', hash);

      // Reset form
      setFormData(prev => ({
        ...prev,
        amount: ''
      }));
    } catch (err) {
      console.error('Error transferring tokens back to storage:', err);
      setError(err instanceof Error ? err.message : 'Failed to transfer tokens back to storage');
    } finally {
      setIsTransferringToStorage(false);
    }
  };

  const renderVestingCapTable = () => {
    if (isLoading) {
      return <CircularProgress />
    }

    if (!vestingCapTable || vestingCapTable.length === 0) {
      return <Alert severity="info">No airdrop vesting caps found</Alert>
    }

    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Cap ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Total Allocation (FIL)</TableCell>
              <TableCell>Cliff (days)</TableCell>
              <TableCell>Vesting Term (months)</TableCell>
              <TableCell>Initial Release</TableCell>
              <TableCell>Wallets</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vestingCapTable.map((cap) => (
              <TableRow key={cap.capId}>
                <TableCell>{cap.capId}</TableCell>
                <TableCell>{ethers.decodeBytes32String(cap.name)}</TableCell>
                <TableCell>{Number(ethers.formatEther(cap.totalAllocation.toString())).toLocaleString()}</TableCell>
                <TableCell>{(Number(cap.cliff) / 86400).toFixed(2)}</TableCell>
                <TableCell>{(Number(cap.vestingTerm) / (30 * 86400)).toFixed(2)}</TableCell>
                <TableCell>{Number(cap.initialRelease).toFixed(0)}%</TableCell>
                <TableCell>{cap.wallets.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  const getProposalType = (type: number): string => {
    switch (type) {
      case PROPOSAL_TYPES.NA:
        return 'N/A';
      case PROPOSAL_TYPES.AddRole:
        return 'Add Role';
      case PROPOSAL_TYPES.RemoveRole:
        return 'Remove Role';
      case PROPOSAL_TYPES.Upgrade:
        return 'Upgrade';
      case PROPOSAL_TYPES.Recovery:
        return 'Recovery';
      case PROPOSAL_TYPES.AddWhitelist:
        return 'Add Whitelist';
      case PROPOSAL_TYPES.RemoveWhitelist:
        return 'Remove Whitelist';
      case PROPOSAL_TYPES.AddDistributionWallets:
        return 'Add Distribution Wallets';
      case PROPOSAL_TYPES.RemoveDistributionWallet:
        return 'Remove Distribution Wallet';
      case PROPOSAL_TYPES.AddToBlacklist:
        return 'Add to Blacklist';
      case PROPOSAL_TYPES.RemoveFromBlacklist:
        return 'Remove from Blacklist';
      case PROPOSAL_TYPES.ChangeTreasuryFee:
        return 'Change Treasury Fee';
      default:
        return `Unknown (${type})`;
    }
  };

  const formatDateTime = (timestamp: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString();
  };

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
        Airdrop Contract Administration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Accordion defaultExpanded sx={{ mt: 4 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Create Vesting Cap</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Cap ID"
                type="number"
                value={formData.capId}
                onChange={(e) => setFormData({ ...formData, capId: e.target.value })}
                helperText="Unique identifier for the cap"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Name"
                value={formData.capName}
                onChange={(e) => setFormData({ ...formData, capName: e.target.value })}
                helperText="Name for the vesting cap"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Start Date"
                type="number"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                helperText="Unix timestamp in seconds (optional, defaults to 30 years from now if TGE initiated)"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Total Allocation"
                type="number"
                value={formData.totalAllocation}
                onChange={(e) => setFormData({ ...formData, totalAllocation: e.target.value })}
                helperText="Total token allocation for this cap"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Cliff Period (Days)"
                type="number"
                value={formData.cliff}
                onChange={(e) => setFormData({ ...formData, cliff: e.target.value })}
                helperText="Cliff period in days"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Vesting Term (Months)"
                type="number"
                value={formData.vestingTerm}
                onChange={(e) => setFormData({ ...formData, vestingTerm: e.target.value })}
                helperText="Linear vesting duration in months"
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Vesting Plan (Months)"
                type="number"
                value={formData.vestingPlan}
                onChange={(e) => setFormData({ ...formData, vestingPlan: e.target.value })}
                helperText="Claim intervals in months (1 for monthly, 3 for quarterly)"
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Initial Release (%)"
                type="number"
                value={formData.initialRelease}
                onChange={(e) => setFormData({ ...formData, initialRelease: e.target.value })}
                helperText="Percentage released after cliff (0-100)"
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleCreateVestingCap}
              disabled={isCreatingCap}
            >
              {isCreatingCap ? <CircularProgress size={24} /> : 'Create Vesting Cap'}
            </Button>
          </Box>

          <Typography variant="subtitle1" gutterBottom>Current Vesting Caps</Typography>
          {isLoading ? (
            <CircularProgress />
          ) : !vestingCapTable || vestingCapTable.length === 0 ? (
            <Alert severity="info">No vesting caps found</Alert>
          ) : (
            renderVestingCapTable()
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded sx={{ mt: 4 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">TGE</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Alert severity={tgeStatus.isInitiated ? "success" : "info"}>
                {tgeStatus.isInitiated ? (
                  <>
                    <Typography variant="subtitle1">TGE has been initiated</Typography>
                    <Typography variant="body2">
                      Timestamp: {new Date(tgeStatus.timestamp! * 1000).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      Total Required Tokens: {ethers.formatEther(tgeStatus.totalTokens!)} FULA
                    </Typography>
                  </>
                ) : (
                  <Typography>
                    TGE has not been initiated yet. Initiating TGE will start the vesting and distribution of airdrop tokens.
                    Make sure all vesting caps are properly configured before initiating TGE.
                  </Typography>
                )}
              </Alert>
            </Grid>

            {!tgeStatus.isInitiated && (
              <Grid size={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={initiateTGE}
                    disabled={isSettingTGE}
                    startIcon={isSettingTGE ? <CircularProgress size={20} /> : null}
                  >
                    {isSettingTGE ? 'Initiating TGE...' : 'Initiate TGE'}
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
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
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion>
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
                    setFormData(prev => ({ ...prev, upgradeAddress: '' })); // Clear the input after success
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
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded sx={{ mt: 4 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Vesting Wallets</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Wallet Address"
                value={formData.walletAddress}
                onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value.trim() })}
                helperText="Beneficiary wallet address"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Cap ID"
                type="number"
                value={formData.capId}
                onChange={(e) => setFormData({ ...formData, capId: e.target.value })}
                helperText="ID of the vesting cap to use"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Amount (FULA)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                helperText="Amount of tokens to vest in FULA"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                helperText="Optional note for the beneficiary"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, mb: 4 }}>
            <Button
              variant="contained"
              onClick={handleAddVestingWallet}
              disabled={isAddingWallet}
              startIcon={isAddingWallet ? <CircularProgress size={20} /> : null}
            >
              {isAddingWallet ? 'Creating Proposal...' : 'Add Vesting Wallet'}
            </Button>
          </Box>

          <Typography variant="subtitle1" gutterBottom>Current Vesting Wallets</Typography>
          {isLoading ? (
            <CircularProgress />
          ) : !vestingCapTable || vestingCapTable.length === 0 ? (
            <Alert severity="info">No vesting wallets found</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Address</TableCell>
                    <TableCell>Cap ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Amount (FULA)</TableCell>
                    <TableCell>Claimed (FULA)</TableCell>
                    <TableCell>Remaining (FULA)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vestingCapTable.flatMap(cap => 
                    cap.walletDetails?.map((wallet: any) => (
                      <TableRow key={`${wallet.address}-${cap.capId}`}>
                        <TableCell>{wallet.address}</TableCell>
                        <TableCell>{cap.capId}</TableCell>
                        <TableCell>
                          {wallet.name ? ethers.decodeBytes32String(wallet.name) : '-'}
                        </TableCell>
                        <TableCell>{ethers.formatEther(wallet.amount || '0')}</TableCell>
                        <TableCell>{ethers.formatEther(wallet.claimed || '0')}</TableCell>
                        <TableCell>
                          {ethers.formatEther(
                            BigInt(wallet.amount || '0') - BigInt(wallet.claimed || '0')
                          )}
                        </TableCell>
                      </TableRow>
                    )) || []
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Proposals */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Pending Proposals</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Approvals</TableCell>
                  <TableCell>Expiry</TableCell>
                  <TableCell>Execution Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {airdropProposals?.map((proposal) => {
                  const now = Math.floor(Date.now() / 1000);
                  const isExpired = proposal?.config?.expiryTime ? 
                    Number(proposal.config.expiryTime) < now : false;
                  const canExecute = proposal?.config?.executionTime && 
                    proposal?.config?.status !== undefined && 
                    proposal?.config?.approvals !== undefined ? 
                    Number(proposal.config.executionTime) <= now && 
                    proposal.config.status === 0 && 
                    Number(proposal.config.approvals) >= 2 : false;
                  
                  if (!proposal || !proposal.config) {
                    console.error('Invalid proposal data:', proposal);
                    return null;
                  }

                  return (
                    <TableRow key={proposal.proposalId}>
                      <TableCell>{proposal.proposalId || 'N/A'}</TableCell>
                      <TableCell>{getProposalType(proposal.proposalType || 0)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{proposal.target || 'N/A'}</TableCell>
                      <TableCell>{proposal.amount ? ethers.formatEther(proposal.amount) : '0'}</TableCell>
                      <TableCell>
                        {proposal.config.status === 1 ? 'Executed' : 
                         isExpired ? 'Expired' : 'Pending'}
                      </TableCell>
                      <TableCell>{proposal.config.approvals?.toString() || '0'}</TableCell>
                      <TableCell>
                        {proposal.config.expiryTime ? 
                          formatDateTime(Number(proposal.config.expiryTime)) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {proposal.config.executionTime ? 
                          formatDateTime(Number(proposal.config.executionTime)) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {proposal.config.status !== 1 && !isExpired && (
                          <>
                            <Button
                              variant="outlined"
                              onClick={() => handleApproveProposal(proposal.proposalId)}
                              disabled={isApproving}
                              sx={{ mr: 1 }}
                            >
                              {isApproving ? <CircularProgress size={24} /> : 'Approve'}
                            </Button>
                            {canExecute && (
                              <Button
                                variant="contained"
                                onClick={() => handleExecuteProposal(proposal.proposalId)}
                                disabled={isExecuting}
                              >
                                {isExecuting ? <CircularProgress size={24} /> : 'Execute'}
                              </Button>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Button
            variant="contained"
            onClick={handleCleanupExpiredProposals}
            disabled={isCleaning}
            sx={{ mt: 2 }}
          >
            {isCleaning ? <CircularProgress size={24} /> : 'Cleanup Expired Proposals'}
          </Button>
        </AccordionDetails>
      </Accordion>

      <Accordion>
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
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  margin="normal"
                >
                  {roleOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Transaction Limit (ETH)"
                  type="number"
                  value={formData.transactionLimit || ''}
                  onChange={(e) => setFormData({ ...formData, transactionLimit: e.target.value })}
                  margin="normal"
                  inputProps={{
                    step: "0.000000000000000001"
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
                  onChange={(e) => setFormData({ ...formData, quorum: e.target.value })}
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
                  onClick={handleCheckRole}
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
                        console.log('Setting form data with:', { 
                          transactionLimit: formattedLimit,
                          quorum: result.quorum.toString()
                        });
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

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Transfer Tokens Back to Storage</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This function transfers tokens from this contract back to the StorageToken contract.
            Only ADMIN_ROLE can perform this action.
          </Typography>
            
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Amount (in tokens)"
                type="text"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g., 1000"
                helperText="Enter the amount of tokens to transfer back to the storage contract"
              />
            </Grid>
            <Grid size={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleTransferBackToStorage}
                disabled={isTransferringToStorage || !formData.amount}
                startIcon={isTransferringToStorage && <CircularProgress size={20} color="inherit" />}
                fullWidth
              >
                {isTransferringToStorage ? 'Processing...' : 'Transfer Tokens to Storage'}
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
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
