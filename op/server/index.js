import express from 'express'
import dotenv from 'dotenv'
import fs from 'fs'
import { fetchAndWriteEnvAndKey } from '../config_env.js'
import { initiatePaymentController } from '../controlers/initiatePayment.js'
import { completePaymentController } from '../controlers/completePayment.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// Wallet address mapping: name -> wallet URL
const WALLET_MAPPING = {
  'santiago bocanegra': 'https://ilp.interledger-test.dev/receptor-sdbk24',
  'amazon': 'https://ilp.interledger-test.dev/receptor-sdbk24',
  // Default wallet for any other name
  'default': 'https://ilp.interledger-test.dev/receptor-sdbk24'
}

// Sender wallet is always the same
const SENDER_WALLET_URL = 'https://ilp.interledger-test.dev/paguito-sender'

// Helper function to get wallet address from name
function getWalletAddressFromName(name) {
  if (!name || typeof name !== 'string') {
    return WALLET_MAPPING.default
  }
  
  const normalizedName = name.toLowerCase().trim()
  
  // Check for exact matches first
  if (WALLET_MAPPING[normalizedName]) {
    return WALLET_MAPPING[normalizedName]
  }
  
  // Check for partial matches
  if (normalizedName.includes('santiago') && normalizedName.includes('bocanegra')) {
    return WALLET_MAPPING['santiago bocanegra']
  }
  
  if (normalizedName.includes('amazon')) {
    return WALLET_MAPPING['amazon']
  }
  
  // Default wallet
  return WALLET_MAPPING.default
}

// Step 1: Initiate payment and get confirmation URL
app.post('/send-payment', async (req, res) => {
  try {
    const { receiverWalletUrl, amount, assetCode, assetScale } = req.body

    if (!receiverWalletUrl || !amount) {
      return res.status(400).json({
        success: false,
        error: 'receiverWalletUrl (person name) and amount are required'
      })
    }

    if (typeof amount !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'amount must be a string (e.g., "10000")'
      })
    }

    // Map receiver name to wallet address
    const actualReceiverWalletUrl = getWalletAddressFromName(receiverWalletUrl)
    
    // Sender is always the same
    const senderWalletUrl = SENDER_WALLET_URL

    const result = await initiatePaymentController(
      senderWalletUrl,
      actualReceiverWalletUrl,
      amount,
      assetCode || 'USD',
      assetScale || 2
    )

    // If result has paymentId and confirmationUrl, it's successful
    if (result.paymentId && result.confirmationUrl) {
      res.json({
        paymentId: result.paymentId,
        confirmationUrl: result.confirmationUrl
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to initiate payment'
      })
    }
  } catch (error) {
    console.error('Error in /send-payment:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    })
  }
})

// Step 2: Complete payment after user confirmation
app.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentId } = req.body

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'paymentId is required'
      })
    }

    const result = await completePaymentController(paymentId)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error('Error in /confirm-payment:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    })
  }
})

app.get('/health', (req, res) => {
  // Get all environment variables
  const envVars = { ...process.env };
  
  // List of keys that should be hidden (secrets)
  const secretKeys = [
    'PRIVATE_KEY_CONTENT',
    'OPENAI_API_KEY',
    'META_ACCESS_TOKEN',
    'META_APP_SECRET',
    'API_KEY',
    'SECRET',
    'TOKEN',
    'PASSWORD',
    'PASS',
    'KEY',
    'PRIVATE'
  ];
  
  // Filter and mask sensitive variables
  const safeEnvVars = {};
  Object.keys(envVars).forEach(key => {
    const upperKey = key.toUpperCase();
    const isSecret = secretKeys.some(secret => upperKey.includes(secret));
    
    if (isSecret) {
      // Show that the variable exists but mask its value
      const value = envVars[key];
      safeEnvVars[key] = value ? `***${value.slice(-4)}` : '***';
    } else {
      safeEnvVars[key] = envVars[key];
    }
  });
  
  // Check if .env file exists
  const envFileExists = fs.existsSync('.env');
  const envFileContent = envFileExists ? fs.readFileSync('.env', 'utf8') : null;
  
  res.json({
    status: 'ok',
    service: 'Open Payments API',
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      host: process.env.HOST,
    },
    envFile: {
      exists: envFileExists,
      variablesCount: envFileContent ? envFileContent.split('\n').filter(line => line.trim() && !line.startsWith('#')).length : 0
    },
    environmentVariables: safeEnvVars,
    loadedVariables: Object.keys(safeEnvVars).length
  })
})

// Listen on 0.0.0.0 to work in Docker
const HOST = process.env.HOST || '0.0.0.0'

// Load configuration before starting server
async function startServer() {
  try {
    await fetchAndWriteEnvAndKey()
    console.log('Environment variables and private key loaded successfully')
    
    // Reload dotenv to ensure all variables are available
    dotenv.config()
    
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`)
    })
  } catch (err) {
    console.error('Error loading environment variables:', err)
    console.error('Server will not start without configuration')
    process.exit(1)
  }
}

startServer()
