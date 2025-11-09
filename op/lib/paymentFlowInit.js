import { randomUUID } from 'crypto'
import { getAuthenticatedClient } from './client.js'
import { normalizeAmount, buildFinishUri } from './utils.js'

export async function initiatePayment(
  senderWalletUrl,
  receiverWalletUrl,
  amount,
  options = {}
) {
  const includeInteract = options.includeInteract ?? true

  const client = await getAuthenticatedClient()
  const normalizedAmount = normalizeAmount(amount, {
    assetCode: options.assetCode,
    assetScale: options.assetScale,
  })

  const [senderWallet, receiverWallet] = await Promise.all([
    client.walletAddress.get({ url: senderWalletUrl }),
    client.walletAddress.get({ url: receiverWalletUrl }),
  ])

  const incomingPaymentGrant = await client.grant.request(
    { url: receiverWallet.authServer },
    {
      access_token: {
        access: [
          {
            type: 'incoming-payment',
            actions: ['create', 'read'],
          },
        ],
      },
    }
  )

  const incomingPayment = await client.incomingPayment.create(
    {
      url: receiverWallet.resourceServer,
      accessToken: incomingPaymentGrant.access_token.value,
    },
    {
      walletAddress: receiverWallet.id,
      incomingAmount: normalizedAmount,
      metadata: options.receiverMetadata,
    }
  )

  const quoteGrant = await client.grant.request(
    { url: senderWallet.authServer },
    {
      access_token: {
        access: [
          {
            type: 'quote',
            actions: ['create', 'read'],
          },
        ],
      },
    }
  )

  const quote = await client.quote.create(
    {
      url: senderWallet.resourceServer,
      accessToken: quoteGrant.access_token.value,
    },
    {
      walletAddress: senderWallet.id,
      receiver: incomingPayment.id,
      method: 'ilp',
    }
  )

  const grantRequest = {
    access_token: {
      access: [
        {
          type: 'outgoing-payment',
          actions: ['read', 'create', 'list'],
          identifier: senderWallet.id,
          limits: {
            debitAmount: quote.debitAmount,
          },
        },
      ],
    },
  }

  let finishUri

  if (includeInteract) {
    finishUri = buildFinishUri(options.finishUri, options.paymentId)
    grantRequest.interact = {
      start: ['redirect'],
      finish: {
        method: 'redirect',
        uri: finishUri,
        nonce: options.interactNonce ?? randomUUID(),
      },
    }
  }

  const outgoingPaymentGrant = await client.grant.request(
    { url: senderWallet.authServer },
    grantRequest
  )

  return {
    paymentId: options.paymentId,
    senderWallet,
    receiverWallet,
    incomingPayment,
    quote,
    outgoingPaymentGrant,
    amount: normalizedAmount,
    finishUri,
  }
}
