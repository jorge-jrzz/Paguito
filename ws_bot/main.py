import os
from pathlib import Path

import httpx
from pywa_async import WhatsApp, filters
from pywa.types import (
    Message,
    Button,
    CallbackButton,
    SectionList,
    Section,
    SectionRow,
    CallbackSelection
)
from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles

from config_env import fetch_and_write_env_and_key


fetch_and_write_env_and_key()
load_dotenv()
CALLBACK_URL = "https://eba37599c82a.ngrok-free.app"
LLM_BACKEND = "http://localhost:8000/webhook/whatsapp"

fastapi_app = FastAPI()
fastapi_app.mount("/downloads", StaticFiles(directory="./downloads"), name="downloads")
llm_client = httpx.AsyncClient()
wa = WhatsApp(
    phone_id=os.getenv('META_PHONE_ID'),
    token=os.getenv('META_ACCESS_TOKEN'),
    server=fastapi_app,
    callback_url=CALLBACK_URL,
    verify_token=os.getenv('META_VERIFY_TOKEN'),
    app_id=os.getenv('META_APP_ID'),
    app_secret=os.getenv('META_APP_SECRET')
)

POPULAR_LANGUAGES = {
    "en": ("English", "🇺🇸"),
    "es": ("Español", "🇪🇸"),
    "fr": ("Français", "🇫🇷")
}
OTHER_LANGUAGES = {
    "ar": ("العربية", "🇸🇦"),
    "ru": ("Русский", "🇷🇺"),
    "it": ("Italiano", "🇮🇹"),
    "pt": ("Português", "🇵🇹"),
    "ja": ("日本語", "🇯🇵"),
}


@wa.on_message(filters.contains("Hello", "Hi", "Hola", ignore_case=True))
async def hello(_: WhatsApp, msg: Message):
    await msg.react("👋")
    await msg.reply_text(
        text="Hi, I'm *Paguito*. A payment service via WhatsApp. To get started, choose your preferred language.",
        buttons=SectionList(
            button_title='🌐 Choose Language',
            sections=[
                Section(
                    title="🌟 Popular languages",
                    rows=[
                        SectionRow(
                            title=f"{flag} {name}",
                            callback_data=f"language:{code}",
                        )
                        for code, (name, flag) in POPULAR_LANGUAGES.items()
                    ],
                ),
                Section(
                    title="🌐 Other languages",
                    rows=[
                        SectionRow(
                            title=f"{flag} {name}",
                            callback_data=f"language:{code}",
                        )
                        for code, (name, flag) in OTHER_LANGUAGES.items()
                    ],
                ),
            ]
        )
    )


@wa.on_callback_selection(filters.startswith('language:'))
async def select_action(_: WhatsApp, sel: CallbackSelection):
    await sel.reply_text(
        text=f"Great, {sel.from_user.name}! Now, please select the action you would like to perform:",
        buttons=[
            Button(
                title="Transfer money 💸",
                callback_data="action:transfer"
            ),
            Button(
                title="Pay for services 🏦",
                callback_data="action:tickets"
            ),
            Button(
                title="Check transactions 🔍",
                callback_data="action:check"
            )
        ]
    )


@wa.on_callback_button(filters.startswith('action:'))
async def perform_action(_: WhatsApp, clb: CallbackButton):
    action = clb.data.split(':')[-1]
    if action == "transfer":
        await clb.reply_text(
            text="""Okay, now tell me the account number and the amount you want to transfer.
You can do this via voice note or a regular text message."""
        )
        await clb.reply_text(text="Feel free to choose how you make the request! 🤠")
    elif action == "tickets":
        await clb.reply_text(text="Pay for services action")
    elif action == "check":
        await clb.reply_text(text="Check transactions action")


@wa.on_message(filters.audio)
async def reply_audio(_: WhatsApp, msg: Message):
    await msg.reply("Audio received! 🎵")
    audio_id = msg.audio.id
    media_path: Path = await msg.download_media(filepath="downloads/audios/", filename=f"{audio_id}.mp3")
    print(f"Audio saved as {media_path}")
    payload = {
        "wa_id": msg.from_user.wa_id,
        "name": msg.from_user.name,
        "message": msg.caption if msg.caption else "",
        "media": [
            {
                "type": "audio",
                "source": f"{media_path.resolve()}"
            }
        ]
    }
    response = await llm_client.post(url=LLM_BACKEND, json=payload, timeout=60.0)
    data = response.json()
    await msg.reply(data['response'])


@wa.on_message(filters.image)
async def reply_image(_: WhatsApp, msg: Message):
    await msg.reply("Image received! 🖼️")
    image_id = msg.image.id
    media_path = await msg.download_media(filepath="downloads/images/", filename=f"{image_id}.jpg")
    print(f"Image saved as {media_path}")
    payload = {
        "wa_id": msg.from_user.wa_id,
        "name": msg.from_user.name,
        "message": msg.caption if msg.caption else "",
        "media": [
            {
                "type": "image",
                "source": f"{CALLBACK_URL}/{media_path}"
            }
        ]
    }
    response = await llm_client.post(url=LLM_BACKEND, json=payload, timeout=60.0)
    data = response.json()
    await msg.reply(data['response'])


@wa.on_message(filters.text)
async def echo(_: WhatsApp, msg: Message):
    await msg.react("🤖")
    payload = {
        "wa_id": msg.from_user.wa_id,
        "name": msg.from_user.name,
        "message": msg.text,
        "media": []
    }
    response = await llm_client.post(url=LLM_BACKEND, json=payload)
    data = response.json()
    await msg.reply(data['response'])

@wa.on_message(filters.contacts)
async def reply_contacts(_: WhatsApp, msg: Message):
    await msg.reply("Contact received! 📇")
    name = msg.contacts[0].name.first_name
    phone = msg.contacts[0].phones[0].phone
    await msg.reply(f"Contact Name: {name}\nPhone Number: {phone}")