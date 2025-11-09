import { completePayment } from '../lib/paymentFlowComplete.js';
import { getPendingPayment, deletePendingPayment } from '../lib/paymentState.js';

/**
 * Completes payment after user has authorized it
 * Finalizes the grant and creates the outgoing payment
 */
export async function completePaymentController(paymentId) {
  try {
    const paymentState = getPendingPayment(paymentId);
    
    if (!paymentState) {
      return {
        success: false,
        error: 'Payment not found or expired. Invalid paymentId.',
      };
    }
    
    const result = await completePayment(paymentState);
    deletePendingPayment(paymentId);
    
    return {
      success: true,
      data: {
        incomingPaymentId: result.incomingPayment.id,
        quoteId: result.quote.id,
        outgoingPaymentId: result.outgoingPayment.id,
        debitAmount: result.quote.debitAmount,
        receiveAmount: result.quote.receiveAmount,
      },
      message: 'Payment completed successfully',
    };
  } catch (error) {
    console.error('Error completing payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

