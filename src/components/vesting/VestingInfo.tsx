

import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid, 
  Divider,
  Stack,
  useTheme
} from '@mui/material'
import { ClaimButton } from './ClaimButton'
import { formatEther } from 'viem'
import { useContractContext } from '@/contexts/ContractContext';
import { CONTRACT_TYPES } from '@/config/constants';
import type { VestingData } from '@/types/vesting'
import { useEffect, useState } from 'react'
import { useReadContract, useAccount } from 'wagmi'
import { CONTRACT_CONFIG } from '@/config/contracts'

interface VestingInfoProps {
  vestingData: VestingData
}

export function VestingInfo({ vestingData }: VestingInfoProps) {
  if (!vestingData || typeof vestingData !== 'object') return null;
  
  // Convert BigInt values to strings for logging
  const loggableData = Object.fromEntries(
    Object.entries(vestingData).map(([key, value]) => [
      key,
      typeof value === 'bigint' ? value.toString() : value
    ])
  );
  
  console.log("Vesting Data:");
  console.log(JSON.stringify(loggableData, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));
  
  const theme = useTheme();
  const { activeContract } = useContractContext();
  const { chainId } = useAccount();
  console.log({activeContract, chainId});
  const isTestnetMining = activeContract === CONTRACT_TYPES.TESTNET_MINING;
  const [ratio, setRatio] = useState<number | null>(null);
  const [maxRewardsPerMonth, setMaxRewardsPerMonth] = useState<bigint | null>(null);

  // Direct contract query for ratio when in testnet mining mode
  const { data: capData, isLoading: isCapDataLoading, isError: isCapDataError, error: capDataError } = useReadContract({
    address: chainId ? CONTRACT_CONFIG.address[CONTRACT_TYPES.TESTNET_MINING][chainId] : undefined,
    abi: [
      {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "vestingCaps",
        "outputs": [
          {"internalType": "uint256", "name": "totalAllocation", "type": "uint256"},
          {"internalType": "bytes32", "name": "name", "type": "bytes32"},
          {"internalType": "uint256", "name": "cliff", "type": "uint256"},
          {"internalType": "uint256", "name": "vestingTerm", "type": "uint256"},
          {"internalType": "uint256", "name": "vestingPlan", "type": "uint256"},
          {"internalType": "uint256", "name": "initialRelease", "type": "uint256"},
          {"internalType": "uint256", "name": "startDate", "type": "uint256"},
          {"internalType": "uint256", "name": "allocatedToWallets", "type": "uint256"},
          {"internalType": "uint256", "name": "maxRewardsPerMonth", "type": "uint256"},
          {"internalType": "uint256", "name": "ratio", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'vestingCaps',
    args: [BigInt(vestingData.capId)],
    query: {
      enabled: isTestnetMining && !!vestingData.capId && !!chainId
    }
  });

  // Debug the contract query conditions and results
  console.log("Contract query conditions:", { 
    isTestnetMining, 
    capId: vestingData.capId, 
    chainId,
    isEnabled: isTestnetMining && !!vestingData.capId && !!chainId,
    contractAddress: chainId ? CONTRACT_CONFIG.address[CONTRACT_TYPES.TESTNET_MINING][chainId] : undefined
  });
  
  console.log("Contract query status:", { 
    isCapDataLoading, 
    isCapDataError, 
    capDataError,
    hasData: !!capData
  });

  console.log("Direct capData log:", capData);
  
  // Log the maxRewardsPerMonth specifically
  if (capData && Array.isArray(capData) && capData.length >= 9) {
    console.log("Max Rewards Per Month from contract:", {
      raw: capData[8],
      formatted: formatEther(capData[8])
    });
  } else if (capData && typeof capData === 'object' && 'maxRewardsPerMonth' in capData) {
    console.log("Max Rewards Per Month from contract (named fields):", {
      raw: capData.maxRewardsPerMonth,
      formatted: formatEther(capData.maxRewardsPerMonth as bigint)
    });
  } else {
    console.log("Max Rewards Per Month not found in contract data");
  }

  useEffect(() => {
    console.log("Raw capData:", capData);
    
    // Try to get ratio and maxRewardsPerMonth from capData
    if (capData && Array.isArray(capData) && capData.length >= 10) {
      // For array format response
      setRatio(Number(capData[9]));
      setMaxRewardsPerMonth(capData[8] as bigint);
      console.log("Ratio from contract (array):", capData[9]);
      console.log("Max Rewards Per Month from contract (array):", capData[8]);
    } 
    else if (capData && typeof capData === 'object') {
      // For named fields format response (handle both possible response formats)
      // Check if we can access the data as an indexed object
      if ('9' in capData && '8' in capData) {
        setRatio(Number(capData['9']));
        setMaxRewardsPerMonth(capData['8'] as bigint);
        console.log("Ratio from contract (indexed object):", capData['9']);
        console.log("Max Rewards Per Month from contract (indexed object):", capData['8']);
      }
      // Check if we can access the data as named properties
      else if ('ratio' in capData && 'maxRewardsPerMonth' in capData) {
        // TypeScript doesn't know these properties exist, so we need to use type assertion
        const typedCapData = capData as { ratio: bigint, maxRewardsPerMonth: bigint };
        setRatio(Number(typedCapData.ratio));
        setMaxRewardsPerMonth(typedCapData.maxRewardsPerMonth);
        console.log("Ratio from contract (named fields):", typedCapData.ratio);
        console.log("Max Rewards Per Month from contract (named fields):", typedCapData.maxRewardsPerMonth);
      }
    }
  }, [capData]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * (isTestnetMining ? 1000 : 1)).toLocaleDateString();
  };

  // Convert seconds to days
  const secondsToDays = (seconds: number) => {
    return Math.round(seconds / (60 * 60 * 24));
  };

  // Convert seconds to months (approximate)
  const secondsToMonths = (seconds: number) => {
    return Math.round(seconds / (60 * 60 * 24 * 30));
  };

  const getClaimed = () => {
    console.log({isTestnetMining});
    if (isTestnetMining) {
      console.log({"no": vestingData.walletInfo?.claimed});
      let a = vestingData.walletInfo?.claimed || BigInt(0);
      console.log({"yes": a});
      return a;
    }
    return vestingData.claimed || BigInt(0);
  };

  const getClaimable = () => {
    if (isTestnetMining) {
      return vestingData.walletInfo?.claimableAmount || BigInt(0);
    }
    return vestingData.claimable || BigInt(0);
  };

  const getTotalAllocation = () => {
    if (isTestnetMining) {
      const substrateRewards = vestingData.substrateRewards.amount || BigInt(0);
      console.log("Substrate rewards:", substrateRewards.toString());
      
      if (ratio && ratio > 0) {
        // For 1:10 ratio, we need to divide by 10 to get the actual token amount
        // This is because 1 token = 10 substrate rewards
        const actualTokens = substrateRewards / BigInt(ratio);
        console.log(`Calculating with ratio ${ratio}: ${substrateRewards.toString()} / ${ratio} = ${actualTokens.toString()}`);
        return actualTokens;
      }
      
      // Fallback if ratio isn't loaded yet - assume 1:10 ratio
      const fallbackTokens = substrateRewards / BigInt(10);
      console.log(`Using fallback ratio 10: ${substrateRewards.toString()} / 10 = ${fallbackTokens.toString()}`);
      return fallbackTokens;
    }
    return vestingData.totalAllocation || BigInt(0);
  };

  const getErrorMessage = () => {
    if (isTestnetMining) {
      return vestingData.walletInfo?.errorMessage || '';
    }
    return vestingData.errorMessage || '';
  };

  const formatValue = (value: string | number | bigint | undefined) => {
    if (value === undefined) return 'N/A';
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return String(value);
  }

  const InfoItem = ({ label, value }: { label: string, value: string | number | bigint | undefined }) => (
    <Box sx={{ mb: 3 }}>
      <Typography color="text.secondary" variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
        {formatValue(value)}
      </Typography>
    </Box>
  )

  return (
    <Card elevation={2} sx={{ 
      borderRadius: 2,
      '&:hover': { 
        boxShadow: theme.shadows[4],
        transition: 'box-shadow 0.3s ease-in-out'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          {isTestnetMining ? 'Testnet Mining Rewards' : (vestingData.name || 'Unnamed Cap')}
        </Typography>
        <Divider sx={{ mb: 3 }} />
        {getErrorMessage() ? (
          <Typography color="error">{getErrorMessage()}</Typography>
        ) : (
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={3}>
              <InfoItem 
                label="Total Mining Rewards"
                value={`${formatEther(getTotalAllocation())} Tokens`}
              />
              <InfoItem 
                label={isTestnetMining ? "Claimed Rewards" : "Claimed Amount"}
                value={`${formatEther(getClaimed())} Tokens`}
              />
              <InfoItem 
                label={isTestnetMining ? "Available Rewards" : "Available to Claim"}
                value={`${formatEther(getClaimable())} Tokens`}
              />
            </Stack>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={3}>
              {!isTestnetMining && (
                <>
                  <InfoItem 
                    label="Vesting Start Date"
                    value={vestingData.startDate ? formatDate(Number(vestingData.startDate)) : undefined}
                  />
                  <InfoItem 
                    label="Initial Release"
                    value={vestingData.initialRelease !== undefined ? `${vestingData.initialRelease}%` : undefined}
                  />
                  <InfoItem 
                    label="Cliff Period"
                    value={vestingData.cliff !== undefined ? `${secondsToDays(Number(vestingData.cliff))} days` : undefined}
                  />
                  <InfoItem 
                    label="Vesting Term"
                    value={vestingData.vestingTerm !== undefined && vestingData.vestingPlan !== undefined ? 
                      `${secondsToMonths(Number(vestingData.vestingTerm))} months (every ${secondsToMonths(Number(vestingData.vestingPlan))} months)` : 
                      undefined}
                  />
                </>
              )}
              {isTestnetMining && vestingData.substrateRewards && (
                <>
                  <InfoItem 
                    label="Last Update"
                    value={vestingData.substrateRewards.lastUpdate ? 
                      new Date(Number(vestingData.substrateRewards.lastUpdate) * 1000).toLocaleString() : 
                      undefined}
                  />
                  <InfoItem 
                    label="Substrate Rewards"
                    value={vestingData.substrateRewards.amount ? 
                      `${formatEther(vestingData.substrateRewards.amount)} Tokens` : 
                      undefined}
                  />
                  <InfoItem 
                    label="Cap Ratio"
                    value={ratio !== null ? `1:${ratio}` : 'Loading...'}
                  />
                  <InfoItem 
                    label="Max Rewards Per Month"
                    value={maxRewardsPerMonth !== null ? 
                      `${formatEther(maxRewardsPerMonth)} Tokens` : 
                      'Loading...'}
                  />
                  <InfoItem 
                    label="Vesting Start Date"
                    value={vestingData.startDate ? formatDate(Number(vestingData.startDate)) : undefined}
                  />
                  <InfoItem 
                    label="Cliff Period"
                    value={vestingData.cliff !== undefined ? `${secondsToDays(Number(vestingData.cliff))} days` : undefined}
                  />
                </>
              )}
            </Stack>
          </Grid>
        </Grid>
        )}

        <Box sx={{ mt: 4 }}>
          <ClaimButton 
            capId={vestingData.capId}
            claimableAmount={getClaimable()}
          />
        </Box>
      </CardContent>
    </Card>
  )
}
