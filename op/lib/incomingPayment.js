import { getClient } from './client.js';

// Creates incoming payment for the receiver
export async function createIncomingPayment(
  resourceServerUrl,
  accessToken,
  walletAddressId,
  amount
) {
  const client = await getClient();
  
  return await client.incomingPayment.create(
    {
      url: resourceServerUrl,
      accessToken,
    },
    {
      walletAddress: walletAddressId,
      incomingAmount: {
        assetCode: amount.assetCode,
        assetScale: amount.assetScale,
        value: amount.value,
      },
    }
  );
}

