import fs from 'fs'
import { createAuthenticatedClient } from '@interledger/open-payments'
import { KEY_ID, WALLET_ADDRESS_URL, PRIVATE_KEY_PATH } from './config.js'

let clientPromise

function readPrivateKey() {
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    return fs.readFileSync(PRIVATE_KEY_PATH, 'utf8')
  }

  return PRIVATE_KEY_PATH
}

async function createClient() {
  const privateKey = readPrivateKey()
  return createAuthenticatedClient({
    keyId: KEY_ID,
    walletAddressUrl: WALLET_ADDRESS_URL,
    privateKey,
  })
}

export function getAuthenticatedClient() {
  if (!clientPromise) {
    clientPromise = createClient()
  }
  return clientPromise
}
