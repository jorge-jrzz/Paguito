# Docker Setup

## Build Image

```bash
cd op
docker build -t open-payments-api .
```

## Run Container

```bash
docker run -d \
  --name open-payments-api \
  -p 3000:3000 \
  -v $(pwd)/private.key:/app/private.key:ro \
  open-payments-api
```

## View Logs

```bash
docker logs -f open-payments-api
```

## Stop Container

```bash
docker stop open-payments-api
docker rm open-payments-api
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `PRIVATE_KEY_PATH`: Path to private key file (default: `/app/private.key`)

KEY_ID and WALLET_ADDRESS_URL are hardcoded in `lib/config.js`.

## Required Files

Make sure you have `private.key` in the `op/` directory before building or running the container.

## Test

```bash
# Health check
curl http://localhost:3000/health

# Test payment endpoint
curl -X POST http://localhost:3000/send-payment \
  -H "Content-Type: application/json" \
  -d '{
    "senderWalletUrl": "https://ilp.interledger-test.dev/paguito-sender",
    "receiverWalletUrl": "https://ilp.interledger-test.dev/receptor-sdbk24",
    "amount": "10000",
    "assetCode": "USD",
    "assetScale": 2
  }'
```

## Notes

- Container listens on `0.0.0.0:3000` to be accessible from outside
- `private.key` is mounted as read-only volume (`:ro`)
- `.env` and `private.key` are in `.dockerignore` for security

