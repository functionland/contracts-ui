

import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useConnection, usePublicClient } from 'wagmi'
import { type Address } from 'viem'
import { CONTRACT_CONFIG } from '@/config/contracts'
import { CONTRACT_TYPES } from '@/config/constants'
import { VestingData, VestingCap } from '@/types/vesting'
import { bytesToString } from 'viem'
import { decodeBytes32String } from 'ethers'
import { useContractContext } from '@/contexts/ContractContext'

export function useVestingContract() {
  const { activeContract } = useContractContext()
  const { address: userAddress, chainId } = useConnection()
  const [vestingData, setVestingData] = useState<Map<number, VestingData>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [substrateWallet, setSubstrateWallet] = useState<string | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('substrateWallet')
    }
    return null
  })
  const publicClient = usePublicClient()

  const contractAddress = chainId 
    ? CONTRACT_CONFIG.address[activeContract][chainId] 
    : undefined

  const contractAbi = CONTRACT_CONFIG.abi[activeContract]

  // Create a custom ABI for the Airdrop contract's calculateDueTokens function with error definitions
  const customAirdropCalculateDueTokensAbi = [
    {
      inputs: [
        { internalType: 'address', name: 'wallet', type: 'address' },
        { internalType: 'uint256', name: 'capId', type: 'uint256' },
      ],
      name: 'calculateDueTokens',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    // Add error definitions from the Airdrop contract
    {
      type: "error",
      name: "NothingToClaim",
      inputs: []
    },
    {
      type: "error",
      name: "CliffNotReached",
      inputs: [
        { name: "currentTime", type: "uint256" },
        { name: "startDate", type: "uint256" },
        { name: "cliffEnd", type: "uint256" }
      ]
    },
    {
      type: "error",
      name: "NoWalletBalance",
      inputs: []
    },
    {
      type: "error",
      name: "InvalidAllocationParameters",
      inputs: []
    },
    {
      type: "error",
      name: "WalletNotInCap",
      inputs: [
        { name: "wallet", type: "address" },
        { name: "capId", type: "uint256" }
      ]
    },
    {
      type: "error",
      name: "InvalidCapId",
      inputs: [
        { name: "capId", type: "uint256" }
      ]
    }
  ]

  console.log("Contract Address:", contractAddress)
  console.log("activeContract:", activeContract)
  console.log("chainId:", chainId)

  const { data: walletsInCap } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'getWalletsInCap',
    args: [BigInt(1)],
    query: {
      enabled: !!contractAddress
    }
  })

  console.log("Wallets in Cap 1:", walletsInCap)

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
      const valueArray = values.split(',').map((v: string) => v.trim());
  
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
        
        // Add other error cases as needed
        
        default:
          return `${errorName}: ${valueArray.join(', ')}`;
      }
    }
  
    // Default error message
    return error instanceof Error ? error.message : String(error);
  };

  async function fetchVestingData() {
    setIsLoading(true)
    setError(null)

    try {
      const walletsInCap = await publicClient?.readContract({
        address: contractAddress as Address,
        abi: contractAbi,
        functionName: 'getWalletsInCap',
        args: [BigInt(0)]
      } as any) as Address[]

      if (!walletsInCap || !publicClient || !contractAddress) return

      const newVestingData = new Map<number, VestingData>()

      if (activeContract === CONTRACT_TYPES.TESTNET_MINING) {
        // For testnet mining, we need to get the cap IDs one by one
        let index = 0;
        const foundCapIds: bigint[] = [];
        
        while (true) {
          try {
            const capId = await publicClient.readContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'capIds',
              args: [BigInt(index)]
            } as any) as bigint;
            
            foundCapIds.push(capId);
            index++;
          } catch (error) {
            // When we hit an error, we've reached the end of the array
            break;
          }
        }

        for (const capId of foundCapIds) {
          const walletsInThisCap = await publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'getWalletsInCap',
            args: [capId]
          } as any) as Address[]

          if (walletsInThisCap.includes(userAddress as Address)) {
            console.log("Wallets in this cap:", walletsInThisCap);
            const capTuple = await publicClient.readContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'vestingCaps',
              args: [capId]
            } as any) as readonly [bigint, `0x${string}`, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]

            const cap: VestingCap = {
              totalAllocation: capTuple[0],
              name: capTuple[1],
              cliff: capTuple[2],
              vestingTerm: capTuple[3],
              vestingPlan: capTuple[4],
              initialRelease: capTuple[5],
              startDate: capTuple[6],
              allocatedToWallets: capTuple[7],
              wallets: [] // This will be populated by the next contract call
            }

            const walletInfo = await publicClient.readContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'vestingWallets',
              args: [userAddress as Address, capId]
            } as any)

            let claimableAmount = BigInt(0)
            let errorMessage = ''

            try {
              console.log("substrateWallet:", substrateWallet);
              if (substrateWallet) {
                claimableAmount = await publicClient.readContract({
                  address: contractAddress,
                  abi: contractAbi,
                  functionName: 'calculateDueTokens',
                  args: [userAddress as Address, substrateWallet, capId]
                } as any) as bigint
                console.log("Claimable amount:", claimableAmount);
              }
            } catch (error) {
              errorMessage = error instanceof Error ? error.message : String(error)
              console.error('Claim calculation error:', error)
            }

            const substrateRewards = await publicClient.readContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'getSubstrateRewards',
              args: [userAddress as Address]
            } as any) as [bigint, bigint]

            const [_capId, walletName, amount, claimed, monthlyClaimedRewards, lastClaimMonth] = walletInfo as [bigint, string, bigint, bigint, bigint, bigint]
            const { totalAllocation, name, cliff, vestingTerm, vestingPlan, initialRelease, startDate, allocatedToWallets, maxRewardsPerMonth, ratio } = cap

            newVestingData.set(Number(capId), {
              capId: Number(capId),
              name: decodeBytes32String(name),
              totalAllocation,
              claimed: BigInt(0),  // Initialize as 0
              claimable: claimableAmount || BigInt(0),  // Use claimableAmount if available, otherwise 0
              cliff: Number(cliff),
              vestingTerm: Number(vestingTerm),
              vestingPlan: Number(vestingPlan),
              initialRelease: Number(initialRelease),
              startDate: Number(startDate),
              allocatedToWallets,
              maxRewardsPerMonth,
              ratio,
              walletInfo: {
                capId: _capId,
                name: decodeBytes32String(walletName),
                amount,
                claimed,
                monthlyClaimedRewards,
                lastClaimMonth,
                claimableAmount,
                errorMessage
              },
              substrateRewards: {
                lastUpdate: substrateRewards[0],
                amount: substrateRewards[1]
              }
            })
          }
        }
        setVestingData(newVestingData)
        setIsLoading(false)
        return
      }

      let index = 0
      while (true) {
        try {
          // Read cap ID at current index
          console.log("Index:", index, "Contract Address:", contractAddress)
          const capIds = await publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'capIds',
            args: []
          } as any) as bigint[]

          if (index >= capIds.length) break
          const capId = capIds[index]

          // Get cap details
          const capTuple = await publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'vestingCaps',
            args: [capId]
          } as any) as readonly [bigint, `0x${string}`, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]

          const cap: VestingCap = {
            totalAllocation: capTuple[0],
            name: capTuple[1],
            cliff: capTuple[2],
            vestingTerm: capTuple[3],
            vestingPlan: capTuple[4],
            initialRelease: capTuple[5],
            startDate: capTuple[6],
            allocatedToWallets: capTuple[7],
            wallets: [] // This will be populated by the next contract call
          }

          // Get wallets in this cap
          const walletsInThisCap = await publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'getWalletsInCap',
            args: [capId]
          } as any) as Address[]

          console.log(`Cap ${capId} wallets:`, walletsInThisCap)
          let claimableAmount = BigInt(0);
          let errorMessage = '';

          if (walletsInThisCap.includes(userAddress as Address)) {
            // Get wallet info
            const walletInfo = await publicClient.readContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'vestingWallets',
              args: [userAddress as Address, capId]
            } as any)

            try {
              // Calculate claimable amount
              if (activeContract === CONTRACT_TYPES.AIRDROP) {
                // For Airdrop, use custom ABI that matches the contract implementation
                claimableAmount = await publicClient.readContract({
                  address: contractAddress,
                  abi: customAirdropCalculateDueTokensAbi,
                  functionName: 'calculateDueTokens',
                  args: [userAddress as Address, capId]
                } as any) as bigint
              } else {
                // For regular Vesting
                claimableAmount = await publicClient.readContract({
                  address: contractAddress,
                  abi: contractAbi,
                  functionName: 'calculateDueTokens',
                  args: [userAddress as Address, capId]
                } as any) as bigint
              }
            } catch (error: any) {
              errorMessage = parseContractError(error);
              console.error('Claim calculation error:', error);
            }

            const [_capId, walletName, amount, claimed] = walletInfo as [bigint, string, bigint, bigint];
            const { totalAllocation, name, cliff, vestingTerm, vestingPlan, initialRelease, startDate } = cap

            console.log("here", capId, walletName, amount, claimed, totalAllocation, name, cliff, vestingTerm, vestingPlan, initialRelease, startDate)
            console.log("here2", {name: name, decodedName: decodeBytes32String(name)})
            newVestingData.set(Number(capId), {
              capId: Number(capId),
              name: decodeBytes32String(name),
              totalAllocation,
              claimed: BigInt(0),  // Initialize as 0
              claimable: claimableAmount || BigInt(0),  // Use claimableAmount if available, otherwise 0
              cliff: Number(cliff),
              vestingTerm: Number(vestingTerm),
              vestingPlan: Number(vestingPlan),
              initialRelease: Number(initialRelease),
              startDate: Number(startDate),
              errorMessage,
              walletInfo: {
                capId: _capId,
                name: decodeBytes32String(walletName),
                amount,
                claimed,
                claimableAmount,
                errorMessage
              }
            })
          }
          
          index++
        } catch (e) {
          console.log(e)
          // We've hit the end of the array
          console.log("Finished reading caps at index:", index)
          break
        }
      }
      
      console.log("we are here")
      setVestingData(newVestingData)
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching vesting data:', err)
      setError(err instanceof Error ? err : new Error('Failed to load vesting data'))
      setIsLoading(false)
    }
  }

  const loadTestnetData = (wallet: string) => {
    console.log("Setting substrate wallet to:", wallet);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('substrateWallet', wallet);
    }
    setSubstrateWallet(wallet);
  }

  useEffect(() => {
    console.log("Current substrate wallet:", substrateWallet);
    const fetchVestingData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const walletsInCap = await publicClient?.readContract({
          address: contractAddress as Address,
          abi: contractAbi,
          functionName: 'getWalletsInCap',
          args: [BigInt(0)],
        } as any) as Address[]

        if (!walletsInCap || !publicClient || !contractAddress) return

        const newVestingData = new Map<number, VestingData>()

        if (activeContract === CONTRACT_TYPES.TESTNET_MINING) {
          // For testnet mining, we need to get the cap IDs one by one
          let index = 0;
          const foundCapIds: bigint[] = [];
          
          while (true) {
            try {
              const capId = await publicClient.readContract({
                address: contractAddress,
                abi: contractAbi,
                functionName: 'capIds',
                args: [BigInt(index)]
              } as any) as bigint;
              
              foundCapIds.push(capId);
              index++;
            } catch (error) {
              // When we hit an error, we've reached the end of the array
              break;
            }
          }

          for (const capId of foundCapIds) {
            const walletsInThisCap = await publicClient.readContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'getWalletsInCap',
              args: [capId]
            } as any) as Address[]

            if (walletsInThisCap.includes(userAddress as Address)) {
              console.log("Wallets in this cap:", walletsInThisCap);
              const capTuple = await publicClient.readContract({
                address: contractAddress,
                abi: contractAbi,
                functionName: 'vestingCaps',
                args: [capId]
              } as any) as readonly [bigint, `0x${string}`, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]

              const cap: VestingCap = {
                totalAllocation: capTuple[0],
                name: capTuple[1],
                cliff: capTuple[2],
                vestingTerm: capTuple[3],
                vestingPlan: capTuple[4],
                initialRelease: capTuple[5],
                startDate: capTuple[6],
                allocatedToWallets: capTuple[7],
                wallets: [] // This will be populated by the next contract call
              }

              const walletInfo = await publicClient.readContract({
                address: contractAddress,
                abi: contractAbi,
                functionName: 'vestingWallets',
                args: [userAddress as Address, capId]
              } as any)

              let claimableAmount = BigInt(0)
              let errorMessage = ''

              try {
                if (substrateWallet) {
                  claimableAmount = await publicClient.readContract({
                    address: contractAddress,
                    abi: contractAbi,
                    functionName: 'calculateDueTokens',
                    args: [userAddress as Address, substrateWallet, capId]
                  } as any) as bigint
                }
              } catch (error) {
                errorMessage = error instanceof Error ? error.message : String(error)
                console.error('Claim calculation error:', error)
              }

              const substrateRewards = await publicClient.readContract({
                address: contractAddress,
                abi: contractAbi,
                functionName: 'getSubstrateRewards',
                args: [userAddress as Address]
              } as any) as [bigint, bigint]

              const [_capId, walletName, amount, claimed, monthlyClaimedRewards, lastClaimMonth] = walletInfo as [bigint, string, bigint, bigint, bigint, bigint]
              const { totalAllocation, name, cliff, vestingTerm, vestingPlan, initialRelease, startDate, allocatedToWallets, maxRewardsPerMonth, ratio } = cap

              newVestingData.set(Number(capId), {
                capId: Number(capId),
                name: decodeBytes32String(name),
                totalAllocation,
                claimed: BigInt(0),  // Initialize as 0
                claimable: claimableAmount || BigInt(0),  // Use claimableAmount if available, otherwise 0
                cliff: Number(cliff),
                vestingTerm: Number(vestingTerm),
                vestingPlan: Number(vestingPlan),
                initialRelease: Number(initialRelease),
                startDate: Number(startDate),
                allocatedToWallets,
                maxRewardsPerMonth,
                ratio,
                walletInfo: {
                  capId: _capId,
                  name: decodeBytes32String(walletName),
                  amount,
                  claimed,
                  monthlyClaimedRewards,
                  lastClaimMonth,
                  claimableAmount,
                  errorMessage
                },
                substrateRewards: {
                  lastUpdate: substrateRewards[0],
                  amount: substrateRewards[1]
                }
              })
            }
          }
          setVestingData(newVestingData)
          setIsLoading(false)
          return
        }

        let index = 0;
        const foundCapIds: bigint[] = [];
        
        while (true) {
          try {
            const capId = await publicClient.readContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'capIds',
              args: [BigInt(index)]
            } as any) as bigint;
            
            foundCapIds.push(capId);
            index++;
          } catch (error) {
            // When we hit an error, we've reached the end of the array
            break;
          }
        }
        for (let i = 0; i < foundCapIds.length; i++) {
          try {
            // Read cap ID at current index
            console.log("Index:", i, "Contract Address:", contractAddress)
            const capId = foundCapIds[i]

            // Get cap details
            const capTuple = await publicClient.readContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'vestingCaps',
              args: [capId]
            } as any) as readonly [bigint, `0x${string}`, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]

            const cap: VestingCap = {
              totalAllocation: capTuple[0],
              name: capTuple[1],
              cliff: capTuple[2],
              vestingTerm: capTuple[3],
              vestingPlan: capTuple[4],
              initialRelease: capTuple[5],
              startDate: capTuple[6],
              allocatedToWallets: capTuple[7],
              wallets: [] // This will be populated by the next contract call
            }

            // Get wallets in this cap
            const walletsInThisCap = await publicClient.readContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'getWalletsInCap',
              args: [capId]
            } as any) as Address[]

            console.log(`Cap ${capId} wallets:`, walletsInThisCap)
            let claimableAmount = BigInt(0);
            let errorMessage = '';

            if (walletsInThisCap.includes(userAddress as Address)) {
              // Get wallet info
              const walletInfo = await publicClient.readContract({
                address: contractAddress,
                abi: contractAbi,
                functionName: 'vestingWallets',
                args: [userAddress as Address, capId]
              } as any)

              try {
                // Calculate claimable amount
                if (activeContract === CONTRACT_TYPES.AIRDROP) {
                  // For Airdrop, use custom ABI that matches the contract implementation
                  claimableAmount = await publicClient.readContract({
                    address: contractAddress,
                    abi: customAirdropCalculateDueTokensAbi,
                    functionName: 'calculateDueTokens',
                    args: [userAddress as Address, capId]
                  } as any) as bigint
                } else {
                  // For regular Vesting
                  claimableAmount = await publicClient.readContract({
                    address: contractAddress,
                    abi: contractAbi,
                    functionName: 'calculateDueTokens',
                    args: [userAddress as Address, capId]
                  } as any) as bigint
                }
              } catch (error: any) {
                errorMessage = parseContractError(error);
                console.error('Claim calculation error:', error);
              }

              const [_capId, walletName, amount, claimed] = walletInfo as [bigint, string, bigint, bigint];
              const { totalAllocation, name, cliff, vestingTerm, vestingPlan, initialRelease, startDate } = cap

              console.log("here", capId, walletName, amount, claimed, totalAllocation, name, cliff, vestingTerm, vestingPlan, initialRelease, startDate)
              console.log("here2", {name: name, decodedName: decodeBytes32String(name)})
              newVestingData.set(Number(capId), {
                capId: Number(capId),
                name: decodeBytes32String(name),
                totalAllocation,
                claimed: BigInt(0),  // Initialize as 0
                claimable: claimableAmount || BigInt(0),  // Use claimableAmount if available, otherwise 0
                cliff: Number(cliff),
                vestingTerm: Number(vestingTerm),
                vestingPlan: Number(vestingPlan),
                initialRelease: Number(initialRelease),
                startDate: Number(startDate),
                errorMessage,
                walletInfo: {
                  capId: _capId,
                  name: decodeBytes32String(walletName),
                  amount,
                  claimed,
                  claimableAmount,
                  errorMessage
                }
              })
            }
            
            index++
          } catch (e) {
            console.log(e)
            // We've hit the end of the array
            console.log("Finished reading caps at index:", index)
            break
          }
        }
        
        console.log("we are here")
        setVestingData(newVestingData)
        setIsLoading(false)
      } catch (err) {
        console.error('Error fetching vesting data:', err)
        setError(err instanceof Error ? err : new Error('Failed to load vesting data'))
        setIsLoading(false)
      }
    }

    if (userAddress && contractAddress) {
      fetchVestingData()
    }
  }, [userAddress, contractAddress, walletsInCap, publicClient, substrateWallet])

  useEffect(() => {
    if (activeContract !== CONTRACT_TYPES.TESTNET_MINING) {
      setSubstrateWallet(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('substrateWallet');
      }
    }
  }, [activeContract]);

  const { writeContractAsync } = useWriteContract()

  const handleClaim = async (capId: number) => {
    if (!contractAddress || !userAddress) {
      throw new Error('Contract or wallet not connected')
    }

    try {
      let request;
      
      if (activeContract === CONTRACT_TYPES.TESTNET_MINING) {
        if (!substrateWallet) {
          throw new Error('Substrate wallet not provided')
        }
        
        // Create a custom ABI entry for the claimTokens function with correct types
        const customAbi = {
          name: 'claimTokens',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'substrateWallet', type: 'string' },
            { name: 'capId', type: 'uint256' }
          ],
          outputs: []
        }
        
        // Simulate the transaction with the custom ABI
        const simulateResult = await publicClient!.simulateContract({
          address: contractAddress,
          abi: [customAbi],
          functionName: 'claimTokens',
          args: [substrateWallet, BigInt(capId)],
          account: userAddress,
        })
        
        request = simulateResult.request
      } else if (activeContract === CONTRACT_TYPES.AIRDROP) {
        // For Airdrop, use a custom ABI with the correct parameters
        const customAbi = {
          name: 'claimTokens',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'capId', type: 'uint256' },
            { name: 'chainId', type: 'uint256' }
          ],
          outputs: []
        }
        
        // Get the current chain ID
        const currentChainId = chainId || 1; // Default to 1 if chainId is undefined
        
        // Simulate the transaction with the custom ABI
        const simulateResult = await publicClient!.simulateContract({
          address: contractAddress,
          abi: [customAbi],
          functionName: 'claimTokens',
          args: [BigInt(capId), BigInt(currentChainId)],
          account: userAddress,
        })
        
        request = simulateResult.request
      } else {
        // For regular Vesting
        const simulateResult = await publicClient!.simulateContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: 'claimTokens',
          args: [BigInt(capId), BigInt(chainId || 1)],
          account: userAddress,
        })
        
        request = simulateResult.request
      }
      
      console.log("Simulated request:", request)
      const hash = await writeContractAsync(request)
      
      console.log("Transaction hash:", hash)
      return hash
    } catch (err: unknown) {
      console.error("Full error object:", err)
      // Try to extract more detailed error information
      let errorMessage = err instanceof Error ? err.message : String(err)
      
      // Check for specific error types
      if (err instanceof Error && 'cause' in err && err.cause) {
        console.error("Error cause:", err.cause)
        errorMessage += ` (Cause: ${err.cause})`
      }
      
      // Log the error stack if available
      if (err instanceof Error && err.stack) {
        console.error("Error stack:", err.stack)
      }
      
      console.error("Detailed claim error:", errorMessage)
      throw new Error(errorMessage)
    }
  }

  return {
    vestingData,
    isLoading: isLoading,
    error,
    claimTokens: handleClaim,
    loadTestnetData,
    substrateWallet,  // Expose the substrate wallet
  }
}
