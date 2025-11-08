import express from 'express'
import dotenv from 'dotenv'
import { fetchAndWriteEnvAndKey } from '../config_env.js'

// Cargar variables de entorno si el archivo .env ya existe
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

fetchAndWriteEnvAndKey().then(() => {
  console.log('Variables de entorno y clave privada cargadas correctamente')
}).catch((err) => {
  console.error('Error al cargar las variables de entorno y la clave privada:', err)
})

// Middleware para poder leer JSON en el body
app.use(express.json())

/**
 * Endpoint simple para que el LLM pueda enviar dinero.
 * 
 * POST /send-payment
 * 
 * Body esperado (JSON):
 * {
 *   "senderWalletUrl": "url de la wallet que envía",
 *   "receiverWalletUrl": "url de la wallet que recibe",
 *   "amount": 1000
 * }
 * 
 * Responde con un objeto dummy que simula la respuesta de la API de Open Payments.
 */
app.post('/send-payment', (req, res) => {
  const { senderWalletUrl, receiverWalletUrl, amount } = req.body

  // Validación de datos
  if (!senderWalletUrl || !receiverWalletUrl || typeof amount !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'senderWalletUrl, receiverWalletUrl y amount (solo monto, numérico) son requeridos'
    })
  }

  // Simulacion de respuesta
  const paymentId = 'dummy-payment-id-12345'
  const paymentUrl = `https://api.fake-openpayments.org/outgoing-payments/${paymentId}`

  // mock de respuesta
  const response = {
    success: true,
    outgoingPayment: {
      id: paymentUrl,
      paymentId: paymentId,
      senderWalletUrl,
      receiverWalletUrl,
      amount: amount,
      status: 'completed',                   
      completedAt: new Date().toISOString(), 
      quoteId: 'dummy-quote-id-abcde',       
      sentAmount: amount,
      
    },
    message: 'Pago simulado exitoso (dummy)'
  }

  res.json(response)
})

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Open Payments Simple API' })
})


// Servidor escuchando
app.listen(PORT, () => {
  console.log(`Servidor Open Payments Simple API corriendo en http://localhost:${PORT}`)
})
