import { type WalletClient } from 'viem'
import { BrowserProvider, JsonRpcSigner } from 'ethers'

export function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient
  const network = {
    chainId: chain!.id,
    name: chain!.name,
    ensAddress: chain!.contracts?.ensRegistry?.address,
  }
  const provider = new BrowserProvider(transport as any, network)
  const signer = new JsonRpcSigner(provider, account!.address)
  return signer
}

// Helper to convert a WalletClient to an Ethers v6 Provider
export function walletClientToProvider(walletClient: WalletClient) {
  const { chain, transport } = walletClient;
  const network = {
    chainId: chain!.id,
    name: chain!.name,
    ensAddress: chain!.contracts?.ensRegistry?.address,
  };
  return new BrowserProvider(transport as any, network);
}
