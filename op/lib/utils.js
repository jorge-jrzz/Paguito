import { PAYMENT_FINISH_URI } from './config.js'

export function normalizeAmount(amountInput, defaults = {}) {
  const assetCode = defaults.assetCode || 'USD'
  const assetScale =
    typeof defaults.assetScale === 'number' ? defaults.assetScale : 2

  if (typeof amountInput === 'string' || typeof amountInput === 'number') {
    return {
      value: amountInput.toString(),
      assetCode,
      assetScale,
    }
  }

  if (typeof amountInput === 'object' && amountInput !== null) {
    const { value, assetCode: code, assetScale: scale } = amountInput
    if (value === undefined || value === null) {
      throw new Error('Amount object must include a value field')
    }

    return {
      value: value.toString(),
      assetCode: code || assetCode,
      assetScale: typeof scale === 'number' ? scale : assetScale,
    }
  }

  throw new Error('Invalid amount supplied')
}

export function buildFinishUri(baseUri, paymentId) {
  const uriToUse = baseUri || PAYMENT_FINISH_URI

  if (!uriToUse) {
    return undefined
  }

  try {
    const finishUrl = new URL(uriToUse)

    if (paymentId) {
      finishUrl.searchParams.set('paymentId', paymentId)
    }

    return finishUrl.toString()
  } catch (error) {
    return uriToUse
  }
}
