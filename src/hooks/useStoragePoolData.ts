import { useState, useEffect, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { STORAGE_POOL_ABI } from '@/config/abis'
import { STORAGE_POOL_CONTRACT_ADDRESSES } from '@/config/contracts'
import { useChainId } from 'wagmi'
import { ethers, hexlify, getBytes } from 'ethers'
import { base58btc } from 'multiformats/bases/base58'
import * as multibaseBytes from "multiformats/bytes";

export interface PoolMemberInfo {
  address: string
  memberIndex: number
  peerIds: Array<{
    peerId: string // Display as string
    peerIdBytes32: string // Store as bytes32 hex
    lockedTokens: string
  }>
  totalPeerIds: number
}



// Utility functions for IPFS PeerID conversion
// PeerIDs are 34-byte multihashes: 2-byte prefix (0x1220) + 32-byte digest
// We store only the 32-byte digest on-chain and reconstruct the full PeerID off-chain

/**
 * Converts a full IPFS PeerID to bytes32 digest for on-chain storage.
 * Supports both CIDv1 (Ed25519) and 34-byte multihash PeerIDs.
 */
export const peerIdToBytes32 = (peerId: string): string => {
  try {
    // Normalize to multibase format (starts with z)
    if (!peerId.startsWith("z")) {
      peerId = `z${peerId}`;
    }

    const decoded = base58btc.decode(peerId);
    console.log({ decoded });

    let bytes32: string | undefined = undefined;

    // CIDv1 (Ed25519 public key) format
    const CID_HEADER = [0x00, 0x24, 0x08, 0x01, 0x12];
    const isCIDv1 = CID_HEADER.every((v, i) => decoded[i] === v);

    if (isCIDv1 && decoded.length >= 37) {
      const pubkey = decoded.slice(decoded.length - 32);
      bytes32 = hexlify(pubkey);
    }

    // Legacy multihash format
    if (decoded.length === 34 && decoded[0] === 0x12 && decoded[1] === 0x20) {
      const digest = decoded.slice(2);
      bytes32 = hexlify(digest);
    }

    if (!bytes32) {
      throw new Error(`Unsupported PeerID format or unexpected length: ${decoded.length}`);
    }

    // Reversible check
    const reconstructed = bytes32ToPeerId(bytes32);
    if (reconstructed !== peerId.slice(1)) {
      throw new Error(`Could not revert the encoded bytes32 back to original PeerID. Got: ${reconstructed}`);
    }

    return bytes32;
  } catch (err) {
    console.error("Failed to convert PeerID to bytes32:", peerId, err);
    throw err;
  }
};

/**
 * Reconstructs the full Base58 PeerID from a bytes32 digest retrieved from the contract.
 * Always returns a multibase-style PeerID (without the 'z' prefix by default).
 */
export const bytes32ToPeerId = (digestBytes32: string): string => {
  try {
    const pubkeyBytes = getBytes(digestBytes32);

    const full = Uint8Array.from([
      0x00, 0x24,       // CIDv1 prefix
      0x08, 0x01,       // ed25519-pub key
      0x12, 0x20,       // multihash: sha2-256, 32 bytes
      ...pubkeyBytes,
    ]);

    // Return without the multibase 'z' prefix (match legacy PeerID style)
    return base58btc.encode(full).slice(1);
  } catch (err) {
    console.error("Failed to convert bytes32 to PeerID:", digestBytes32, err);
    return digestBytes32;
  }
};

export interface PoolInfo {
  id: number
  name: string
  region: string
  requiredTokens: bigint
  minPingTime: bigint
  maxChallengeResponsePeriod: number
  creator: string
  memberCount: number
  maxMembers: number
  members: PoolMemberInfo[] // Array of member info with peer IDs
  joinRequests: JoinRequestInfo[]
}

export interface JoinRequestInfo {
  account: string
  poolId: number
  timestamp: number
  status: number
  approvals: number
  rejections: number
  peerId: string
  index: number
}

export function useStoragePoolData() {
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const [pools, setPools] = useState<PoolInfo[]>([])
  const [poolIds, setPoolIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contractAddress = STORAGE_POOL_CONTRACT_ADDRESSES[chainId]

  // Fetch pool IDs by iterating from 1 until we get empty data (poolId 0)
  const fetchPoolIds = useCallback(async () => {
    if (!contractAddress || !publicClient) return []

    try {
      console.log('Fetching pool data from contract:', contractAddress)
      const ids: number[] = []
      let poolId = 1
      let consecutiveEmpty = 0
      const maxConsecutiveEmpty = 3 // Check 3 more after finding empty to ensure we didn't hit deleted data

      while (consecutiveEmpty < maxConsecutiveEmpty) {
        try {
          const poolData = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: STORAGE_POOL_ABI,
            functionName: 'pools',
            args: [poolId]
          } as any) as unknown as [string, number, number, number, number, bigint, bigint, string, string]

          // Check if pool exists (id should be non-zero for existing pools)
          if (poolData && poolData[1] !== 0) { // poolData[1] is the id field
            console.log(`Found pool ${poolId}:`, poolData)
            ids.push(poolId)
            consecutiveEmpty = 0 // Reset counter when we find a pool
          } else {
            console.log(`Empty pool slot at ${poolId}`)
            consecutiveEmpty++
          }

          poolId++
        } catch (err) {
          console.log(`Error reading pool ${poolId}:`, err)
          consecutiveEmpty++
          poolId++
        }
      }

      console.log('Total pool IDs found:', ids)
      return ids
    } catch (err) {
      console.error('Error fetching pool IDs:', err)
      return []
    }
  }, [contractAddress, publicClient])

  // Fetch all pool data using direct pool reading
  const fetchPoolsData = useCallback(async () => {
    if (!contractAddress || !publicClient) {
      setPools([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get pool IDs and their data directly
      const currentPoolIds = await fetchPoolIds()
      setPoolIds(currentPoolIds)

      if (currentPoolIds.length === 0) {
        setPools([])
        setIsLoading(false)
        return
      }

      const poolsData: PoolInfo[] = []

      // Fetch each pool's data directly from the pools mapping
      for (const poolId of currentPoolIds) {
        try {
          const poolData = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: STORAGE_POOL_ABI,
            functionName: 'pools',
            args: [poolId]
          } as any) as unknown as [string, number, number, number, number, bigint, bigint, string, string]

          // Parse the pool data according to the contract structure:
          // [creator, id, maxChallengeResponsePeriod, memberCount, maxMembers, requiredTokens, minPingTime, name, region]
          const [creator, , maxChallengeResponsePeriod, memberCount, maxMembers, requiredTokens, minPingTime, name, region] = poolData

          // Get join requests for this pool
          const joinRequests: JoinRequestInfo[] = []
          let joinRequestIndex = 0

          // Fetch join request keys
          while (joinRequestIndex < 100) { // Limit to prevent infinite loops
            try {
              const peerId = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: STORAGE_POOL_ABI,
                functionName: 'joinRequestKeys',
                args: [poolId, BigInt(joinRequestIndex)]
              } as any) as string

              if (!peerId) break

              // Get the join request details
              const joinRequest = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: STORAGE_POOL_ABI,
                functionName: 'joinRequests',
                args: [poolId, peerId]
              } as any) as unknown as [string, number, number, number, number, number, string, number]

              if (joinRequest && joinRequest[0] !== '0x0000000000000000000000000000000000000000') {
                joinRequests.push({
                  account: joinRequest[0],
                  poolId: joinRequest[1],
                  timestamp: joinRequest[2],
                  status: joinRequest[3],
                  approvals: joinRequest[4],
                  rejections: joinRequest[5],
                  peerId: joinRequest[6],
                  index: joinRequest[7],
                })
              }

              joinRequestIndex++
            } catch {
              break
            }
          }

          poolsData.push({
            id: poolId,
            name: name || `Pool ${poolId}`,
            region: region || 'Unknown',
            requiredTokens: requiredTokens || BigInt(0),
            minPingTime: minPingTime || BigInt(0),
            maxChallengeResponsePeriod: maxChallengeResponsePeriod || 0,
            creator: creator || '0x0000000000000000000000000000000000000000',
            memberCount: memberCount || 0,
            maxMembers: maxMembers || 0,
            members: [], // TODO: Fetch actual member list - contract doesn't expose this directly
            joinRequests,
          })

          console.log(`Pool ${poolId} data:`, {
            name,
            region,
            requiredTokens: requiredTokens?.toString(),
            memberCount,
            maxMembers,
            creator,
            rawPoolData: poolData,
            requiredTokensType: typeof requiredTokens,
            requiredTokensValue: requiredTokens,
            dataStructure: {
              0: poolData[0], // creator
              1: poolData[1], // id
              2: poolData[2], // maxChallengeResponsePeriod
              3: poolData[3], // memberCount
              4: poolData[4], // maxMembers
              5: poolData[5], // requiredTokens
              6: poolData[6], // minPingTime
              7: poolData[7], // name
              8: poolData[8], // region
            }
          })

        } catch (err) {
          console.error(`Error fetching pool ${poolId}:`, err)
        }
      }

      setPools(poolsData)
    } catch (err) {
      console.error('Error fetching pools data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch pools data')
    } finally {
      setIsLoading(false)
    }
  }, [contractAddress, publicClient, fetchPoolIds])

  // Fetch specific pool data
  const fetchPoolData = useCallback(async (poolId: number): Promise<PoolInfo | null> => {
    if (!contractAddress) return null

    try {
      const existingPool = pools.find(p => p.id === poolId)
      if (existingPool) return existingPool

      // If not in cache, trigger a refresh
      await fetchPoolsData()
      return pools.find(p => p.id === poolId) || null
    } catch (err) {
      console.error(`Error fetching pool ${poolId} data:`, err)
      return null
    }
  }, [contractAddress, pools, fetchPoolsData])

  // Get join requests for all pools
  const getAllJoinRequests = useCallback((): JoinRequestInfo[] => {
    const allRequests: JoinRequestInfo[] = []

    pools.forEach(pool => {
      pool.joinRequests.forEach(request => {
        allRequests.push(request)
      })
    })

    return allRequests
  }, [pools])

  // Refresh all data
  const refreshData = useCallback(async () => {
    await fetchPoolsData()
  }, [fetchPoolsData])

  // Auto-fetch on mount
  useEffect(() => {
    fetchPoolsData()
  }, [fetchPoolsData])

  // Function to fetch complete member details using the getter functions you provided
  const fetchPoolMembers = useCallback(async (poolId: number): Promise<PoolMemberInfo[]> => {
    if (!contractAddress || !publicClient) return []

    try {
      console.log(`Fetching complete member details for pool ${poolId} using getter functions`)

      // Step 1: Get all member addresses using getPoolMembers
      const memberAddresses = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: STORAGE_POOL_ABI,
        functionName: 'getPoolMembers',
        args: [poolId]
      } as any) as string[]

      console.log(`Found ${memberAddresses.length} members in pool ${poolId}:`, memberAddresses)

      if (memberAddresses.length === 0) {
        return []
      }

      const members: PoolMemberInfo[] = []

      // Step 2: For each member, get their complete details
      for (const memberAddress of memberAddresses) {
        try {
          console.log(`Fetching details for member: ${memberAddress}`)

          // Get member index
          const memberIndex = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: STORAGE_POOL_ABI,
            functionName: 'getMemberIndex',
            args: [poolId, memberAddress]
          } as any) as bigint

          // Get all peer IDs for this member (returns bytes32[])
          const peerIdBytes32Array = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: STORAGE_POOL_ABI,
            functionName: 'getMemberPeerIds',
            args: [poolId, memberAddress]
          } as any) as string[]

          console.log(`Member ${memberAddress} has ${peerIdBytes32Array.length} peer IDs (as bytes32)`)

          const peerDetails = []

          // Step 3: For each peer ID hash, get the locked tokens
          for (const peerIdBytes32 of peerIdBytes32Array) {
            try {
              // Get peer info (member address and locked tokens)
              const [, lockedTokens] = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: STORAGE_POOL_ABI,
                functionName: 'getPeerIdInfo',
                args: [poolId, peerIdBytes32]
              } as any) as [string, bigint]

              // Convert bytes32 to readable string
              let displayPeerId = peerIdBytes32
              try {
                console.log(peerIdBytes32);
                displayPeerId = bytes32ToPeerId(peerIdBytes32);
              } catch (err) {
                console.warn('Failed to decode peerId:', peerIdBytes32, err);
              }

              peerDetails.push({
                peerId: displayPeerId, // Display decoded string or hash
                peerIdBytes32: peerIdBytes32,
                lockedTokens: lockedTokens.toString()
              })

              console.log(`Peer hash ${peerIdBytes32} has ${lockedTokens.toString()} locked tokens`)

            } catch (peerError) {
              console.error(`Error fetching info for peer ${peerIdBytes32}:`, peerError)
              // Still add the peer ID even if we can't get locked tokens
              peerDetails.push({
                peerId: peerIdBytes32,
                peerIdBytes32: peerIdBytes32,
                lockedTokens: '0'
              })
            }
          }

          members.push({
            address: memberAddress,
            memberIndex: Number(memberIndex),
            peerIds: peerDetails,
            totalPeerIds: peerIdBytes32Array.length
          })

          console.log(`Successfully fetched details for member ${memberAddress}`)

        } catch (memberError) {
          console.error(`Error fetching details for member ${memberAddress}:`, memberError)
          // Still add the member with basic info
          members.push({
            address: memberAddress,
            memberIndex: 0,
            peerIds: [],
            totalPeerIds: 0
          })
        }
      }

      console.log(`Successfully fetched complete details for ${members.length} members in pool ${poolId}`)
      return members

    } catch (err) {
      console.error(`Error fetching members for pool ${poolId}:`, err)
      return []
    }
  }, [contractAddress, publicClient])

  // Function to fetch a specific page of members (for pagination)
  const fetchPoolMembersPage = useCallback(async (poolId: number, startIndex: number, count: number): Promise<PoolMemberInfo[]> => {
    if (!contractAddress || !publicClient) return []

    try {
      console.log(`Fetching members page for pool ${poolId}: ${startIndex} to ${startIndex + count - 1}`)

      // Step 1: Get all member addresses using getPoolMembers
      const allMemberAddresses = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: STORAGE_POOL_ABI,
        functionName: 'getPoolMembers',
        args: [poolId]
      } as any) as string[]

      console.log(`Total members in pool ${poolId}: ${allMemberAddresses.length}`)

      // Step 2: Get only the members for this page
      const pageMemberAddresses = allMemberAddresses.slice(startIndex, startIndex + count)

      if (pageMemberAddresses.length === 0) {
        return []
      }

      const members: PoolMemberInfo[] = []

      // Step 3: For each member in this page, get their complete details
      for (const memberAddress of pageMemberAddresses) {
        try {
          console.log(`Fetching details for member: ${memberAddress}`)

          // Get member index
          const memberIndex = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: STORAGE_POOL_ABI,
            functionName: 'getMemberIndex',
            args: [poolId, memberAddress]
          } as any) as bigint

          // Get all peer IDs for this member (returns bytes32[])
          const peerIdBytes32Array = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: STORAGE_POOL_ABI,
            functionName: 'getMemberPeerIds',
            args: [poolId, memberAddress]
          } as any) as string[]

          console.log(`Member ${memberAddress} has ${peerIdBytes32Array.length} peer IDs`)

          const peerDetails = []

          // Step 4: For each peer ID hash, get the locked tokens
          for (const peerIdBytes32 of peerIdBytes32Array) {
            try {
              // Get peer info (member address and locked tokens)
              const [, lockedTokens] = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: STORAGE_POOL_ABI,
                functionName: 'getPeerIdInfo',
                args: [poolId, peerIdBytes32]
              } as any) as [string, bigint]

              // Convert bytes32 digest back to full PeerID
              const displayPeerId = bytes32ToPeerId(peerIdBytes32)

              peerDetails.push({
                peerId: displayPeerId,
                peerIdBytes32: peerIdBytes32,
                lockedTokens: lockedTokens.toString()
              })

              console.log(`Peer ${displayPeerId} has ${lockedTokens.toString()} locked tokens`)

            } catch (peerError) {
              console.error(`Error fetching info for peer ${peerIdBytes32}:`, peerError)
              // Still add the peer ID even if we can't get locked tokens
              peerDetails.push({
                peerId: bytes32ToPeerId(peerIdBytes32),
                peerIdBytes32: peerIdBytes32,
                lockedTokens: '0'
              })
            }
          }

          members.push({
            address: memberAddress,
            memberIndex: Number(memberIndex),
            peerIds: peerDetails,
            totalPeerIds: peerIdBytes32Array.length
          })

          console.log(`Successfully fetched details for member ${memberAddress}`)

        } catch (memberError) {
          console.error(`Error fetching details for member ${memberAddress}:`, memberError)
          // Still add the member with basic info
          members.push({
            address: memberAddress,
            memberIndex: startIndex + members.length,
            peerIds: [],
            totalPeerIds: 0
          })
        }
      }

      console.log(`Successfully fetched page details for ${members.length} members in pool ${poolId}`)
      return members

    } catch (err) {
      console.error(`Error fetching members page for pool ${poolId}:`, err)
      return []
    }
  }, [contractAddress, publicClient])

  return {
    pools,
    poolIds,
    isLoading,
    error,
    poolCount: poolIds.length,
    fetchPoolData,
    getAllJoinRequests,
    refreshData,
    fetchPoolMembers,
    fetchPoolMembersPage,
  }
}

