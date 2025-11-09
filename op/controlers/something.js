import { sendPayment } from '../lib/paymentFlow.js';

/**
 * Example usage of the payment flow
 * Sends money from user A (paguito-sender) to user B (receptor-sdbk24)
 */
(async () => {
  try {
    const senderWalletUrl = 'https://ilp.interledger-test.dev/paguito-sender';
    const receiverWalletUrl = 'https://ilp.interledger-test.dev/receptor-sdbk24';
    const amount = {
      value: '10000', // 100.00 USD (10000 cents with scale 2)
      assetCode: 'USD',
      assetScale: 2,
    };
    
    const result = await sendPayment(senderWalletUrl, receiverWalletUrl, amount);
    
    console.log('\n Payment summary:');
    console.log('Incoming Payment:', result.incomingPayment.id);
    console.log('Quote:', result.quote.id);
    console.log('Outgoing Payment:', result.outgoingPayment.id);
  } catch (error) {
    console.error('Error in payment flow:', error);
    process.exit(1);
  }
})();
