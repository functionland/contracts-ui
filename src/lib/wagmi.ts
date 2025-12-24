import { createConfig, http } from 'wagmi'
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { 
  customSepolia, 
  iotexTestnet, 
  skaleTestnet, 
  hardhat,
  customMainnet, 
  customBase,
  customIotex,
  customSkale,
  CHAIN_IDS 
} from '@/config/chains'

// Define chains as a const array with at least one chain to satisfy the type requirement
const chains = [customMainnet, customBase, customIotex, customSkale, customSepolia, iotexTestnet, skaleTestnet, hardhat] as const

// Create wagmi config without WalletConnect (no projectId required)
// Uses injected wallets (MetaMask, Coinbase, etc.) which work on both desktop and mobile
export const config = createConfig({
  chains,
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: 'FULA Token Vesting Dashboard',
    }),
  ],
  transports: {
    [CHAIN_IDS.MAINNET]: http(customMainnet.rpcUrls.default.http[0]),
    [CHAIN_IDS.BASE]: http(customBase.rpcUrls.default.http[0]),
    [CHAIN_IDS.IOTEX]: http(customIotex.rpcUrls.default.http[0]),
    [CHAIN_IDS.SKALE]: http(customSkale.rpcUrls.default.http[0]),
    [CHAIN_IDS.SEPOLIA]: http(customSepolia.rpcUrls.default.http[0]),
    [CHAIN_IDS.IOTEX_TESTNET]: http(iotexTestnet.rpcUrls.default.http[0]),
    [CHAIN_IDS.SKALE_TESTNET]: http(skaleTestnet.rpcUrls.default.http[0]),
    [CHAIN_IDS.HARDHAT]: http(),
  },
})

export { chains }
