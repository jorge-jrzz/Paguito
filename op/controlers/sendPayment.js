import { sendPayment } from '../lib/paymentFlow.js';

/**
 * Controlador principal para enviar un pago
 * @param {string} senderWalletUrl - URL de la wallet del remitente
 * @param {string} receiverWalletUrl - URL de la wallet del receptor
 * @param {string} amount - Monto a enviar (como string, ej: "10000")
 * @param {string} assetCode - Código del activo (ej: "USD", "MXN")
 * @param {number} assetScale - Escala del activo (ej: 2 para centavos)
 * @returns {Promise<Object>} Resultado del pago
 */
export async function sendPaymentController(
  senderWalletUrl,
  receiverWalletUrl,
  amount,
  assetCode = 'USD',
  assetScale = 2
) {
  try {
    const result = await sendPayment(senderWalletUrl, receiverWalletUrl, {
      value: amount,
      assetCode,
      assetScale,
    });
    
    return {
      success: true,
      data: {
        incomingPaymentId: result.incomingPayment.id,
        quoteId: result.quote.id,
        outgoingPaymentId: result.outgoingPayment.id,
        debitAmount: result.quote.debitAmount,
        receiveAmount: result.quote.receiveAmount,
        ...(result.confirmationUrl && { confirmationUrl: result.confirmationUrl }),
      },
      ...(result.confirmationUrl && {
        requiresConfirmation: true,
        confirmationUrl: result.confirmationUrl,
        message: 'Pago iniciado. Visita la URL de confirmación para autorizar el pago.',
      }),
    };
  } catch (error) {
    console.error('❌ Error al enviar pago:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

