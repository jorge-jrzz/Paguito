import os

from pywa_async import WhatsApp, types
from dotenv import load_dotenv
from fastapi import FastAPI


load_dotenv()
CALLBACK_URL = "https://14972b5de3f3.ngrok-free.app/"
fastapi_app = FastAPI()
wa = WhatsApp(
    phone_id=os.getenv('META_PHONE_ID'),
    token=os.getenv('META_ACCESS_TOKEN'),
    server=fastapi_app,
    callback_url=CALLBACK_URL,
    verify_token=os.getenv('META_VERIFY_TOKEN'),
    app_id=os.getenv('META_APP_ID'),
    app_secret=os.getenv('META_APP_SECRET')
)

@wa.on_message
async def hello(_: WhatsApp, msg: types.Message):
    if msg.image:
        await msg.react("❤️")
        await msg.reply("Nice image!")
    else:
        await msg.react("👋")
        print(f"Message from {msg.from_user}: {msg.text} \n Metadata: {msg.metadata} \n ID: {msg.id}")
        await msg.reply("Hello from Paguito!")
