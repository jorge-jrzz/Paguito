from openai import OpenAI
from dotenv import load_dotenv
import os

# Carga las variables del .env (donde tienes tu API_KEY)
load_dotenv()

client = OpenAI()

response = client.responses.create(
    model="gpt-4o",
    input=[
        {
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": "extrae el monto y la cuenta",
                },
                {
                    "type": "input_image",
                    "image_url": "https://dropi-front-end-bucket.s3.us-east-1.amazonaws.com/WhatsApp+Image+2025-11-08+at+6.27.41+PM.jpeg"
                }
            ]
        }
    ]
)

print(response.output_text)