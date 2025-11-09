import { getAuthenticatedClient } from './client.js'

export async function completePayment(paymentState, interactRef) {
  const client = await getAuthenticatedClient()

  if (paymentState.outgoingPaymentGrant.interact && !interactRef) {
    throw new Error('interact_ref is required to continue the outgoing payment grant')
  }

  const continuation = paymentState.outgoingPaymentGrant.continue

  if (!continuation) {
    throw new Error('Outgoing payment grant does not contain continuation information')
  }

  const continuationBody = interactRef ? { interact_ref: interactRef } : {}

  const finalizedGrant = await client.grant.continue(
    {
      url: continuation.uri,
      accessToken: continuation.access_token.value,
    },
    continuationBody
  )

  const outgoingPayment = await client.outgoingPayment.create(
    {
      url: paymentState.senderWallet.resourceServer,
      accessToken: finalizedGrant.access_token.value,
    },
    {
      walletAddress: paymentState.senderWallet.id,
      quoteId: paymentState.quote.id,
      metadata: {
        paymentId: paymentState.paymentId,
        ...(paymentState.outgoingPaymentMetadata ?? {}),
      },
    }
  )

  return {
    incomingPayment: paymentState.incomingPayment,
    quote: paymentState.quote,
    outgoingPayment,
    grant: finalizedGrant,
  }
}