// Hook for checking if user is member of specific pool
export function usePoolMembership(_poolId: number, userAddress?: string) {
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const contractAddress = STORAGE_POOL_CONTRACT_ADDRESSES[chainId]
  const [isMember, setIsMember] = useState(false)
  const [hasJoinRequest, setHasJoinRequest] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const checkMembership = useCallback(async () => {
    if (!contractAddress || !userAddress || !publicClient) return

    setIsLoading(true)
    try {
      // Check if user is member of any pool using the available function
      const memberOfAnyPool = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: STORAGE_POOL_ABI,
        functionName: 'isMemberOfAnyPool',
        args: [userAddress]
      } as any)

      // For specific pool membership, we'd need to check the pool's member list
      // This is a simplified check - in practice you'd iterate through join requests
      setIsMember(!!memberOfAnyPool)
      setHasJoinRequest(false) // Would need to check join requests array
    } catch (err) {
      console.error('Error checking membership:', err)
      setIsMember(false)
      setHasJoinRequest(false)
    } finally {
      setIsLoading(false)
    }
  }, [contractAddress, userAddress, publicClient])

  useEffect(() => {
    checkMembership()
  }, [checkMembership])

  return {
    isMember,
    hasJoinRequest,
    isLoading,
    refetchMembership: checkMembership,
    refetchJoinRequest: checkMembership,
  }
}
