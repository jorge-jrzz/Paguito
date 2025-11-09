import { isFinalizedGrant } from '@interledger/open-payments';
import { getClient } from './client.js';

// Request grant to create incoming payment
export async function requestIncomingPaymentGrant(authServerUrl) {
  const client = await getClient();
  
  const grant = await client.grant.request(
    { url: authServerUrl },
    {
      access_token: {
        access: [
          {
            type: 'incoming-payment',
            actions: ['create'],
          },
        ],
      },
    }
  );
  
  if (!isFinalizedGrant(grant)) {
    throw new Error('Incoming payment grant was not successfully finalized');
  }
  
  return grant;
}

// Request grant to create quote
export async function requestQuoteGrant(authServerUrl) {
  const client = await getClient();
  
  const grant = await client.grant.request(
    { url: authServerUrl },
    {
      access_token: {
        access: [
          {
            type: 'quote',
            actions: ['create'],
          },
        ],
      },
    }
  );
  
  if (!isFinalizedGrant(grant)) {
    throw new Error('Quote grant was not successfully finalized');
  }
  
  return grant;
}

// Request grant to create outgoing payment (may require user interaction)
export async function requestOutgoingPaymentGrant(authServerUrl, debitAmount, walletAddressId) {
  const client = await getClient();
  
  const grant = await client.grant.request(
    { url: authServerUrl },
    {
      access_token: {
        access: [
          {
            type: 'outgoing-payment',
            actions: ['create'],
            limits: {
              debitAmount,
            },
            identifier: walletAddressId,
          },
        ],
      },
      interact: {
        start: ['redirect'],
      },
    }
  );
  
  return grant;
}

export function getInteractionUrl(grant) {
  return grant.interact?.redirect || null;
}

// Finalizes grant that requires user interaction
// Polls the grant until it's finalized or max attempts reached
export async function finalizeGrant(grant, maxAttempts = 20) {
  const client = await getClient();
  
  if (isFinalizedGrant(grant)) {
    return grant;
  }
  
  let currentGrant = grant;
  let attempt = 0;
  
  const interactionUrl = getInteractionUrl(grant);
  if (interactionUrl) {
    console.log('\n  Confirmation URL:', interactionUrl);
  }
  
  while (attempt < maxAttempts) {
    attempt++;
    
    if (currentGrant.continue?.wait) {
      const waitTime = (currentGrant.continue.wait + 2) * 1000;
      console.log(`Waiting ${currentGrant.continue.wait + 2} second(s) before continuing (attempt ${attempt})...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    } else {
      const defaultWaitTime = 3000;
      console.log(`Waiting ${defaultWaitTime / 1000} second(s) before continuing (attempt ${attempt})...`);
      await new Promise((resolve) => setTimeout(resolve, defaultWaitTime));
    }
    
    const continueParams = {
      url: currentGrant.continue.uri,
      accessToken: currentGrant.continue.access_token.value,
    };
    
    if (currentGrant.interact?.finish) {
      continueParams.finish = currentGrant.interact.finish;
    }
    
    try {
      currentGrant = await client.grant.continue(continueParams);
      
      if (isFinalizedGrant(currentGrant)) {
        console.log('Grant finalized successfully');
        return currentGrant;
      }
      
      console.log('Grant not finalized yet, continuing...');
    } catch (error) {
      if (error.code === 'too_fast') {
        const waitTime = currentGrant.continue?.wait 
          ? (currentGrant.continue.wait + 3) * 1000 
          : 5000;
        console.log(`"too_fast" error, waiting ${waitTime / 1000} seconds before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error(`Could not finalize the grant after ${maxAttempts} attempts`);
}

