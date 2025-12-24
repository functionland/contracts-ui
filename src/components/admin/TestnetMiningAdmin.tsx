

import { useState, useEffect } from 'react'
import { useConnection } from 'wagmi'
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
import { useAdminContract } from '../../hooks/useAdminContract'
import { CONTRACT_TYPES, PROPOSAL_TYPES, ROLES, ROLE_NAMES } from '../../config/constants'

export function TestnetMiningAdmin() {
  const { isConnected } = useConnection()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    capId: '',
    capName: '',
    startDate: '',
    capTotalAllocation: '',
    cliff: '',
    vestingTerm: '',
    vestingPlan: '',
    initialRelease: '',
    maxRewardsPerMonth: '',
    ratio: '',
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
    isLoading,
    error: contractError,
    createCap,
    addVestingWallet,
    handleSetRoleTransactionLimit,
    handleSetRoleQuorum,
    vestingCapTable,
    updateSubstrateRewards,
    getSubstrateRewards,
    addSubstrateAddress,
    batchAddSubstrateAddresses,
    batchRemoveAddresses,
    getSubstrateAddressMappings,
    testnetMiningProposals,
    approveProposal,
    executeProposal,
    tgeStatus,
    initiateTGE,
    checkRoleConfig,
    upgradeContract,
    createProposal,
    cleanupExpiredProposals,
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

  const handleCreateCap = async () => {
    try {
      setIsCreatingCap(true)
      setError(null)

      const {
        capId,
        capName,
        startDate,
        capTotalAllocation,
        cliff,
        vestingTerm,
        vestingPlan,
        initialRelease,
        maxRewardsPerMonth,
        ratio,
      } = formData

      if (!capId || !capName || !startDate || !capTotalAllocation || !cliff || !vestingTerm || !vestingPlan || !initialRelease || !maxRewardsPerMonth || !ratio) {
        throw new Error('Please fill in all fields')
      }

      // Check if vestingPlan is >= vestingTerm and show warning instead of auto-adjusting
      if (Number(vestingPlan) >= Number(vestingTerm)) {
        throw new Error('Vesting Plan must be less than Vesting Term. Please adjust your values.')
      }

      await createCap(
        capId,
        capName,
        startDate,
        capTotalAllocation,
        cliff,
        vestingTerm,
        vestingPlan,
        initialRelease,
        maxRewardsPerMonth,
        ratio
      )

      setFormData({
        ...formData,
        capId: '',
        capName: '',
        startDate: '',
        capTotalAllocation: '',
        cliff: '',
        vestingTerm: '',
        vestingPlan: '',
        initialRelease: '',
        maxRewardsPerMonth: '',
        ratio: '',
        role: '',
        transactionLimit: '',
        quorum: '',
      })
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsCreatingCap(false)
    }
  }

  const renderVestingCapTable = () => {
    if (isLoading) {
      return <CircularProgress />
    }

    if (!vestingCapTable || vestingCapTable.length === 0) {
      return <Alert severity="info">No vesting caps found</Alert>
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
              <TableCell>Vesting Plan (months)</TableCell>
              <TableCell>Initial Release</TableCell>
              <TableCell>Max Rewards/Month</TableCell>
              <TableCell>Ratio</TableCell>
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
                <TableCell>{(Number(cap.vestingPlan) / (30 * 86400)).toFixed(2)}</TableCell>
                <TableCell>{Number(cap.initialRelease).toFixed(0)}%</TableCell>
                <TableCell>{Number(ethers.formatEther(cap.maxRewardsPerMonth?.toString() || '0')).toLocaleString()}</TableCell>
                <TableCell>{Number(cap.ratio || 0).toString()}</TableCell>
                <TableCell>{cap.wallets?.length || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
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
      await handleSetRoleQuorum(formData.role, formData.quorum);
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

  // Substrate rewards management
  const [substrateFormData, setSubstrateFormData] = useState({
    ethereumAddress: '',
    substrateAddress: '',
    rewardAmount: '',
    batchEthereumAddresses: '',
    batchSubstrateAddresses: '',
    removeAddresses: '',
  });
  const [isProcessingSubstrate, setIsProcessingSubstrate] = useState(false);
  const [substrateError, setSubstrateError] = useState<string | null>(null);
  const [substrateSuccess, setSubstrateSuccess] = useState<string | null>(null);
  const [substrateRewardsInfo, setSubstrateRewardsInfo] = useState<{
    lastUpdate: bigint;
    amount: bigint;
  } | null>(null);
  const [substrateMappings, setSubstrateMappings] = useState<{
    ethereumAddress: string;
    substrateAddress: string;
    rewardAmount: bigint;
  }[]>([]);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);

  const handleSubstrateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSubstrateFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const loadSubstrateAddressMappings = async () => {
    try {
      setIsLoadingMappings(true);
      setSubstrateError(null);
      
      const mappings = await getSubstrateAddressMappings();
      setSubstrateMappings(mappings);
      
    } catch (error: any) {
      setSubstrateError(error.message);
      console.error('Error loading substrate address mappings:', error);
    } finally {
      setIsLoadingMappings(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadSubstrateAddressMappings();
    }
  }, [isConnected]);

  const refreshSubstrateMappings = async () => {
    await loadSubstrateAddressMappings();
  };

  const handleUpdateSubstrateRewards = async () => {
    try {
      setSubstrateError(null);
      setSubstrateSuccess(null);
      setIsProcessingSubstrate(true);
      
      if (!ethers.isAddress(substrateFormData.ethereumAddress)) {
        throw new Error('Invalid Ethereum address');
      }
      
      if (!substrateFormData.rewardAmount || parseFloat(substrateFormData.rewardAmount) <= 0) {
        throw new Error('Reward amount must be greater than 0');
      }
      
      await updateSubstrateRewards(substrateFormData.ethereumAddress, substrateFormData.rewardAmount);
      setSubstrateSuccess('Substrate rewards updated successfully');
      
      // Clear form
      setSubstrateFormData(prev => ({
        ...prev,
        ethereumAddress: '',
        rewardAmount: '',
      }));
      
      // Refresh mappings
      await refreshSubstrateMappings();
    } catch (error: any) {
      setSubstrateError(error.message);
    } finally {
      setIsProcessingSubstrate(false);
    }
  };

  const handleGetSubstrateRewards = async () => {
    try {
      setSubstrateError(null);
      setSubstrateSuccess(null);
      setIsProcessingSubstrate(true);
      
      if (!ethers.isAddress(substrateFormData.ethereumAddress)) {
        throw new Error('Invalid Ethereum address');
      }
      
      const rewards = await getSubstrateRewards(substrateFormData.ethereumAddress);
      setSubstrateRewardsInfo(rewards);
      setSubstrateSuccess('Substrate rewards retrieved successfully');
    } catch (error: any) {
      setSubstrateError(error.message);
    } finally {
      setIsProcessingSubstrate(false);
    }
  };

  const handleAddSubstrateAddress = async () => {
    try {
      setSubstrateError(null);
      setSubstrateSuccess(null);
      setIsProcessingSubstrate(true);
      
      if (!ethers.isAddress(substrateFormData.ethereumAddress)) {
        throw new Error('Invalid Ethereum address');
      }
      
      if (!substrateFormData.substrateAddress) {
        throw new Error('Substrate address cannot be empty');
      }
      
      await addSubstrateAddress(substrateFormData.ethereumAddress, substrateFormData.substrateAddress);
      setSubstrateSuccess('Substrate address mapping added successfully');
      
      // Clear form
      setSubstrateFormData(prev => ({
        ...prev,
        ethereumAddress: '',
        substrateAddress: '',
      }));
      
      // Refresh mappings
      await refreshSubstrateMappings();
    } catch (error: any) {
      setSubstrateError(error.message);
    } finally {
      setIsProcessingSubstrate(false);
    }
  };

  const handleBatchAddSubstrateAddresses = async () => {
    try {
      setSubstrateError(null);
      setSubstrateSuccess(null);
      setIsProcessingSubstrate(true);
      
      const ethereumAddresses = substrateFormData.batchEthereumAddresses
        .split('\n')
        .map(addr => addr.trim())
        .filter(addr => addr);
      
      const substrateAddresses = substrateFormData.batchSubstrateAddresses
        .split('\n')
        .map(addr => addr.trim())
        .filter(addr => addr);
      
      if (ethereumAddresses.length !== substrateAddresses.length) {
        throw new Error('Number of Ethereum addresses must match number of Substrate addresses');
      }
      
      if (ethereumAddresses.length === 0) {
        throw new Error('No addresses provided');
      }
      
      if (ethereumAddresses.length > 1000) {
        throw new Error('Batch too large (max 1000 addresses)');
      }
      
      // Validate all Ethereum addresses
      for (const addr of ethereumAddresses) {
        if (!ethers.isAddress(addr)) {
          throw new Error(`Invalid Ethereum address: ${addr}`);
        }
      }
      
      await batchAddSubstrateAddresses(ethereumAddresses, substrateAddresses);
      setSubstrateSuccess(`Successfully added ${ethereumAddresses.length} address mappings`);
      
      // Clear form
      setSubstrateFormData(prev => ({
        ...prev,
        batchEthereumAddresses: '',
        batchSubstrateAddresses: '',
      }));
      
      // Refresh mappings
      await refreshSubstrateMappings();
    } catch (error: any) {
      setSubstrateError(error.message);
    } finally {
      setIsProcessingSubstrate(false);
    }
  };

  const handleBatchRemoveAddresses = async () => {
    try {
      setSubstrateError(null);
      setSubstrateSuccess(null);
      setIsProcessingSubstrate(true);
      
      const ethereumAddresses = substrateFormData.removeAddresses
        .split('\n')
        .map(addr => addr.trim())
        .filter(addr => addr);
      
      if (ethereumAddresses.length === 0) {
        throw new Error('No addresses provided');
      }
      
      if (ethereumAddresses.length > 1000) {
        throw new Error('Batch too large (max 1000 addresses)');
      }
      
      // Validate all Ethereum addresses
      for (const addr of ethereumAddresses) {
        if (!ethers.isAddress(addr)) {
          throw new Error(`Invalid Ethereum address: ${addr}`);
        }
      }
      
      await batchRemoveAddresses(ethereumAddresses);
      setSubstrateSuccess(`Successfully removed ${ethereumAddresses.length} address mappings`);
      
      // Clear form
      setSubstrateFormData(prev => ({
        ...prev,
        removeAddresses: '',
      }));
      
      // Refresh mappings
      await refreshSubstrateMappings();
    } catch (error: any) {
      setSubstrateError(error.message);
    } finally {
      setIsProcessingSubstrate(false);
    }
  };

  const handleRemoveWallet = async (walletAddress: string, capId: number) => {
    try {
      setError(null)
      setIsAddingWallet(true) // Reuse the loading state
      
      await createProposal(
        PROPOSAL_TYPES.RemoveDistributionWallet, // Type 8 for RemoveDistributionWallet
        capId, // The cap ID
        walletAddress, // The wallet address to remove
        ethers.ZeroHash, // Role is not used for removal
        '0', // Amount must be 0 for removal
        ethers.ZeroAddress // Token address not used
      )
      
      // Show success message
      setError('Wallet removal proposal created successfully. Please check the proposals section to approve and execute it.')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsAddingWallet(false)
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
        Testnet Mining Contract Administration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Accordion defaultExpanded sx={{ mt: 4 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Create Mining Cap</Typography>
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
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Name"
                value={formData.capName}
                onChange={(e) => setFormData({ ...formData, capName: e.target.value })}
                helperText="Name for the mining cap"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Start Date"
                type="number"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                helperText="Unix timestamp in seconds"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Total Allocation"
                type="number"
                value={formData.capTotalAllocation}
                onChange={(e) => setFormData({ ...formData, capTotalAllocation: e.target.value })}
                helperText="Total allocation for this cap"
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
                helperText="Percentage released after cliff"
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Max Rewards Per Month"
                type="number"
                value={formData.maxRewardsPerMonth}
                onChange={(e) => setFormData({ ...formData, maxRewardsPerMonth: e.target.value })}
                helperText="Maximum rewards per month"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Ratio"
                type="number"
                value={formData.ratio}
                onChange={(e) => setFormData({ ...formData, ratio: e.target.value })}
                helperText="Ratio value"
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleCreateCap}
              disabled={isCreatingCap}
            >
              {isCreatingCap ? <CircularProgress size={24} /> : 'Create Cap'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded sx={{ mt: 4 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">TGE</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Alert severity={tgeStatus?.isInitiated ? "success" : "info"}>
                {tgeStatus?.isInitiated ? (
                  <>
                    <Typography variant="subtitle1">TGE has been initiated</Typography>
                    <Typography variant="body2">
                      Timestamp: {new Date(Number(tgeStatus.timestamp) * 1000).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      Total Required Tokens: {ethers.formatEther(tgeStatus.totalTokens)} FULA
                    </Typography>
                  </>
                ) : (
                  <Typography>
                    TGE has not been initiated yet. Initiating TGE will start the vesting and distribution of testnet mining tokens.
                    Make sure all vesting caps are properly configured before initiating TGE.
                  </Typography>
                )}
              </Alert>
            </Grid>

            {!tgeStatus?.isInitiated && (
              <Grid size={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      try {
                        setError(null);
                        setIsSettingTGE(true);
                        await initiateTGE();
                      } catch (error: any) {
                        console.error('Error initiating TGE:', error);
                        setError(error.message);
                      } finally {
                        setIsSettingTGE(false);
                      }
                    }}
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
                    <TableCell>Actions</TableCell>
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
                        <TableCell>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleRemoveWallet(wallet.address, cap.capId)}
                            disabled={isAddingWallet}
                          >
                            Remove
                          </Button>
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
                onChange={(e) => setFormData({ ...formData, upgradeAddress: e.target.value.trim() })}
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
                onChange={(e) => setFormData({ ...formData, upgradeAddress: e.target.value.trim() })}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, transactionLimit: e.target.value }))}
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
                    // await emergencyAction(1);
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
                    // await emergencyAction(2);
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
                {testnetMiningProposals?.map((proposal) => {
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
          <Typography variant="h6">Current Vesting Caps</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {renderVestingCapTable()}
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Substrate Rewards Management</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Ethereum Address"
                value={substrateFormData.ethereumAddress}
                onChange={handleSubstrateInputChange}
                name="ethereumAddress"
                helperText="Ethereum address to manage substrate rewards"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Reward Amount"
                type="number"
                value={substrateFormData.rewardAmount}
                onChange={handleSubstrateInputChange}
                name="rewardAmount"
                helperText="Reward amount in FULA"
              />
            </Grid>
            <Grid size={12}>
              <Button
                variant="contained"
                onClick={handleUpdateSubstrateRewards}
                disabled={isProcessingSubstrate}
              >
                {isProcessingSubstrate ? <CircularProgress size={24} /> : 'Update Substrate Rewards'}
              </Button>
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Ethereum Address"
                value={substrateFormData.ethereumAddress}
                onChange={handleSubstrateInputChange}
                name="ethereumAddress"
                helperText="Ethereum address to retrieve substrate rewards"
              />
            </Grid>
            <Grid size={12}>
              <Button
                variant="contained"
                onClick={handleGetSubstrateRewards}
                disabled={isProcessingSubstrate}
              >
                {isProcessingSubstrate ? <CircularProgress size={24} /> : 'Get Substrate Rewards'}
              </Button>
            </Grid>
          </Grid>
          {substrateRewardsInfo && (
            <Grid size={{ xs: 12, md: 6 }} sx={{ mt: 2 }}>
              <Alert severity="info">
                <Typography variant="subtitle2">Substrate Rewards:</Typography>
                <Typography>
                  Last Update: {formatDateTime(Number(substrateRewardsInfo.lastUpdate))}
                </Typography>
                <Typography>
                  Amount: {ethers.formatEther(substrateRewardsInfo.amount)} FULA
                </Typography>
              </Alert>
            </Grid>
          )}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Ethereum Address"
                value={substrateFormData.ethereumAddress}
                onChange={handleSubstrateInputChange}
                name="ethereumAddress"
                helperText="Ethereum address to add substrate address mapping"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Substrate Address"
                value={substrateFormData.substrateAddress}
                onChange={handleSubstrateInputChange}
                name="substrateAddress"
                helperText="Substrate address to map to Ethereum address"
              />
            </Grid>
            <Grid size={12}>
              <Button
                variant="contained"
                onClick={handleAddSubstrateAddress}
                disabled={isProcessingSubstrate}
              >
                {isProcessingSubstrate ? <CircularProgress size={24} /> : 'Add Substrate Address Mapping'}
              </Button>
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Batch Ethereum Addresses"
                multiline
                rows={4}
                value={substrateFormData.batchEthereumAddresses}
                onChange={handleSubstrateInputChange}
                name="batchEthereumAddresses"
                helperText="List of Ethereum addresses to add substrate address mappings (one per line)"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Batch Substrate Addresses"
                multiline
                rows={4}
                value={substrateFormData.batchSubstrateAddresses}
                onChange={handleSubstrateInputChange}
                name="batchSubstrateAddresses"
                helperText="List of Substrate addresses to map to Ethereum addresses (one per line)"
              />
            </Grid>
            <Grid size={12}>
              <Button
                variant="contained"
                onClick={handleBatchAddSubstrateAddresses}
                disabled={isProcessingSubstrate}
              >
                {isProcessingSubstrate ? <CircularProgress size={24} /> : 'Batch Add Substrate Address Mappings'}
              </Button>
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Ethereum Addresses to Remove"
                multiline
                rows={4}
                value={substrateFormData.removeAddresses}
                onChange={handleSubstrateInputChange}
                name="removeAddresses"
                helperText="List of Ethereum addresses to remove substrate address mappings (one per line)"
              />
            </Grid>
            <Grid size={12}>
              <Button
                variant="contained"
                onClick={handleBatchRemoveAddresses}
                disabled={isProcessingSubstrate}
              >
                {isProcessingSubstrate ? <CircularProgress size={24} /> : 'Batch Remove Substrate Address Mappings'}
              </Button>
            </Grid>
          </Grid>
          {substrateError && (
            <Grid size={{ xs: 12, md: 6 }} sx={{ mt: 2 }}>
              <Alert severity="error">
                {substrateError}
              </Alert>
            </Grid>
          )}
          {substrateSuccess && (
            <Grid size={{ xs: 12, md: 6 }} sx={{ mt: 2 }}>
              <Alert severity="success">
                {substrateSuccess}
              </Alert>
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 6 }} sx={{ mt: 2 }}>
            <Typography variant="h6">Substrate Address Mappings</Typography>
            {isLoadingMappings ? (
              <CircularProgress />
            ) : !substrateMappings || substrateMappings.length === 0 ? (
              <Alert severity="info">No substrate address mappings found</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ethereum Address</TableCell>
                      <TableCell>Substrate Address</TableCell>
                      <TableCell>Reward Amount (FULA)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {substrateMappings.map((mapping, index) => (
                      <TableRow key={index}>
                        <TableCell>{mapping.ethereumAddress}</TableCell>
                        <TableCell>{mapping.substrateAddress}</TableCell>
                        <TableCell>{ethers.formatEther(mapping.rewardAmount.toString())}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}
