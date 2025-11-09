# Paguito Project Documentation

## Overview
Paguito is a peer-to-peer payment platform that combines Interledger Open Payments with a WhatsApp bot. Users chat with the bot, the message is processed by an LLM (OpenAI), and whenever a transfer is detected the payment flow is triggered and finalized after authorization.

## Service Architecture
The repository hosts three independently deployable services coordinated through a Docker Compose network:

- **ws_bot** (`ws_bot/main.py`): FastAPI server that exposes the WhatsApp webhook via `pywa`. It handles text, audio, images, and contacts, sends payloads to the LLM backend, and manages payment confirmation with the Open Payments API.
- **llm_back** (`llm_back/apps/Interledger_LLM/api/main.py`): FastAPI API that orchestrates OpenAI calls, media transcription/analysis, response generation, and optional payment payload creation.
- **open_payments_api** (`op/server/index.js`): Express REST API that initiates and completes payments using `@interledger/open-payments`.

All services share the `paguito_network` defined in `docker-compose.yaml` and are reachable inside Docker as `ws_bot`, `llm_backend`, and `open_payments_api`.

### ws_bot: WhatsApp Bot
- Loads Meta credentials (`META_*`) and a fixed `CALLBACK_URL` via `ws_bot/config_env.py`, which downloads `.env` and `private.key` from `https://dropi-front-end-bucket.s3.us-east-1.amazonaws.com/keys.json`.
- Handles text, audio, image, and contact events. Text messages build a payload and send it to `LLM_BACKEND`; media messages download the file before sending it to the LLM.
- Replies with multi-section buttons for language/action selection and reacts with emojis for friendly conversation. Payment replies reuse the helper `confirm_payment_with_op_api`, which polls `OP_BACKEND/confirm-payment` and notifies staff via `wa.send_text`.
- Communicates with both LLM and Open Payments APIs through a shared `back_client` (`httpx.AsyncClient`).

### llm_back: LLM API
- Exposes `/` (health), `/webhook/whatsapp` (GET validation and POST processing), and `/webhook/whatsapp/raw` (raw payload) in `llm_back/apps/Interledger_LLM/api/main.py`.
- For every message:
  - Detects audio/image inputs (or identifies them from URLs), transcribes or analyzes them, and enriches the prompt before calling the LLM.
  - Calls `process_message_with_extraction` (`agent/main.py`) with the system prompt from `agent/system_prompt.md`, forcing a JSON response that includes `monto`, `destinatario`, and `response`.
  - Synthesizes TTS audio when audio was provided (`AUDIO_OUTPUT_DIR/audio_responses`).
  - Builds `payment_payload` and calls `send_payment_async` (`payment.py`) toward `http://open_payments_api:3000/send-payment` whenever both amount and destination are available; the result ends up in `payment_status` and `payment_confirmation`.
- Loads configuration from the root `.env` (including `OPENAI_API_KEY`, `WHATSAPP_VERIFY_TOKEN`, `PAYMENT_ASSET_CODE`, and `PAYMENT_ASSET_SCALE`).
- Includes utilities to transcribe via `gpt-4o-transcribe`, synthesize speech with `gpt-4o-mini-tts`, and analyze tickets (`_analyze_image`).
- Auxiliary scripts such as `check_api_key.py` and `test_with_example.py` are referenced in `llm_back/README.md`.

### open_payments_api: Payment Backend
- Express server (`op/server/index.js`) providing `/send-payment`, `/confirm-payment`, and `/health`.
- Uses `config_env.js` to fetch `.env` and `private.key` from the same S3 bucket; it can store the private key in `PRIVATE_KEY_CONTENT` when running on read-only volumes.
- Business logic lives inside `op/controlers/` and `op/lib/`:
  - `initiatePaymentController` and `completePaymentController` coordinate the two-step flow.
  - The Interledger steps are implemented in `op/lib/paymentFlowInit.js`, `paymentFlowComplete.js`, `incomingPayment.js`, `outgoingPayment.js`, `quote.js`, `grants.js`, etc., while `paymentState` holds pending confirmations.
- Depends on `@interledger/open-payments`, and requires `private.key`, `KEY_ID`, and `WALLET_ADDRESS_URL` (hardcoded in `op/lib/config.js` unless manually updated).
- Example call flows can be found in `op/controlers/something.js`, and packaging happens through `op/Dockerfile`.

## End-to-End Flow
1. A user sends text, audio, or image to WhatsApp.
2. `ws_bot` receives the webhook (after Meta verification) and builds a payload with `wa_id`, `name`, `message`, and optional `media`.
3. The payload is POSTed to `llm_backend` (`/webhook/whatsapp`).
4. The backend uses OpenAI to extract `monto` and `destinatario`, optionally calling `open_payments_api/send-payment` to obtain `paymentId` and `confirmationUrl`.
5. The response returns to `ws_bot`, which shows the confirmation message and triggers `confirm_payment_with_op_api` to poll `open_payments_api/confirm-payment` until success.
6. Once the payment is confirmed, `ws_bot` notifies staff (e.g., via `wa.send_text`) and informs the user.

