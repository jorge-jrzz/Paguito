import { finalizeGrant } from './grants.js';
import { createOutgoingPayment } from './outgoingPayment.js';

// Completes payment after user confirmation: finalizes grant and creates outgoing payment
export async function completePayment(paymentState) {
  const { outgoingPaymentGrant, senderWallet, quote, incomingPayment } = paymentState;
  
  console.log('Completing payment flow...');
  
  console.log('Finalizing grant...');
  const finalizedGrant = await finalizeGrant(outgoingPaymentGrant);
  console.log('Grant finalized');
  
  console.log('\n Step 5: Creating outgoing payment...');
  const outgoingPayment = await createOutgoingPayment(
    senderWallet.resourceServer,
    finalizedGrant.access_token.value,
    senderWallet.id,
    quote.id
  );
  console.log(`Outgoing payment created: ${outgoingPayment.id}`);
  
  console.log('\n Payment completed successfully!');
  
  return {
    incomingPayment,
    quote,
    outgoingPayment,
  };
}

