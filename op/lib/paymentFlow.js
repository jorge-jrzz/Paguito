import { initiatePayment } from './paymentFlowInit.js'
import { completePayment } from './paymentFlowComplete.js'

export async function sendPayment(senderWalletUrl, receiverWalletUrl, amount) {
  const paymentState = await initiatePayment(senderWalletUrl, receiverWalletUrl, amount, {
    includeInteract: false,
  })

  return completePayment(paymentState)
}
