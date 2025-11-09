import { createAuthenticatedClient } from '@interledger/open-payments';
import { loadConfig } from './config.js';

let clientInstance = null;

// Singleton pattern for authenticated Open Payments client
export async function getClient() {
  if (clientInstance) {
    return clientInstance;
  }
  
  const config = await loadConfig();
  
  clientInstance = await createAuthenticatedClient({
    walletAddressUrl: config.walletAddressUrl,
    privateKey: config.privateKey,
    keyId: config.keyId,
  });
  
  return clientInstance;
}

export async function getWalletAddress(walletAddressUrl) {
  const client = await getClient();
  return await client.walletAddress.get({ url: walletAddressUrl });
}

