// In-memory storage for pending payments
// In production, use a database or persistent cache
const pendingPayments = new Map();

export function savePendingPayment(paymentId, paymentState) {
  pendingPayments.set(paymentId, {
    ...paymentState,
    createdAt: new Date(),
  });
}

export function getPendingPayment(paymentId) {
  return pendingPayments.get(paymentId) || null;
}

export function deletePendingPayment(paymentId) {
  pendingPayments.delete(paymentId);
}

export function generatePaymentId() {
  return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

