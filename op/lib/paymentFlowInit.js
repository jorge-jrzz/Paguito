import { getWalletAddress } from './client.js';
import { requestIncomingPaymentGrant, requestQuoteGrant, requestOutgoingPaymentGrant } from './grants.js';
import { createIncomingPayment } from './incomingPayment.js';
import { createQuote } from './quote.js';

// Initiates payment flow: gets wallets, creates incoming payment and quote, requests outgoing grant
// Stops before finalizing grant (requires user confirmation)
export async function initiatePayment(senderWalletUrl, receiverWalletUrl, amount) {
  console.log('Initiating payment flow...');
  console.log(`   Sender: ${senderWalletUrl}`);
  console.log(`   Receiver: ${receiverWalletUrl}`);
  console.log(`   Amount: ${amount.value} ${amount.assetCode}`);
  
  // 1. Get wallet information
  console.log('\n Step 1: Getting wallet information...');
  const senderWallet = await getWalletAddress(senderWalletUrl);
  const receiverWallet = await getWalletAddress(receiverWalletUrl);
  console.log('Wallets obtained');
  
  // 2. Create incoming payment for receiver
  console.log('\nStep 2: Creating incoming payment for the receiver...');
  const incomingPaymentGrant = await requestIncomingPaymentGrant(receiverWallet.authServer);
  const incomingPayment = await createIncomingPayment(
    receiverWallet.resourceServer,
    incomingPaymentGrant.access_token.value,
    receiverWallet.id,
    {
      value: amount.value,
      assetCode: receiverWallet.assetCode,
      assetScale: receiverWallet.assetScale,
    }
  );
  console.log(`Incoming payment created: ${incomingPayment.id}`);
  
  // 3. Create quote
  console.log('\n Step 3: Creating quote...');
  const quoteGrant = await requestQuoteGrant(senderWallet.authServer);
  const quote = await createQuote(
    receiverWallet.resourceServer,
    quoteGrant.access_token.value,
    senderWallet.id,
    incomingPayment.id
  );
  console.log(`Quote created: ${quote.id}`);
  console.log(`   Amount to debit: ${quote.debitAmount.value} ${quote.debitAmount.assetCode}`);
  console.log(`   Amount to receive: ${quote.receiveAmount.value} ${quote.receiveAmount.assetCode}`);
  
  // 4. Request grant for outgoing payment
  console.log('\n Step 4: Requesting permissions for outgoing payment...');
  const outgoingPaymentGrant = await requestOutgoingPaymentGrant(
    senderWallet.authServer,
    quote.debitAmount,
    senderWallet.id
  );
  
  return {
    outgoingPaymentGrant,
    senderWallet,
    receiverWallet,
    quote,
    incomingPayment,
  };
}

