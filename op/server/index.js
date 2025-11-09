import express from 'express'
import dotenv from 'dotenv'
import { fetchAndWriteEnvAndKey } from '../config_env.js'
import { initiatePaymentController } from '../controlers/initiatePayment.js'
import { completePaymentController } from '../controlers/completePayment.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// Step 1: Initiate payment and get confirmation URL
app.post('/send-payment', async (req, res) => {
  try {
    const { senderWalletUrl, receiverWalletUrl, amount, assetCode, assetScale } = req.body

    if (!senderWalletUrl || !receiverWalletUrl || !amount) {
      return res.status(400).json({
        success: false,
        error: 'senderWalletUrl, receiverWalletUrl and amount are required'
      })
    }

    if (typeof amount !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'amount must be a string (e.g., "10000")'
      })
    }

    const result = await initiatePaymentController(
      senderWalletUrl,
      receiverWalletUrl,
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
  res.json({ status: 'ok', service: 'Open Payments API' })
})

// Listen on 0.0.0.0 to work in Docker
const HOST = process.env.HOST || '0.0.0.0'
app.listen(PORT, HOST, () => {
  fetchAndWriteEnvAndKey().then(() => {
    console.log('Environment variables and private key loaded')
  }).catch((err) => {
    console.error('Error loading environment variables:', err)
  })
  console.log(`Server running on http://${HOST}:${PORT}`)
})
