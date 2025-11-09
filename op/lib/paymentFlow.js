import { getWalletAddress } from './client.js';
import { requestIncomingPaymentGrant, requestQuoteGrant, requestOutgoingPaymentGrant, finalizeGrant } from './grants.js';
import { createIncomingPayment } from './incomingPayment.js';
import { createQuote } from './quote.js';
import { createOutgoingPayment } from './outgoingPayment.js';

/**
 * Full flow for sending money from user A to user B
 * @param {string} senderWalletUrl - Sender's wallet URL (user A)
 * @param {string} receiverWalletUrl - Receiver's wallet URL (user B)
 * @param {Object} amount - Amount to send { value: string, assetCode: string, assetScale: number }
 * @returns {Promise<Object>} Result of the payment with incomingPayment, quote, and outgoingPayment
 */
export async function sendPayment(senderWalletUrl, receiverWalletUrl, amount) {
  console.log('Starting payment flow...');
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
  
  // 4. Request and finalize grant for outgoing payment
  console.log('\n Step 4: Requesting permissions for outgoing payment...');
  const outgoingPaymentGrant = await requestOutgoingPaymentGrant(
    senderWallet.authServer,
    quote.debitAmount,
    senderWallet.id
  );
  
  // Show confirmation URL if interaction is required
  if (outgoingPaymentGrant.interact?.redirect) {
    console.log('\n  ATTENTION: Manual payment confirmation required');
    
    console.log('🔗 CONFIRMATION URL:');
    console.log(outgoingPaymentGrant.interact.redirect);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    /* console.log('\n INSTRUCTIONS:');
    console.log('1. Open the URL above in your browser');
    console.log('2. Authorize the payment on the page');
    console.log('3. The code will continue automatically after authorization');
    console.log('\n⏳ Waiting for confirmation...\n'); */
  }
  
  console.log('Finalizing grant (this may require interaction)...');
  const finalizedGrant = await finalizeGrant(outgoingPaymentGrant);
  console.log('Grant finalized');
  
  // 5. Create outgoing payment
  console.log('\n Step 5: Creating outgoing payment...');
  const outgoingPayment = await createOutgoingPayment(
    senderWallet.resourceServer,
    finalizedGrant.access_token.value,
    senderWallet.id,
    quote.id
  );
  console.log(` Outgoing payment created: ${outgoingPayment.id}`);
  
  console.log('\n Payment completed successfully!');
  
  // Get confirmation URL if one existed
  const confirmationUrl = outgoingPaymentGrant.interact?.redirect || null;
  
  return {
    incomingPayment,
    quote,
    outgoingPayment,
    confirmationUrl, // Confirmation URL if interaction was required
  };
}
