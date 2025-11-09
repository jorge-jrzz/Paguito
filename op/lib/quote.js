import { getClient } from './client.js';

// Creates quote for payment with currency conversion
export async function createQuote(
  resourceServerUrl,
  accessToken,
  walletAddressId,
  incomingPaymentId
) {
  const client = await getClient();
  
  return await client.quote.create(
    {
      url: resourceServerUrl,
      accessToken,
    },
    {
      walletAddress: walletAddressId,
      receiver: incomingPaymentId,
      method: 'ilp',
    }
  );
}

