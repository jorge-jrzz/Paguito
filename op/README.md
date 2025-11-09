# Open Payments API

REST API for peer-to-peer payments using Interledger Open Payments protocol.

## Overview

This API enables sending money between two wallet addresses. The payment flow is split into two steps:

1. **Initiate payment** - Creates the payment request and returns a confirmation URL
2. **Confirm payment** - Completes the payment after user authorization



## Payment Flow

1. Get wallet information for sender and receiver
2. Create incoming payment for receiver
3. Create quote with currency conversion
4. Request outgoing payment grant (may require user confirmation)
5. User authorizes payment via confirmation URL
6. Finalize grant and create outgoing payment

## Configuration

KEY_ID and WALLET_ADDRESS_URL are hardcoded in `lib/config.js`. To change them, edit that file directly.

You need a `private.key` file in the `op/` directory with your private key. (Don't worry, at the moment to start the server 
we create the file" :)

## API Endpoints

### POST /send-payment

Initiates a payment and returns confirmation URL if needed.

**Request:**
```json
{
  "senderWalletUrl": "https://ilp.interledger-test.dev/paguito-sender",
  "receiverWalletUrl": "https://ilp.interledger-test.dev/receptor-sdbk24",
  "amount": "10000",
  "assetCode": "USD",
  "assetScale": 2
}
```

**Response:**
```json
{
  "success": true,
  "requiresConfirmation": true,
  "paymentId": "payment_1234567890_abc123",
  "confirmationUrl": "https://auth.interledger-test.dev/interact/...",
  "message": "Visit the confirmation URL to authorize the payment...",
  "data": {
    "incomingPaymentId": "...",
    "quoteId": "...",
    "debitAmount": { "value": "185081", "assetCode": "MXN", "assetScale": 2 },
    "receiveAmount": { "value": "10000", "assetCode": "USD", "assetScale": 2 }
  }
}
```

### POST /confirm-payment

Completes payment after user has authorized it.

**Request:**
```json
{
  "paymentId": "payment_1234567890_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment completed successfully",
  "data": {
    "incomingPaymentId": "...",
    "quoteId": "...",
    "outgoingPaymentId": "...",
    "debitAmount": { "value": "185081", "assetCode": "MXN", "assetScale": 2 },
    "receiveAmount": { "value": "10000", "assetCode": "USD", "assetScale": 2 }
  }
}
```

### GET /health

Health check endpoint.

## Usage

### Local Development

```bash
# Setup environment
npm run setup

# Start server
npm start

# Or with auto-reload
npm run dev
```

### Docker

```bash
# Build image
docker build -t open-payments-api .

# Run container
docker run -d \
  --name open-payments-api \
  -p 3000:3000 \
  -v $(pwd)/private.key:/app/private.key:ro \
  open-payments-api
```

See `DOCKER.md` for more details.

## Testing

```bash
# Test payment flow
npm run test:payment
```

## Notes

- Amounts are specified as strings in the smallest unit (e.g., "10000" = 100.00 USD with scale 2)
- Payment state is stored in memory (use a database in production)
- The grant finalization process includes automatic polling with retries
