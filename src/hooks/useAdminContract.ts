

import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useConnection, usePublicClient, useSimulateContract, useWalletClient } from 'wagmi'
import { type Address, parseAbiItem, type PublicClient } from 'viem'
import { CONTRACT_CONFIG } from '@/config/contracts'
import { CONTRACT_TYPES } from '@/config/constants'
import { useContractContext } from '@/contexts/ContractContext'
import { ethers } from 'ethers'
import { PROPOSAL_TYPES } from '../config/constants';

type VestingWalletInfo = {
  capId: bigint;
  name: `0x${string}`; // bytes32
  amount: bigint;
  claimed: bigint;
}

// Helper function to get logs in chunks to avoid Alchemy free tier limits
const getLogsInChunks = async (
  publicClient: PublicClient,
  params: {
    address: Address;
    event: any;
    fromBlock?: bigint | 'earliest';
    toBlock?: bigint | 'latest';
  },
  chunkSize: number = 10
) => {
  const { address, event, fromBlock = 'earliest', toBlock = 'latest' } = params;
  
  try {
    // For small ranges or when using 'earliest'/'latest', try the full range first
    // This handles testnets and local networks that don't have the same restrictions
    return await publicClient.getLogs({
      address,
      event,
      fromBlock,
      toBlock
    });
  } catch (error: any) {
    // If we get a block range error, fall back to chunked approach
    if (error?.details?.includes('block range') || error?.code === -32600 || error?.message?.includes('Under the Free tier plan')) {
      console.log('Block range too large, using chunked approach...');
      
      // Get current block number
      const currentBlock = await publicClient.getBlockNumber();
      const startBlock = fromBlock === 'earliest' ? 0n : (fromBlock as bigint);
      const endBlock = toBlock === 'latest' ? currentBlock : (toBlock as bigint);
      
      const allEvents = [];
      // Use smaller chunk size for Alchemy free tier (max 10 blocks)
      const actualChunkSize = Math.min(chunkSize, 9); // Use 9 to be safe
      const chunkSizeBigInt = BigInt(actualChunkSize);
      
      console.log(`Fetching events in chunks of ${actualChunkSize} blocks from ${startBlock} to ${endBlock}`);
      
      for (let from = startBlock; from <= endBlock; from += chunkSizeBigInt) {
        const to = from + chunkSizeBigInt - 1n > endBlock ? endBlock : from + chunkSizeBigInt - 1n;
        
        try {
          const chunkEvents = await publicClient.getLogs({
            address,
            event,
            fromBlock: from,
            toBlock: to
          });
          allEvents.push(...chunkEvents);
          
          if (allEvents.length > 0 && allEvents.length % 100 === 0) {
            console.log(`Fetched ${allEvents.length} events so far...`);
          }
        } catch (chunkError: any) {
          console.warn(`Failed to fetch events for blocks ${from}-${to}:`, chunkError?.message || chunkError);
          // Continue with next chunk
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      console.log(`Completed chunked fetch: ${allEvents.length} total events`);
      return allEvents;
    }
    
    // Re-throw other errors
    throw error;
  }
};

// Helper function to get the bytes32 hash of a role string
const getRoleHash = (role: string): string => {
  if (role === 'ADMIN_ROLE') {
    return ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  } else if (role === 'CONTRACT_OPERATOR_ROLE') {
    return ethers.keccak256(ethers.toUtf8Bytes("CONTRACT_OPERATOR_ROLE"));
  } else if (role === 'BRIDGE_OPERATOR_ROLE') {
    return ethers.keccak256(ethers.toUtf8Bytes("BRIDGE_OPERATOR_ROLE"));
  } else if (role === 'POOL_ADMIN_ROLE') {
    return ethers.keccak256(ethers.toUtf8Bytes("POOL_ADMIN_ROLE"));
  } else if (role === 'DEFAULT_ADMIN_ROLE') {
    return ethers.ZeroHash;
  } else {
    throw new Error(`Invalid role: ${role}`);
  }
};

export function useAdminContract() {
  const { activeContract } = useContractContext()
  const { address: userAddress, chainId } = useConnection()
  const [error, setError] = useState<string | null>(null)
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const { data: walletClient } = useWalletClient()

  const getPublicClientOrThrow = () => {
    if (!publicClient) {
      throw new Error('Public client unavailable. Please connect your wallet and network.')
    }
    return publicClient
  }

  const getEventArgs = (event: any) => (event as any)?.args ?? {}

  const contractAddress = chainId 
    ? CONTRACT_CONFIG.address[activeContract][chainId] 
    : undefined

  const contractAbi = CONTRACT_CONFIG.abi[activeContract]

  console.log("Admin Contract - Active Contract:", activeContract)
  console.log("Admin Contract - Active ChainId:", chainId)
  console.log("Admin Contract - Contract Address:", contractAddress)

  const [vestingCapTable, setVestingCapTable] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchVestingCapTable = async () => {
      if (!contractAddress || !chainId || !publicClient || (activeContract !== CONTRACT_TYPES.VESTING && activeContract !== CONTRACT_TYPES.AIRDROP && activeContract !== CONTRACT_TYPES.TESTNET_MINING && activeContract !== CONTRACT_TYPES.STORAGE_POOL && activeContract !== CONTRACT_TYPES.REWARD_ENGINE)) {
        return
      }

      setIsLoading(true)
      try {
        console.log("Fetching vesting cap table...")
        // For vesting, we need to get the cap IDs one by one
        let index = 0
        const foundCapIds: bigint[] = []
        
        while (true) {
          try {
            const capId = await getPublicClientOrThrow().readContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'capIds',
              args: [BigInt(index)]
            }) as bigint
            
            console.log("Found cap ID:", capId.toString())
            foundCapIds.push(capId)
            index++
          } catch (error) {
            // When we hit an error, we've reached the end of the array
            break
          }
        }

        console.log("Found cap IDs:", foundCapIds.map(id => id.toString()))
        const capDetails = await Promise.all(foundCapIds.map(async (capId) => {
          const capTuple = await getPublicClientOrThrow().readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'vestingCaps',
            args: [capId]
          }) as any

          console.log("Cap tuple for debugging:", capTuple);

          const walletsInCap = await getPublicClientOrThrow().readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'getWalletsInCap',
            args: [capId]
          }) as Address[]

          console.log(`Cap ${capId}: Found ${walletsInCap.length} wallets:`, walletsInCap);

          // Fetch wallet details for each wallet in the cap
          const walletDetails = [];
          console.log('About to start fetching wallet details');
          
          for (let i=0; i<walletsInCap.length; i++) {
            let walletAddress: Address = walletsInCap[i];
            console.log(`Loop iteration ${i}: Processing wallet ${walletAddress}`);
            
            try {
              console.log(`Attempting to read contract for wallet ${walletAddress}`);
              // The vestingWallets mapping requires (address, capId) parameters
              const walletInfo = await getPublicClientOrThrow().readContract({
                address: contractAddress,
                abi: contractAbi,
                functionName: 'vestingWallets',
                args: [walletAddress, capId]
              }) as VestingWalletInfo;
              
              console.log(`Successfully got wallet info for ${walletAddress}:`, walletInfo);
              
              walletDetails.push({
                address: walletAddress,
                ...walletInfo
              });
            } catch (error) {
              console.error(`Error fetching wallet info for ${walletAddress}:`, error);
              // If index 0 fails, this wallet might not have any vesting info yet
              // We'll add it with default values
              walletDetails.push({
                address: walletAddress,
                capId: capId,
                name: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
                amount: 0n,
                claimed: 0n
              });
            }
          };

          console.log(`Cap ${capId}: Completed wallet details:`, walletDetails);

          return {
            capId: Number(capId),
            totalAllocation: capTuple[0],
            name: capTuple[1],
            cliff: Number(capTuple[2]),
            vestingTerm: Number(capTuple[3]),
            vestingPlan: Number(capTuple[4]),
            initialRelease: Number(capTuple[5]),
            startDate: Number(capTuple[6]),
            allocatedToWallets: capTuple[7],
            maxRewardsPerMonth: capTuple[8],
            ratio: capTuple[9],
            wallets: walletsInCap,
            walletDetails
          }
        }))

        console.log("Fetched cap details1:", capDetails)
        setVestingCapTable(capDetails)
      } catch (err) {
        console.error('Error fetching vesting cap table:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch vesting cap table')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVestingCapTable()
  }, [activeContract, contractAddress, chainId, publicClient])

  useEffect(() => {
    console.log("Admin contract type changed:", activeContract)
    // Force a refetch when contract type changes
    if (contractAddress && chainId) {
      // The useReadContract hooks will automatically refetch when their enabled state changes
      console.log("Ready to fetch admin data for contract:", activeContract)
    }
  }, [activeContract, contractAddress, chainId])

  // Read contract data
  const { data: tokenProposals } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getProposals',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.TOKEN
    }
  })

  const { data: vestingProposals } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getProposals',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.VESTING
    }
  })

  const { data: airdropProposals } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getProposals',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.AIRDROP
    }
  })

  const { data: testnetMiningProposals } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getProposals',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.TESTNET_MINING
    }
  })

  const { data: vestingCaps } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getVestingCaps',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.VESTING
    }
  })

  const { data: vestingWallets } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getVestingWallets',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.VESTING
    }
  })

  const { data: airdropCaps } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getVestingCaps',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.AIRDROP
    }
  })

  const { data: airdropWallets } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getVestingWallets',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.AIRDROP
    }
  })

  const { data: testnetMiningCaps } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getVestingCaps',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.TESTNET_MINING
    }
  })

  const { data: testnetMiningWallets } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getVestingWallets',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.TESTNET_MINING
    }
  })

  const { data: storagePoolProposals } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getProposals',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.STORAGE_POOL
    }
  })

  const { data: rewardEngineProposals } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getProposals',
    query: {
      enabled: !!contractAddress && activeContract === CONTRACT_TYPES.REWARD_ENGINE
    }
  })

  type TimeConfig = {
    lastActivityTime: bigint;
    roleChangeTimeLock: bigint;
    whitelistLockTime: bigint;
  };

  type WhitelistedAddressInfo = {
    address: string;
    timeConfig: TimeConfig;
    operator: string;
  };

  const [whitelistInfo, setWhitelistInfo] = useState<WhitelistedAddressInfo[]>([]);
  const [whitelistedAddresses, setWhitelistedAddresses] = useState<string[]>([]);

  const isWhitelisted = async (address: string): Promise<boolean> => {
    if (!contractAddress || !publicClient) return false;

    try {
      const timeConfig = await getPublicClientOrThrow().readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'getTimeConfig',
        args: [address]
      }) as TimeConfig;

      // If whitelistLockTime is not 0, the address is whitelisted
      return timeConfig.whitelistLockTime > 0n;
    } catch (error) {
      console.error('Error checking whitelist status:', error);
      return false;
    }
  };

  const fetchWhitelistedAddresses = async () => {
    if (!contractAddress || !publicClient) {
      console.log('Missing requirements:', { contractAddress, hasPublicClient: !!publicClient });
      return [];
    }

    console.log('Fetching whitelisted addresses for contract:', contractAddress);

    try {
      // Get all WalletWhitelistedOp events
      console.log('Fetching WalletWhitelistedOp events...');
      const events = await getLogsInChunks(getPublicClientOrThrow(), {
        address: contractAddress,
        event: parseAbiItem('event WalletWhitelistedOp(address indexed target, address indexed operator, uint64 whitelistLockTime, uint8 operation)'),
        fromBlock: BigInt(0),
        toBlock: 'latest'
      });

      console.log('Found events:', events);

      // Process events to track added and removed wallets
      const whitelistedWallets = new Map<string, boolean>();

      for (const event of events) {
        const { target, operation } = getEventArgs(event);
        const address = target?.toLowerCase?.() || '';
        const opBigInt = operation ? BigInt(operation) : undefined;

        if (opBigInt === BigInt(1)) {
          // Wallet added
          whitelistedWallets.set(address, true);
        } else if (opBigInt === BigInt(2)) {
          // Wallet removed
          whitelistedWallets.delete(address);
        }
      }

      const addresses = Array.from(whitelistedWallets.keys());
      console.log('Current whitelisted addresses:', addresses);
      return addresses;
    } catch (error) {
      console.error('Error in fetchWhitelistedAddresses:', error);
      return [];
    }
  };

  useEffect(() => {
    if (contractAddress && chainId && activeContract === CONTRACT_TYPES.TOKEN) {
      fetchWhitelistedAddresses().then(addresses => {
        setWhitelistedAddresses(addresses || []);
      }).catch(console.error);
    }
  }, [contractAddress, chainId, activeContract]);

  const refetchWhitelistedAddresses = async () => {
    return await fetchWhitelistedAddresses();
  };

  // Token contract functions
  const addToWhitelist = async (address: string) => {
    // Debug logging
    console.log('Adding to whitelist:', {
      chainId,
      activeContract,
      contractAddress,
      userAddress,
      address
    });

    if (!contractAddress) throw new Error('Contract address not found');
    if (!userAddress) throw new Error('Please connect your wallet');

    try {
      // Check if the contract exists and has code
      const code = await getPublicClientOrThrow().getBytecode({ address: contractAddress });
      console.log('Contract bytecode:', code ? 'Found' : 'Not found');
      if (!code) throw new Error('Contract not found at the specified address');

      // Import proposal types from config
      console.log('Available proposal types:', PROPOSAL_TYPES);
      
      // Determine the correct proposal type to use
      // Try to use AddWhitelist (5), but if that fails, we might need a different value
      const proposalType = PROPOSAL_TYPES.AddWhitelist; // 5
      
      // Create the proposal
      const proposalArgs = [
        BigInt(proposalType), // AddWhitelist type as uint8
        0n, // id as uint40
        address as Address, // target address
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`, // role as bytes32
        0n, // amount as uint96
        '0x0000000000000000000000000000000000000000' as Address, // tokenAddress
      ];
      console.log('Creating proposal with args:', proposalArgs);

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'createProposal',
        args: proposalArgs,
        account: userAddress,
      });

      console.log('Proposal simulation successful');

      // If simulation succeeds, send the transaction
      const hash = await writeContractAsync(request as any);
      console.log('Proposal creation transaction hash:', hash);
      
      // Wait for one confirmation to ensure the transaction is mined
      const receipt = await getPublicClientOrThrow().waitForTransactionReceipt({ hash });
      console.log('Transaction receipt:', receipt);
      
      // Check if the transaction was successful
      if (receipt.status === 'success') {
        console.log('Proposal created successfully');
        return hash;
      } else {
        console.error('Transaction failed');
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Error in addToWhitelist:', error);
      throw error;
    }
  };

  const setTransactionLimit = async (newLimit: string) => {
    if (!contractAddress) throw new Error('Contract address not found')

    try {
      // First simulate the transaction
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'createProposal',
        args: [
          BigInt(2), // SetTransactionLimit type
          ethers.parseEther(newLimit),
          '0x0000000000000000000000000000000000000000' as Address,
          ethers.ZeroHash,
          BigInt(0),
          '0x0000000000000000000000000000000000000000' as Address,
        ],
        account: userAddress,
      })

      // If simulation succeeds, send the transaction
      const hash = await writeContractAsync(request as any)
      return hash
    } catch (err: any) {
      console.error('Error setting transaction limit:', err)
      throw new Error(err.message)
    }
  }

  const [tgeStatus, setTgeStatus] = useState<{
    isInitiated: boolean;
    timestamp: number | null;
    totalTokens: bigint | null;
  }>({
    isInitiated: false,
    timestamp: null,
    totalTokens: null
  });

  useEffect(() => {
    const fetchTGEStatus = async () => {
      if (!contractAddress || !publicClient || (activeContract !== CONTRACT_TYPES.VESTING && activeContract !== CONTRACT_TYPES.AIRDROP && activeContract !== CONTRACT_TYPES.TESTNET_MINING && activeContract !== CONTRACT_TYPES.STORAGE_POOL && activeContract !== CONTRACT_TYPES.REWARD_ENGINE)) {
        return;
      }

      try {
        // Get TGEInitiated events
        const events = await getLogsInChunks(getPublicClientOrThrow(), {
          address: contractAddress,
          event: parseAbiItem('event TGEInitiated(uint256 totalRequiredTokens, uint256 timestamp)'),
          fromBlock: 0n,
          toBlock: 'latest'
        });

        if (events.length > 0) {
          // Get the most recent TGE event
          const latestEvent = events[events.length - 1];
          const args = getEventArgs(latestEvent);
          setTgeStatus({
            isInitiated: true,
            timestamp: Number(args.timestamp),
            totalTokens: args.totalRequiredTokens
          });
        } else {
          setTgeStatus({
            isInitiated: false,
            timestamp: null,
            totalTokens: null
          });
        }
      } catch (error) {
        console.error('Error fetching TGE status:', error);
      }
    };

    fetchTGEStatus();
  }, [contractAddress, publicClient, activeContract]);

  const initiateTGE = async () => {
    if (!contractAddress) throw new Error('Contract address not found');
    if (!userAddress) throw new Error('Please connect your wallet');

    try {
      // First simulate the transaction
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'initiateTGE',
        account: userAddress,
        args: []  // Add empty args array
      });

      // If simulation succeeds, send the transaction
      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (err: any) {
      console.error('Error initiating TGE:', err);
      throw new Error(err.message);
    }
  };

  // Vesting contract functions
  const addVestingCap = async (
    capId: string,
    name: string,
    startDate: string,
    totalAllocation: string,
    cliff: string,
    vestingTerm: string,
    vestingPlan: string,
    initialRelease: string
  ) => {
    if (!contractAddress || !chainId) {
      throw new Error('Contract not initialized')
    }

    try {
      // Input validation
      if (Number(initialRelease) > 100) {
        throw new Error('Initial release percentage cannot be greater than 100')
      }

      if (Number(vestingPlan) >= Number(vestingTerm)) {
        throw new Error('Vesting plan interval must be less than vesting term')
      }

      if (Number(totalAllocation) <= 0) {
        throw new Error('Total allocation must be greater than 0')
      }

      const nameBytes32 = ethers.encodeBytes32String(name)
      const startDateBigInt = startDate ? BigInt(startDate) : BigInt(0)
      const totalAllocationBigInt = ethers.parseEther(totalAllocation)
      const cliffDays = BigInt(Math.floor(Number(cliff))) // cliff in days
      const vestingTermMonths = BigInt(Math.floor(Number(vestingTerm))) // term in months
      const vestingPlanMonths = BigInt(Math.floor(Number(vestingPlan))) // plan in months
      const initialReleasePercent = BigInt(Math.floor(Number(initialRelease))) // percentage 0-100

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'addVestingCap',
        account: userAddress,
        args: [
          BigInt(capId),
          nameBytes32,
          startDateBigInt,
          totalAllocationBigInt,
          cliffDays,
          vestingTermMonths,
          vestingPlanMonths,
          initialReleasePercent
        ],
      })

      const hash = await writeContractAsync(request as any)
      return hash
    } catch (err) {
      console.error('Error creating vesting cap:', err)
      throw err
    }
  }

  const addVestingWallet = async (
    walletAddress: string,
    capId: number,
    amount: string,
    note: string
  ) => {
    if (!contractAddress) throw new Error('Contract address not found')

    try {
      // First simulate the transaction
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'createProposal',
        args: [
          BigInt(7), // AddDistributionWallets type
          BigInt(capId),
          walletAddress as Address,
          ethers.encodeBytes32String(note),
          ethers.parseEther(amount),
          '0x0000000000000000000000000000000000000000' as Address,
        ],
        account: userAddress,
      })

      // If simulation succeeds, send the transaction
      const hash = await writeContractAsync(request as any)
      return hash
    } catch (err: any) {
      console.error('Error adding vesting wallet:', err)
      throw new Error(err.message)
    }
  }

  const createCap = async (
    capId: string,
    name: string,
    startDate: string,
    capTotalAllocation: string,
    cliff: string,
    vestingTerm: string,
    vestingPlan: string,
    initialRelease: string,
    maxRewardsPerMonth: string,
    ratio: string
  ) => {
    if (!contractAddress || !chainId) {
      throw new Error('Contract not initialized')
    }

    try {
      const nameBytes32 = ethers.encodeBytes32String(name)
      const startDateBigInt = BigInt(startDate)
      const totalAllocationBigInt = ethers.parseEther(capTotalAllocation)
      const cliffDays = BigInt(Math.floor(Number(cliff)))
      const vestingTermMonths = BigInt(Math.floor(Number(vestingTerm)))
      const vestingPlanMonths = BigInt(Math.floor(Number(vestingPlan)))
      const initialReleasePercent = BigInt(Math.floor(Number(initialRelease)))
      const maxRewardsPerMonthBigInt = ethers.parseEther(maxRewardsPerMonth)
      const ratioBigInt = BigInt(ratio)
      console.log(`nameBytes32: ${nameBytes32}`)
      console.log(`startDateBigInt: ${startDateBigInt}`)
      console.log(`totalAllocationBigInt: ${totalAllocationBigInt}`)
      console.log(`cliffDays: ${cliffDays}`)
      console.log(`vestingTermMonths: ${vestingTermMonths}`)
      console.log(`vestingPlanMonths: ${vestingPlanMonths}`)
      console.log(`initialReleasePercent: ${initialReleasePercent}`)
      console.log(`maxRewardsPerMonthBigInt: ${maxRewardsPerMonthBigInt}`)
      console.log(`ratioBigInt: ${ratioBigInt}`)

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'addVestingCap',
        account: userAddress,
        args: [
          BigInt(capId),
          nameBytes32,
          startDateBigInt,
          totalAllocationBigInt,
          cliffDays,
          vestingTermMonths,
          vestingPlanMonths,
          initialReleasePercent,
          maxRewardsPerMonthBigInt,
          ratioBigInt
        ],
      })

      const hash = await writeContractAsync(request as any)
      return hash
    } catch (err) {
      console.error('Error creating mining cap:', err)
      throw err
    }
  }

  // Common functions for both contracts
  const approveProposal = async (proposalId: string) => {
    if (!contractAddress) throw new Error('Contract address not found');
    if (!userAddress) throw new Error('Please connect your wallet');

    try {
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'approveProposal',
        args: [proposalId as `0x${string}`],
        account: userAddress,
      });

      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (error: any) {
      console.error('Error in approveProposal:', error);
      throw error;
    }
  };

  const executeProposal = async (proposalId: string) => {
    if (!contractAddress) throw new Error('Contract address not found');
    if (!userAddress) throw new Error('Please connect your wallet');

    try {
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'executeProposal',
        args: [proposalId as `0x${string}`],
        account: userAddress,
      });

      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (error: any) {
      console.error('Error in executeProposal:', error);
      throw error;
    }
  };

  const createProposal = async (
    proposalType: number,
    id: number,
    target: string,
    role: string,
    amount: string,
    tokenAddress: string
  ) => {
    if (!contractAddress) throw new Error('Contract address not found');

    try {
      // First simulate the transaction
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'createMiningProposal',
        args: [
          BigInt(proposalType),
          BigInt(id),
          target as Address,
          role,
          ethers.parseEther(amount),
          tokenAddress as Address,
        ],
        account: userAddress,
      });

      // If simulation succeeds, send the transaction
      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (err: any) {
      console.error('Error creating proposal:', err);
      throw new Error(err.message);
    }
  };

  type RoleConfig = {
    transactionLimit: bigint;
    quorum: bigint;
  };

  type RoleConfigInfo = {
    role: string;
    config: RoleConfig;
  };

  const [roleConfigs, setRoleConfigs] = useState<RoleConfigInfo[]>([]);

  const fetchRoleConfigs = async () => {
    if (!contractAddress || !publicClient) return;

    try {
      // Get all role config update events
      const [limitEvents, quorumEvents] = await Promise.all([
        getLogsInChunks(getPublicClientOrThrow(), {
          address: contractAddress,
          event: parseAbiItem('event TransactionLimitUpdated(bytes32 indexed role, uint240 limit)'),
          fromBlock: 0n,
          toBlock: 'latest'
        }),
        getLogsInChunks(getPublicClientOrThrow(), {
          address: contractAddress,
          event: parseAbiItem('event QuorumUpdated(bytes32 indexed role, uint16 quorum)'),
          fromBlock: 0n,
          toBlock: 'latest'
        })
      ]);

      // Get unique roles from both event types
      const uniqueRoles = new Set([
        ...limitEvents.map(e => getEventArgs(e).role),
        ...quorumEvents.map(e => getEventArgs(e).role)
      ]);

      // Fetch current config for each role
      const configPromises = Array.from(uniqueRoles).map(async (role) => {
        const config = await getPublicClientOrThrow().readContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: 'roleConfigs',
          args: [getRoleHash(role)]
        } as any) as { transactionLimit: bigint; quorum: bigint };

        return {
          role,
          config: {
            transactionLimit: config.transactionLimit,
            quorum: config.quorum
          }
        };
      });

      const configs = await Promise.all(configPromises);
      setRoleConfigs(configs);
    } catch (error) {
      console.error('Error fetching role configs:', error);
      setRoleConfigs([]);
    }
  };

  const setRoleTransactionLimit = async (role: string, limit: bigint) => {
    if (!contractAddress) throw new Error('Contract address not found');
    if (!userAddress) throw new Error('Please connect your wallet');

    try {
      console.log('Setting role transaction limit:', { role, limit: limit.toString() });
      
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'setRoleTransactionLimit',
        args: [getRoleHash(role), limit],
        account: userAddress,
      });

      const hash = await writeContractAsync(request as any);
      await getPublicClientOrThrow().waitForTransactionReceipt({ hash });
      
      // Refetch role configs after update
      await fetchRoleConfigs();
      return hash;
    } catch (error: any) {
      console.error('Error setting transaction limit:', error);
      throw error;
    }
  };

  const setRoleQuorum = async (role: string, quorum: bigint) => {
    if (!contractAddress) throw new Error('Contract address not found');
    if (!userAddress) throw new Error('Please connect your wallet');
    if (!publicClient) throw new Error('Public client not found');

    try {
      console.log('Setting role quorum:', { role, quorum: quorum.toString() });
      
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'setRoleQuorum',
        account: userAddress,
        args: [getRoleHash(role), quorum]
      });

      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (err) {
      console.error('Error setting role quorum:', err);
      throw err;
    }
  };

  const handleSetRoleTransactionLimit = async (role: string, limit: string) => {
    if (!role || !limit) throw new Error('Role and limit are required');
    
    try {
      // Convert ether to wei (add 18 decimals)
      let limitInWei: bigint;
      try {
        limitInWei = ethers.parseEther(limit);
      } catch (error) {
        console.error('Error parsing transaction limit:', error);
        throw new Error('Invalid transaction limit value');
      }
      
      console.log('Setting transaction limit:', {
        role,
        limitInEth: limit,
        limitInWei: limitInWei.toString()
      });
      
      return setRoleTransactionLimit(role, limitInWei);
    } catch (error: any) {
      if (error.code === 'INVALID_ARGUMENT') {
        throw new Error('Invalid transaction limit value');
      }
      throw error;
    }
  };

  const handleSetRoleQuorum = async (role: string, quorum: string) => {
    if (!role || !quorum) throw new Error('Role and quorum are required');
    
    try {
      // Convert string to uint16 (max value 65535)
      const quorumValue = parseInt(quorum);
      if (isNaN(quorumValue) || quorumValue < 1 || quorumValue > 65535) {
        throw new Error('Quorum must be a number between 1 and 65535');
      }
      console.log(`setting role quorum for ${role}: ${quorumValue}`)
      return setRoleQuorum(role, BigInt(quorumValue));
    } catch (error: any) {
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Failed to set quorum');
    }
  };

  const checkRoleConfig = async (role: string) => {
    if (!contractAddress) throw new Error('Contract address not found')
    
    try {
      console.log('Checking role config for:', { role });

      const config = await getPublicClientOrThrow().readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'roleConfigs',
        args: [getRoleHash(role)]
      } as any) as { transactionLimit: bigint; quorum: bigint };

      console.log('Raw role config result:', config);
      
      // Check if config or its properties are undefined
      if (!config || config.transactionLimit === undefined || config.quorum === undefined) {
        throw new Error('Invalid role configuration data received');
      }
      
      const transactionLimit18 = BigInt(config.transactionLimit);
      // Convert BigInt values to strings for safer processing
      const transactionLimitStr = transactionLimit18.toString();
      const quorumStr = config.quorum.toString();
      
      console.log('Processed role config:', { 
        transactionLimit: transactionLimitStr, 
        quorum: quorumStr
      });
      
      return {
        transactionLimit: transactionLimit18,
        quorum: config.quorum
      };
    } catch (error: any) {
      console.error('Error checking role config:', error);
      throw new Error(`Failed to fetch role configuration: ${error.message}`);
    }
  };

  const checkWhitelistConfig = async (address: string) => {
    if (!address) throw new Error('Address is required');
    if (!contractAddress) throw new Error('Contract not connected');
    if (!publicClient) throw new Error('Public client not available');
    
    try {
      console.log('Checking whitelist config for:', { address });

      const config = await getPublicClientOrThrow().readContract({
        address: contractAddress as `0x${string}`,
        abi: contractAbi,
        functionName: 'timeConfigs',
        args: [address]
      } as any) as readonly [bigint, bigint, bigint]; // [lastActivityTime, roleChangeTimeLock, whitelistLockTime]
      
      console.log('Raw whitelist config result:', config);
      
      // Convert BigInt values to numbers and ensure proper handling
      const lastActivityTime = Number(config[0]);
      const roleChangeTimeLock = Number(config[1]);
      const whitelistLockTime = Number(config[2]);
      
      console.log('Processed whitelist config:', {
        address,
        lastActivityTime,
        roleChangeTimeLock,
        whitelistLockTime
      });
      
      return {
        lastActivityTime,
        roleChangeTimeLock,
        whitelistLockTime
      };
    } catch (error: any) {
      console.error('Error checking whitelist config:', error);
      throw new Error(`Failed to fetch whitelist configuration: ${error.message}`);
    }
  };

  // Fetch role configs when contract changes
  useEffect(() => {
    if (contractAddress && chainId && activeContract === CONTRACT_TYPES.TOKEN) {
      fetchRoleConfigs();
    }
  }, [contractAddress, chainId, activeContract]);

  type ProposalConfig = {
    expiryTime: bigint;
    executionTime: bigint;
    approvals: number;
    status: number;
  }

  type UnifiedProposal = {
    proposalType: number;
    target: Address;
    id: number;
    role: `0x${string}`;
    tokenAddress: Address;
    amount: bigint;
    config: ProposalConfig;
  }

  const { data: proposalCount } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'proposalCount',
    query: {
      enabled: !!contractAddress && (activeContract === CONTRACT_TYPES.TOKEN || activeContract === CONTRACT_TYPES.VESTING || activeContract === CONTRACT_TYPES.AIRDROP || activeContract === CONTRACT_TYPES.TESTNET_MINING || activeContract === CONTRACT_TYPES.STORAGE_POOL || activeContract === CONTRACT_TYPES.REWARD_ENGINE),
    }
  })

  const [tokenProposalList, setTokenProposalList] = useState<(UnifiedProposal & { proposalId: string })[]>([])
  const [vestingProposalList, setVestingProposalList] = useState<(UnifiedProposal & { proposalId: string })[]>([])
  const [airdropProposalList, setAirdropProposalList] = useState<(UnifiedProposal & { proposalId: string })[]>([])
  const [testnetMiningProposalList, setTestnetMiningProposalList] = useState<(UnifiedProposal & { proposalId: string })[]>([])
  const [storagePoolProposalList, setStoragePoolProposalList] = useState<(UnifiedProposal & { proposalId: string })[]>([])
  const [rewardEngineProposalList, setRewardEngineProposalList] = useState<(UnifiedProposal & { proposalId: string })[]>([])

  const fetchProposals = async () => {
    if (!contractAddress || !publicClient || !proposalCount) {
      console.log('Missing requirements:', { 
        hasContractAddress: !!contractAddress, 
        hasPublicClient: !!publicClient, 
        proposalCount 
      });
      return;
    }

    try {
      console.log('Starting to fetch proposals. Total count:', proposalCount.toString());
      const proposals = [];
      
      for (let i = 0; i < Number(proposalCount); i++) {
        console.log(`Fetching proposal ${i + 1}/${proposalCount}`);
        
        try {
          // Get proposal ID from registry
          const proposalId = await getPublicClientOrThrow().readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'proposalRegistry',
            args: [BigInt(i)]
          } as any) as `0x${string}`;
          
          console.log(`Got proposal ID from registry:`, proposalId);

          if (!proposalId) {
            console.error(`No proposal ID found for index ${i}`);
            continue;
          }

          // Get proposal details
          const rawProposal = await getPublicClientOrThrow().readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'proposals',
            args: [proposalId]
          } as any);
          
          console.log(`Got raw proposal details for ID ${proposalId}:`, rawProposal);

          // Parse the raw proposal data into our expected format
          if (Array.isArray(rawProposal)) {
            const [
              proposalType,
              target,
              id,
              role,
              tokenAddress,
              amount,
              config
            ] = rawProposal;

            const proposal = {
              proposalType: Number(proposalType),
              target,
              id: Number(id),
              role,
              tokenAddress,
              amount: BigInt(amount || 0),
              config: {
                expiryTime: BigInt(config?.expiryTime || 0),
                executionTime: BigInt(config?.executionTime || 0),
                approvals: Number(config?.approvals || 0),
                status: Number(config?.status || 0)
              },
              proposalId
            };

            console.log('Processed proposal:', proposal);
            proposals.push(proposal);
          } else {
            console.error(`Invalid proposal data format for ID ${proposalId}:`, rawProposal);
          }
        } catch (error) {
          console.error(`Error processing proposal ${i}:`, error);
        }
      }

      console.log('Final proposals list:', proposals);
      if (activeContract === CONTRACT_TYPES.TOKEN) {
        setTokenProposalList(proposals);
      } else if (activeContract === CONTRACT_TYPES.VESTING) {
        setVestingProposalList(proposals);
      } else if (activeContract === CONTRACT_TYPES.AIRDROP) {
        setAirdropProposalList(proposals);
      } else if (activeContract === CONTRACT_TYPES.TESTNET_MINING) {
        setTestnetMiningProposalList(proposals);
      } else if (activeContract === CONTRACT_TYPES.STORAGE_POOL) {
        setStoragePoolProposalList(proposals);
      } else if (activeContract === CONTRACT_TYPES.REWARD_ENGINE) {
        setRewardEngineProposalList(proposals);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }
  }

  useEffect(() => {
    console.log('Proposal count updated:', proposalCount?.toString());
  }, [proposalCount]);

  useEffect(() => {
    console.log('Token proposal list updated:', tokenProposalList);
  }, [tokenProposalList]);

  useEffect(() => {
    console.log('Vesting proposal list updated:', vestingProposalList);
  }, [vestingProposalList]);

  useEffect(() => {
    if (contractAddress && (activeContract === CONTRACT_TYPES.TOKEN || activeContract === CONTRACT_TYPES.VESTING || activeContract === CONTRACT_TYPES.AIRDROP || activeContract === CONTRACT_TYPES.TESTNET_MINING || activeContract === CONTRACT_TYPES.STORAGE_POOL || activeContract === CONTRACT_TYPES.REWARD_ENGINE)) {
      console.log('Fetching proposals due to dependencies change:', {
        contractAddress,
        activeContract,
        proposalCount: proposalCount?.toString()
      });
      fetchProposals();
    }
  }, [contractAddress, activeContract, proposalCount]);

  const [isSettingNonce, setIsSettingNonce] = useState(false)
  const [isBridgeOp, setIsBridgeOp] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)

  const transferFromContract = async (to: string, amount: string) => {
    if (!contractAddress || !to || !amount) {
      throw new Error('Missing required parameters')
    }

    try {
      console.log('Attempting transfer:', { to, amount, contractAddress })
      setError(null)

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'transferFromContract',
        args: [to, ethers.parseEther(amount)],
        account: userAddress,
      })

      console.log('Transfer request:', request)
      await writeContractAsync(request as any)
      console.log('Transfer completed')
    } catch (err: any) {
      console.error('Error transferring tokens:', err)
      
      if (err.message.includes('AmountMustBePositive')) {
        throw new Error('Amount must be greater than 0')
      }

      if (err.message.includes('ExceedsSupply')) {
        const match = err.message.match(/ExceedsSupply\((.*?),(.*?)\)/)
        if (match) {
          const [requested, supply] = match.slice(1)
          throw new Error(`Amount exceeds contract balance. Requested: ${ethers.formatEther(requested)} FULA, Available: ${ethers.formatEther(supply)} FULA`)
        }
      }

      if (err.message.includes('LowAllowance')) {
        const match = err.message.match(/LowAllowance\((.*?),(.*?)\)/)
        if (match) {
          const [limit, amount] = match.slice(1)
          throw new Error(`Amount exceeds transaction limit. Limit: ${ethers.formatEther(limit)} FULA, Requested: ${ethers.formatEther(amount)} FULA`)
        }
      }

      throw err
    }
  }

  const [nonceEvents, setNonceEvents] = useState<{ chainId: bigint, caller: string, blockNumber: bigint }[]>([])
  const [bridgeOpEvents, setBridgeOpEvents] = useState<{
    operator: string,
    opType: number,
    amount: bigint,
    chainId: bigint,
    timestamp: bigint,
    blockNumber: bigint
  }[]>([])

  useEffect(() => {
    const fetchEvents = async () => {
      if (!contractAddress || !publicClient) return;

      try {
        // Fetch nonce events
        const nonceEvts = await getLogsInChunks(getPublicClientOrThrow(), {
          address: contractAddress,
          event: parseAbiItem('event SupportedChainChanged(uint256 indexed chainId, address caller)'),
          fromBlock: 'earliest'
        })

        const formattedNonceEvents = nonceEvts.map(event => {
          const args = getEventArgs(event)
          return {
            chainId: args.chainId!,
            caller: args.caller!,
            blockNumber: event.blockNumber
          }
        })

        setNonceEvents(formattedNonceEvents)

        // Fetch bridge operation events
        const bridgeOpEvts = await getLogsInChunks(getPublicClientOrThrow(), {
          address: contractAddress,
          event: parseAbiItem('event BridgeOperationDetails(address indexed operator, uint8 opType, uint256 amount, uint256 chainId, uint256 timestamp)'),
          fromBlock: 'earliest'
        })

        const formattedBridgeOpEvents = bridgeOpEvts.map(event => {
          const args = getEventArgs(event)
          return {
            operator: args.operator!,
            opType: Number(args.opType!),
            amount: args.amount!,
            chainId: args.chainId!,
            timestamp: args.timestamp!,
            blockNumber: event.blockNumber
          }
        })

        setBridgeOpEvents(formattedBridgeOpEvents)
      } catch (err) {
        console.error('Error fetching events:', err)
      }
    }

    fetchEvents()
  }, [contractAddress, publicClient])

  const setBridgeOpNonce = async (chainId: string, nonce: string) => {
    if (!contractAddress || !chainId || !nonce) {
      throw new Error('Missing required parameters')
    }

    try {
      setIsSettingNonce(true)
      setError(null)

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'setBridgeOpNonce',
        args: [BigInt(chainId), BigInt(nonce)],
        account: userAddress,
      })

      await writeContractAsync(request as any)
    } catch (err) {
      console.error('Error setting nonce:', err)
      throw err
    } finally {
      setIsSettingNonce(false)
    }
  }

  const performBridgeOp = async (amount: string, chainId: string, nonce: string, opType: number) => {
    if (!contractAddress || !amount || !chainId || !nonce) {
      throw new Error('Missing required parameters')
    }

    try {
      setIsBridgeOp(true)
      setError(null)

      // Convert amount to wei (multiply by 10^18)
      const amountInWei = ethers.parseEther(amount)

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'bridgeOp',
        args: [amountInWei, BigInt(chainId), BigInt(nonce), opType],
        account: userAddress,
      })

      await writeContractAsync(request as any)
    } catch (err: any) {
      console.error('Error performing bridge operation:', err)
      
      // Handle specific contract errors
      if (err.message.includes('AccessControlUnauthorizedAccount')) {
        const match = err.message.match(/AccessControlUnauthorizedAccount\((.*?),(.*?)\)/)
        if (match) {
          const [account, role] = match.slice(1)
          throw new Error(`Account ${account} does not have the required role ${role}`)
        }
        throw new Error('Account does not have the required role')
      }

      if (err.message.includes('UsedNonce')) {
        const match = err.message.match(/UsedNonce\((.*?)\)/)
        const nonce = match ? match[1] : 'unknown'
        throw new Error(`Nonce ${nonce} has not been set or has already been used`)
      }
      
      if (err.message.includes('AmountMustBePositive')) {
        throw new Error('Amount must be greater than 0')
      }
      
      if (err.message.includes('ExceedsMaximumSupply')) {
        const match = err.message.match(/ExceedsMaximumSupply\((.*?),(.*?)\)/)
        if (match) {
          const [amount, balance] = match.slice(1)
          throw new Error(`Operation would exceed maximum supply. Amount: ${ethers.formatEther(amount)} FULA, Available: ${ethers.formatEther(balance)} FULA`)
        }
      }
      
      if (err.message.includes('LowAllowance')) {
        const match = err.message.match(/LowAllowance\((.*?),(.*?)\)/)
        if (match) {
          const [limit, amount] = match.slice(1)
          throw new Error(`Amount exceeds transaction limit. Limit: ${ethers.formatEther(limit)} FULA, Requested: ${ethers.formatEther(amount)} FULA`)
        }
      }
      
      if (err.message.includes('Unsupported')) {
        const match = err.message.match(/Unsupported\((.*?)\)/)
        const chain = match ? match[1] : 'unknown'
        throw new Error(`Unsupported chain ID: ${chain}`)
      }

      throw err
    } finally {
      setIsBridgeOp(false)
    }
  }

  const cleanupExpiredProposals = async (maxProposalsToCheck: number) => {
    if (!contractAddress) throw new Error('Contract address not found');
    if (!userAddress) throw new Error('Please connect your wallet');

    try {
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'cleanupExpiredProposals',
        args: [BigInt(maxProposalsToCheck)],
        account: userAddress,
      });

      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (error: any) {
      console.error('Error cleaning up expired proposals:', error);
      throw error;
    }
  };

  const upgradeContract = async (newImplementation: string) => {
    if (!contractAddress) throw new Error('Contract address not found')
    if (!userAddress) throw new Error('Please connect your wallet')
    try {
      console.log('Upgrading contract to:', newImplementation)
      
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'upgradeToAndCall',
        args: [newImplementation, '0x'],
        account: userAddress,
      })

      const hash = await writeContractAsync(request as any)
      return hash
    } catch (err) {
      console.error('Error upgrading contract:', err)
      throw err
    }
  }

  const transferBackToStorage = async (amount: string) => {
    if (!contractAddress) throw new Error('Contract address not found')
    if (!userAddress) throw new Error('Please connect your wallet')
    if (!publicClient) throw new Error('Public client not found')

    try {
      // Convert amount to BigInt with proper decimals
      const amountInWei = ethers.parseEther(amount)
      
      console.log('Transferring tokens back to storage:', {
        amount,
        amountInWei: amountInWei.toString(),
        contractAddress
      })
      
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'transferBackToStorage',
        args: [amountInWei],
        account: userAddress,
      })

      const hash = await writeContractAsync(request as any)
      console.log('Transfer back to storage transaction hash:', hash)
      return hash
    } catch (err) {
      console.error('Error transferring tokens back to storage:', err)
      throw err
    }
  }

  const emergencyAction = async (op: 1 | 2) => {
    if (!contractAddress) throw new Error('Contract address not found')

    try {
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'emergencyAction',
        account: userAddress,
        args: [op]
      })

      const hash = await writeContractAsync(request as any)
      return hash
    } catch (err: any) {
      console.error('Error executing emergency action:', err)
      throw new Error(err.message)
    }
  };

  const createRoleProposal = async (proposalType: number, targetAddress: string, role: string) => {
    if (!contractAddress) throw new Error('Contract address not found')
    if (!ethers.isAddress(targetAddress)) throw new Error('Invalid target address')
    if (!role) throw new Error('Role is required')
    
    try {
      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'createProposal',
        account: userAddress,
        args: [
          proposalType, // Type 1 = AddRole, Type 2 = RemoveRole
          0n, // id (not used for role proposals)
          targetAddress as `0x${string}`,
          getRoleHash(role) as `0x${string}`,
          0n, // amount (not used for role proposals)
          ethers.ZeroAddress as `0x${string}` // tokenAddress (not used for role proposals)
        ]
      })

      const hash = await writeContractAsync(request as any)
      return hash
    } catch (err: any) {
      console.error('Error creating role proposal:', err)
      throw new Error(err.message)
    }
  };

  const checkHasRole = async (address: string, role: string) => {
    if (!contractAddress) throw new Error('Contract address not found')
    if (!ethers.isAddress(address)) throw new Error('Invalid address')
    if (!role) throw new Error('Role is required')
    
    try {
      console.log('Checking role:', {
        address: contractAddress,
        functionName: 'hasRole',
        args: [getRoleHash(role), address]
      });
      
      const hasRole = await getPublicClientOrThrow().readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'hasRole',
        args: [
          getRoleHash(role) as `0x${string}`,
          address as `0x${string}`
        ]
      } as any)

      return Boolean(hasRole)
    } catch (err: any) {
      console.error('Error checking role:', err)
      throw new Error(err.message)
    }
  };

  const getTransactionDetails = async (txHash: string) => {
    if (!txHash || !txHash.startsWith('0x')) {
      throw new Error('Invalid transaction hash')
    }

    try {
      try {
        // Get transaction details
        const txDetails = await getPublicClientOrThrow().getTransaction({
          hash: txHash as `0x${string}`
        })
        
        if (!txDetails) {
          throw new Error('Transaction not found on the current network')
        }
        
        return {
          nonce: Number(txDetails.nonce),
          from: txDetails.from,
          status: txDetails.blockNumber ? 'Confirmed' : 'Pending'
        }
      } catch (innerErr: any) {
        // If transaction is not found, suggest manual nonce entry
        console.error('Error fetching transaction:', innerErr)
        throw new Error('Transaction not found on the current network. Try entering the nonce directly.')
      }
    } catch (err: any) {
      console.error('Error getting transaction details:', err)
      throw new Error(`Failed to get transaction details: ${err.message}`)
    }
  };

  const cancelTransaction = async (nonce: number) => {
    if (!userAddress) {
      throw new Error('No connected account')
    }

    try {
      setError(null)
      
      // Get current gas price
      const currentGasPrice = await getPublicClientOrThrow().getGasPrice()
      
      // Increase gas price by 10% to prioritize the cancellation
      const increasedGasPrice = currentGasPrice * BigInt(110) / BigInt(100)
      
      // Check if walletClient is available
      if (!walletClient) {
        throw new Error('Wallet client not available. Please make sure your wallet is connected.')
      }
      
      // Send cancellation transaction
      const hash = await walletClient.sendTransaction({
        to: userAddress,
        value: BigInt(0),
        nonce,
        gasPrice: increasedGasPrice,
        kzg: undefined,
        account: userAddress,
        chain: undefined
      })
      
      return hash
    } catch (err: any) {
      console.error('Error cancelling transaction:', err)
      throw new Error(`Failed to cancel transaction: ${err.message}`)
    }
  }

  const handleSetQuorum = async (role: string, quorum: string) => {
    try {
      if (!contractAddress) throw new Error('Contract address not found');
      if (!userAddress) throw new Error('Please connect your wallet');

      const roleHash = getRoleHash(role);
      console.log(`Setting quorum for role ${role} (${roleHash}) to ${quorum}`);

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'setRoleQuorum',
        args: [roleHash, BigInt(quorum)],
        account: userAddress,
      });

      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (error: any) {
      console.error('Error setting role quorum:', error);
      throw error;
    }
  };

  // Add functions for substrate rewards management
  const updateSubstrateRewards = async (wallet: string, amount: string) => {
    try {
      if (!contractAddress) throw new Error('Contract address not found');
      if (!userAddress) throw new Error('Please connect your wallet');
      if (!ethers.isAddress(wallet)) throw new Error('Invalid wallet address');
      
      const amountBigInt = ethers.parseEther(amount);
      console.log(`Updating substrate rewards for ${wallet} to ${amountBigInt.toString()}`);

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'updateSubstrateRewards',
        args: [wallet as Address, amountBigInt],
        account: userAddress,
      });

      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (error: any) {
      console.error('Error updating substrate rewards:', error);
      throw error;
    }
  };

  const getSubstrateRewards = async (wallet: string) => {
    try {
      if (!contractAddress) throw new Error('Contract address not found');
      if (!ethers.isAddress(wallet)) throw new Error('Invalid wallet address');

      const result = await getPublicClientOrThrow().readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'getSubstrateRewards',
        args: [wallet as Address]
      } as any) as [bigint, bigint]; // [lastUpdate, amount]

      return {
        lastUpdate: result[0],
        amount: result[1]
      };
    } catch (error: any) {
      console.error('Error getting substrate rewards:', error);
      throw error;
    }
  };

  const addSubstrateAddress = async (ethereumAddr: string, substrateAddr: string) => {
    try {
      if (!contractAddress) throw new Error('Contract address not found');
      if (!userAddress) throw new Error('Please connect your wallet');
      if (!ethers.isAddress(ethereumAddr)) throw new Error('Invalid Ethereum address');
      if (!substrateAddr) throw new Error('Invalid Substrate address');

      // Convert the substrate address to a hex string that viem can handle
      const hexString = `0x${Buffer.from(substrateAddr).toString('hex')}`;
      console.log(`Adding substrate address mapping: ${ethereumAddr} -> ${substrateAddr} (hex: ${hexString})`);

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'addAddress',
        args: [ethereumAddr as Address, hexString],
        account: userAddress,
      });

      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (error: any) {
      console.error('Error adding substrate address:', error);
      throw error;
    }
  };

  const batchAddSubstrateAddresses = async (ethereumAddrs: string[], substrateAddrs: string[]) => {
    try {
      if (!contractAddress) throw new Error('Contract address not found');
      if (!userAddress) throw new Error('Please connect your wallet');
      if (ethereumAddrs.length !== substrateAddrs.length) throw new Error('Address arrays must have the same length');
      if (ethereumAddrs.length > 1000) throw new Error('Batch too large (max 1000)');

      // Convert all Ethereum addresses to Address type
      const ethAddresses = ethereumAddrs.map(addr => {
        if (!ethers.isAddress(addr)) throw new Error(`Invalid Ethereum address: ${addr}`);
        return addr as Address;
      });

      // Convert all Substrate addresses to hex strings
      const hexStrings = substrateAddrs.map(addr => 
        `0x${Buffer.from(addr).toString('hex')}`
      );

      console.log(`Adding batch of ${ethereumAddrs.length} substrate address mappings`);

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'batchAddAddresses',
        args: [ethAddresses, hexStrings],
        account: userAddress,
      });

      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (error: any) {
      console.error('Error batch adding substrate addresses:', error);
      throw error;
    }
  };

  const batchRemoveAddresses = async (ethereumAddrs: string[]) => {
    try {
      if (!contractAddress) throw new Error('Contract address not found');
      if (!userAddress) throw new Error('Please connect your wallet');
      if (ethereumAddrs.length > 1000) throw new Error('Batch too large (max 1000)');

      // Convert all Ethereum addresses to Address type
      const ethAddresses = ethereumAddrs.map(addr => {
        if (!ethers.isAddress(addr)) throw new Error(`Invalid Ethereum address: ${addr}`);
        return addr as Address;
      });

      console.log(`Removing batch of ${ethereumAddrs.length} substrate address mappings`);

      const { request } = await getPublicClientOrThrow().simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'batchRemoveAddresses',
        args: [ethAddresses],
        account: userAddress,
      });

      const hash = await writeContractAsync(request as any);
      return hash;
    } catch (error: any) {
      console.error('Error batch removing substrate addresses:', error);
      throw error;
    }
  };

  const getSubstrateAddressMappings = async () => {
    try {
      if (!contractAddress) throw new Error('Contract address not found');

      // Get all AddressesAdded events
      const addedEvents = await getLogsInChunks(getPublicClientOrThrow(), {
        address: contractAddress,
        event: {
          type: 'event',
          name: 'AddressesAdded',
          inputs: [
            { indexed: false, name: 'count', type: 'uint256' }
          ]
        },
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Get all AddressRemoved events
      const removedEvents = await getLogsInChunks(getPublicClientOrThrow(), {
        address: contractAddress,
        event: {
          type: 'event',
          name: 'AddressRemoved',
          inputs: [
            { indexed: true, name: 'ethereumAddr', type: 'address' }
          ]
        },
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Get all SubstrateRewardsUpdated events
      const rewardsEvents = await getLogsInChunks(getPublicClientOrThrow() as any, {
        address: contractAddress,
        event: {
          type: 'event',
          name: 'SubstrateRewardsUpdated',
          inputs: [
            { indexed: true, name: 'wallet', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' }
          ]
        },
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Process rewards events to get the latest reward for each address
      const rewardsMap = new Map<string, bigint>();
      for (const event of rewardsEvents) {
        const eventArgs = (event as any).args;
        if (eventArgs && eventArgs.wallet && eventArgs.amount) {
          const wallet = eventArgs.wallet.toLowerCase();
          rewardsMap.set(wallet, eventArgs.amount);
        }
      }

      // Get all ethereum addresses with substrate mappings
      // Note: Since we can't directly query all mappings, we'll need to check specific addresses
      // This is a limitation of the current contract design
      
      // For now, we'll return the rewards data we have
      const mappings = Array.from(rewardsMap.entries()).map(([wallet, amount]) => ({
        ethereumAddress: wallet,
        substrateAddress: "Unknown", // We can't get this directly from events
        rewardAmount: amount
      }));

      return mappings;
    } catch (error: any) {
      console.error('Error getting substrate address mappings:', error);
      throw error;
    }
  };

  return {
    isLoading,
    error,
    whitelistInfo,
    whitelistedAddresses,
    tokenProposals: tokenProposalList,
    vestingProposals: vestingProposalList,
    airdropProposals: airdropProposalList,
    testnetMiningProposals: testnetMiningProposalList,
    storagePoolProposals: storagePoolProposalList,
    rewardEngineProposals: rewardEngineProposalList,
    addToWhitelist,
    setTransactionLimit,
    initiateTGE,
    addVestingCap,
    addVestingWallet,
    approveProposal,
    executeProposal,
    refetchWhitelistedAddresses,
    isWhitelisted,
    checkWhitelistConfig,
    fetchWhitelistedAddresses,
    fetchProposals,
    vestingCapTable,
    tgeStatus,
    setBridgeOpNonce,
    isSettingNonce,
    nonceEvents,
    performBridgeOp,
    isBridgeOp,
    bridgeOpEvents,
    transferFromContract,
    isTransferring,
    handleSetRoleTransactionLimit,
    handleSetRoleQuorum,
    checkRoleConfig,
    roleConfigs,
    createCap,
    createProposal,
    cleanupExpiredProposals,
    upgradeContract,
    emergencyAction,
    createRoleProposal,
    checkHasRole,
    cancelTransaction,
    getTransactionDetails,
    handleSetQuorum,
    updateSubstrateRewards,
    getSubstrateRewards,
    addSubstrateAddress,
    batchAddSubstrateAddresses,
    batchRemoveAddresses,
    getSubstrateAddressMappings,
    transferBackToStorage
  }
}
