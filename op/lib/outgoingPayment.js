import { getClient } from './client.js';

// Creates outgoing payment using finalized grant and quote
export async function createOutgoingPayment(
  resourceServerUrl,
  accessToken,
  walletAddressId,
  quoteId
) {
  const client = await getClient();
  
  return await client.outgoingPayment.create(
    {
      url: resourceServerUrl,
      accessToken,
    },
    {
      walletAddress: walletAddressId,
      quoteId,
    }
  );
}

