import { initiatePayment } from '../lib/paymentFlowInit.js';
import { generatePaymentId, savePendingPayment } from '../lib/paymentState.js';

/**
 * Initiates payment flow up to the confirmation step
 * Creates incoming payment, quote, and requests outgoing payment grant
 * Returns confirmation URL if user authorization is required
 */
export async function initiatePaymentController(
  senderWalletUrl,
  receiverWalletUrl,
  amount,
  assetCode = 'USD',
  assetScale = 2
) {
  try {
    const paymentState = await initiatePayment(senderWalletUrl, receiverWalletUrl, {
      value: amount,
      assetCode,
      assetScale,
    });
    
    if (paymentState.outgoingPaymentGrant.interact?.redirect) {
      const paymentId = generatePaymentId();
      savePendingPayment(paymentId, paymentState);
      
      return {
        success: true,
        requiresConfirmation: true,
        paymentId,
        confirmationUrl: paymentState.outgoingPaymentGrant.interact.redirect,
        message: 'Visit the confirmation URL to authorize the payment, then use /confirm-payment with the paymentId',
        data: {
          incomingPaymentId: paymentState.incomingPayment.id,
          quoteId: paymentState.quote.id,
          debitAmount: paymentState.quote.debitAmount,
          receiveAmount: paymentState.quote.receiveAmount,
        },
      };
    }
    
    return {
      success: false,
      error: 'Grant does not require confirmation but flow is incomplete',
    };
  } catch (error) {
    console.error('Error initiating payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

