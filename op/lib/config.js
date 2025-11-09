import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const KEY_ID = process.env.KEY_ID || 'default-key-id'

const WALLET_ADDRESS_URL = process.env.WALLET_ADDRESS_URL || 'https://example.com/.well-known/pay'

const PRIVATE_KEY_PATH = path.resolve(process.cwd(), process.env.PRIVATE_KEY_PATH || 'private.key')

const PAYMENT_FINISH_URI = process.env.PAYMENT_FINISH_URI || 'http://localhost:3000/confirm-payment'

export { KEY_ID, WALLET_ADDRESS_URL, PRIVATE_KEY_PATH, PAYMENT_FINISH_URI }
