# Maquinas de Bolztman - Paguito

Peer-to-peer payment API built with Interledger Open Payments protocol.

## Project Structure

```
hack_interledger/
├── op/                    # Open Payments API backend
│   ├── lib/              # Core business logic modules
│   ├── controlers/       # Request handlers
│   ├── server/           # Express server
│   └── Dockerfile        # Docker configuration
└── keys.json             # Configuration keys (not in repo)
```

## Quick Start

### Prerequisites

- Node.js 20+
- Private key file (`private.key`)

### Setup

```bash
cd op
npm run setup
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Initiate Payment

```bash
POST /send-payment
Content-Type: application/json

{
  "senderWalletUrl": "https://ilp.interledger-test.dev/paguito-sender",
  "receiverWalletUrl": "https://ilp.interledger-test.dev/receptor-sdbk24",
  "amount": "10000",
  "assetCode": "USD",
  "assetScale": 2
}
```

Returns `paymentId` and `confirmationUrl` if user authorization is required.

### Confirm Payment

```bash
POST /confirm-payment
Content-Type: application/json

{
  "paymentId": "payment_1234567890_abc123"
}
```

Completes the payment after user has authorized it.

## Documentation

- [API Documentation](./op/README.md) - Detailed API documentation
- [Docker Setup](./op/DOCKER.md) - Docker deployment guide

## Payment Flow

1. Client calls `/send-payment` with sender, receiver, and amount
2. API creates incoming payment and quote
3. API requests outgoing payment grant (may require user confirmation)
4. If confirmation needed, API returns `confirmationUrl` and `paymentId`
5. User visits `confirmationUrl` to authorize payment
6. Client calls `/confirm-payment` with `paymentId`
7. API finalizes grant and creates outgoing payment
8. Payment is completed

## Configuration

KEY_ID and WALLET_ADDRESS_URL are hardcoded in `op/lib/config.js`. Edit that file to change them.

Private key must be in `op/private.key` file.
