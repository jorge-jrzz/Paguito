import { randomUUID } from 'crypto'

const pendingPayments = new Map()

export function generatePaymentId() {
  return `payment_${randomUUID()}`
}

export function savePendingPayment(paymentId, paymentState) {
  pendingPayments.set(paymentId, {
    ...paymentState,
    paymentId,
    createdAt: Date.now(),
  })
}

export function getPendingPayment(paymentId) {
  return pendingPayments.get(paymentId)
}

export function deletePendingPayment(paymentId) {
  pendingPayments.delete(paymentId)
}