## Environment Variables & Secrets
| Component | Key Variables | Notes |
|-----------|---------------|-------|
| `ws_bot` | `META_PHONE_ID`, `META_ACCESS_TOKEN`, `META_VERIFY_TOKEN`, `META_APP_ID`, `META_APP_SECRET`, `CALLBACK_URL` | `ws_bot/config_env.py` downloads `.env` and `private.key` from S3 before the bot starts. |
| `llm_back` | `OPENAI_API_KEY`, `WHATSAPP_VERIFY_TOKEN`, `PAYMENT_ASSET_CODE`, `PAYMENT_ASSET_SCALE` | The API reads the root `.env` using `dotenv`. |
| `open_payments_api` | `PRIVATE_KEY_PATH`, `PRIVATE_KEY_CONTENT`, `PORT`, `NODE_ENV` | `config_env.js` writes `.env`/`private.key`, and `PRIVATE_KEY_CONTENT` allows running on read-only volumes. |

## Local Development
### Common Prerequisites
- Python 3.12+, Node.js 20+, `uv` (https://uv.run) for the Python projects, and Docker Compose to bring up the full stack.
- Clone the repo and either provide a `.env` with the required secrets or let `config_env` download them from the public bucket (requires internet access).

### ws_bot
1. Set up the Python environment:
   ```bash
   cd ws_bot
   uv sync
   uv run python main.py
   ```
2. The bot exposes a webhook on port 8080; `CALLBACK_URL` defaults to `https://626d5d3da445.ngrok-free.app` but can be replaced with your tunnel.
3. `pywa` routes text (`filters.text`), audio (`filters.audio`), image (`filters.image`), and contact (`filters.contacts`) messages. See `main.py` for button prompts and payment confirmation logic.
4. Use `mise ws_ngrok` when you need to expose the bot to Meta; copy the publicly provided ngrok URL and paste it into `CALLBACK_URL` in `ws_bot/main.py`, so WhatsApp can register the webhook with Meta.

### llm_back
1. Install dependencies and run:
   ```bash
   cd llm_back
   uv sync
   uv run python main.py
   ```
2. Validate the OpenAI key with `uv run python check_api_key.py` and browse `/docs` once the server is up; `test_with_example.py` provides a sample POST.
3. The agent logic lives under `apps/Interledger_LLM/api/agent`, where `system_prompt.md` and `agent/main.py` define the LLM behavior.

### open_payments_api
1. Install dependencies and bootstrap the key:
   ```bash
   cd op
   npm ci
   npm run setup
   npm start
   ```
2. Controllers and libraries rely on `@interledger/open-payments`, implementing the `/send-payment` and `/confirm-payment` steps.
3. The `/health` endpoint masks sensitive env vars and helps verify configuration.
4. Review `controlers/initiatePayment.js` and `controlers/completePayment.js` to understand how `paymentId`s are tracked.

### Docker Compose
1. Build and start all services:
   ```bash
   docker-compose build
   docker-compose up
   ```
2. The root `docker-compose.yaml` defines the `paguito_network` and exposes only the `ws_bot` port 8080 on the host; other services remain internal.
3. Each service has its own `Dockerfile` (`ws_bot/Dockerfile`, `llm_back/Dockerfile`, `op/Dockerfile`) that installs dependencies (`uv sync` or `npm ci`) and runs the server on `0.0.0.0`.

## Mise Task Runner
- The repository ships with `mise` tasks to standardize local workflows. From the root, run `mise task` to list the available targets along with their descriptions.
- The most common tasks include:
  - `dev`: Start both WhatsApp bot and LLM Backend development environments.
  - `docker_llm`: Build and run the Docker container for the LLM backend.
  - `docker_op`: Build and run the Docker container for the Open Payments service.
  - `docker_up`: Build and run all Docker containers (ws_bot, llm_back, and open_payments_api).
  - `docker_ws`: Build and run the Docker container for the WhatsApp bot.
  - `llm_dev`: Start the development environment for the LLM backend.
  - `llm_setup`: Set up the development environment for the LLM backend.
  - `op_dev`: Start the development environment for the Open Payments backend service.
  - `op_setup`: Set up the development environment for the Open Payments backend service.
  - `ws_dev`: Start the development environment for the WhatsApp bot.
  - `ws_ngrok`: Expose the WhatsApp bot to the internet using ngrok.
  - `ws_setup`: Set up the development environment for the WhatsApp bot.

## Testing & Utilities
- `llm_back/check_api_key.py`: ensures `OPENAI_API_KEY` is set before starting the LLM service.
- `llm_back/test_with_example.py`: sends an example POST to `/webhook/whatsapp` for smoke testing.
- `op/controlers/something.js`: template for custom payment scenarios (used by `npm run test:payment`).

## Key Directories
- `ws_bot/`: WhatsApp bot, `pyproject.toml`, `Dockerfile`, `main.py`, `config_env.py`.
- `llm_back/`: LLM API, including `apps/Interledger_LLM/api` and system prompt.
- `op/`: Open Payments API with `server/`, `controlers/`, `lib/`, and `config_env.js`.
- `docker-compose.yaml`: orchestrates the three services on `paguito_network`.

## Additional Resources
- `README.md`: general overview and payment API reference.
- `llm_back/README.md`: installation and usage notes for the FastAPI LLM backend.
- `op/README.md`: detailed explanation of the Open Payments API and flows.
- [Presentation Slides](https://www.canva.com/design/DAG4NevsI0k/94jrh_8s0lls31e3jrDOLw/edit?utm_content=DAG4NevsI0k&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton): high-level overview of Paguito and architecture.
