import os

import uvicorn
from dotenv import load_dotenv

from apps.config_env import fetch_and_write_env_and_key

# Cargar variables de entorno desde .env si existe
env_path = os.path.join(os.path.dirname(__file__), ".env")

fetch_and_write_env_and_key()
load_dotenv(env_path)

if __name__ == "__main__":
    uvicorn.run(
        "apps.Interledger_LLM.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
