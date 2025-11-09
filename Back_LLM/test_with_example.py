#!/usr/bin/env python3
"""
Prueba con el ejemplo exacto proporcionado
"""
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, Optional

import requests
from dotenv import load_dotenv

# Cargar variables de entorno desde .env si existe
project_root = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(project_root, ".env")
load_dotenv(env_path)

from openai import OpenAI

# Inicializar cliente con API key del entorno
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY no está configurada en el entorno")

client = OpenAI(api_key=api_key)

def transcribe_audio(audio_file_path: str) -> str:
    """Transcribe un archivo de audio a texto"""
    with open(audio_file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=audio_file,
            response_format="text",
            language="es"
        )
    return transcription


def is_audio_file(message: str) -> bool:
    """Verifica si el mensaje es una ruta a un archivo de audio"""
    # Extensiones de audio soportadas
    audio_extensions = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"]

    # Verificar si es una ruta de archivo
    if os.path.isfile(message):
        # Obtener la extensión del archivo
        _, ext = os.path.splitext(message.lower())
        return ext in audio_extensions

    return False


def is_image_message(message: str) -> bool:
    """Determina si el mensaje es una URL de imagen o una ruta local"""
    image_extensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"]

    # Revisa si es URL
    if message.startswith("http://") or message.startswith("https://"):
        return any(message.lower().split("?")[0].endswith(ext) for ext in image_extensions)

    # Revisa si es archivo local
    if os.path.isfile(message):
        _, ext = os.path.splitext(message.lower())
        return ext in image_extensions

    return False


def text_to_speech(text: str, output_filename: str = "respuesta.mp3") -> str:
    """Convierte texto a audio y devuelve la ruta del archivo"""
    # Crear directorio de respuestas si no existe
    output_dir = Path(__file__).parent / "audio_responses"
    output_dir.mkdir(exist_ok=True)

    speech_file_path = output_dir / output_filename

    response = client.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice="coral",
        input=text
    )
    # Guardar el audio
    with open(speech_file_path, "wb") as audio_file:
        audio_file.write(response.content)

    # Devolver la ruta absoluta como URL local
    return str(speech_file_path.absolute())


def parse_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """Intenta extraer y parsear un JSON desde texto libre"""
    candidate = text.strip()

    # Remover bloques markdown
    if "```json" in candidate:
        start = candidate.find("```json") + 7
        end = candidate.find("```", start)
        candidate = candidate[start:end].strip()
    elif "```" in candidate:
        start = candidate.find("```") + 3
        end = candidate.find("```", start)
        candidate = candidate[start:end].strip()

    # Intentar parsear
    try:
        data = json.loads(candidate)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def analyze_image(image_input: str) -> Dict[str, Any]:
    """
    Analiza un ticket de compra y extrae monto y cuenta/wallet.

    Args:
        image_input: URL o ruta local de la imagen

    Returns:
        Diccionario con monto, destinatario y resumen textual
    """
    print(f"🖼️  Analizando imagen: {image_input}")

    # Si es ruta local, subir a base64 (OpenAI admite data URLs)
    if os.path.isfile(image_input):
        with open(image_input, "rb") as image_file:
            import base64

            encoded = base64.b64encode(image_file.read()).decode("utf-8")
        _, ext = os.path.splitext(image_input.lower())
        mime_types = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        mime_type = mime_types.get(ext, "image/png")
        image_source = {"type": "input_image", "image_base64": encoded, "mime_type": mime_type}
    else:
        image_source = {"type": "input_image", "image_url": image_input}

    prompt = (
        "Analiza el ticket y devuelve únicamente un JSON en este formato exacto:\n"
        "{\n"
        '  "monto": numero,\n'
        '  "destinatario": "string"\n'
        "}\n"
        "- \"monto\" debe ser un número (sin símbolo de moneda).\n"
        "- \"destinatario\" debe ser el número de cuenta o wallet (solo dígitos si es posible).\n"
        "- Si no encuentras alguno de los datos, usa null.\n"
        "- No incluyas texto adicional fuera del JSON.\n"
        "- Si hay múltiples números, elige el que represente la cuenta/wallet."
    )

    response = client.responses.create(
        model="gpt-4o",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    image_source,
                ],
            }
        ],
    )

    output_text = response.output_text.strip()
    data = parse_json_from_text(output_text) or {}

    # Normalizar datos
    monto = data.get("monto")
    destinatario = data.get("destinatario")

    # Convertir monto a float si es posible
    try:
        if isinstance(monto, str):
            monto = float(monto.replace("$", "").replace(",", "").strip())
    except ValueError:
        monto = None
    except AttributeError:
        monto = None

    # Limpiar destinatario para que sea número de cuenta/wallet
    if isinstance(destinatario, str):
        dest_clean = "".join(ch for ch in destinatario if ch.isdigit())
        if dest_clean:
            destinatario = dest_clean
        else:
            destinatario = destinatario.strip() or None

    return {
        "monto": monto,
        "destinatario": destinatario,
    }


def image_to_text(image_url: str) -> str:
    response = client.responses.create(
        model="gpt-4o",
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": "extrae el monto y la cuenta/wallet",
                    },
                    {
                        "type": "input_image",
                        "image_url": "image_url",
                    },
                ],
            }
        ],
    )
    return response.output_text


def check_api_key():
    """Verifica si la API key de OpenAI está configurada"""
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        # Mostrar solo los primeros y últimos caracteres por seguridad
        masked_key = f"{api_key[:7]}...{api_key[-4:]}" if len(api_key) > 11 else "***"
        print(f"✅ OPENAI_API_KEY configurada: {masked_key}")
        return True
    else:
        print("⚠️  ADVERTENCIA: OPENAI_API_KEY no está configurada")
        print("   El servidor no podrá procesar mensajes con el LLM")
        print("\n   Para configurarla, ejecuta en tu terminal:")
        print("   export OPENAI_API_KEY='tu-api-key-aqui'")
        print("\n   O agrégalo a tu archivo ~/.zshrc o ~/.bashrc:")
        print("   echo 'export OPENAI_API_KEY=\"tu-api-key-aqui\"' >> ~/.zshrc")
        print("   source ~/.zshrc")
        return False

def test_whatsapp_api():
    """Prueba el endpoint con el ejemplo exacto"""
    
    print("=" * 70)
    print("PRUEBA DEL ENDPOINT WHATSAPP CON EL EJEMPLO")
    print("=" * 70)
    print()
    
    # Verificar API key primero
    has_api_key = check_api_key()
    print()
    
    # El ejemplo exacto que proporcionaste
    # Puedes cambiar esto para probar con texto o audio
    original_message = "https://dropi-front-end-bucket.s3.us-east-1.amazonaws.com/WhatsApp+Image+2025-11-08+at+6.27.41+PM.jpeg"
    # Para probar con texto, descomenta la línea siguiente:
    # original_message = "Quiero enviar 50 pesos a la cuenta 123456789"
    # Para probar con imagen (URL), descomenta la línea siguiente:
    # original_message = "https://dropi-front-end-bucket.s3.us-east-1.amazonaws.com/WhatsApp+Image+2025-11-08+at+6.27.41+PM.jpeg"
    
    payload = {
        "wa_id": "5215513076942",
        "name": "Yorch Juárez",
        "message": original_message,
    }
    
    # Verificar si es un archivo de audio
    is_audio_input = is_audio_file(original_message)
    image_input_detected = is_image_message(original_message)
    transcribed_text = None
    image_analysis: Optional[Dict[str, Any]] = None
    
    if is_audio_input:
        print(f"🎤 Detectado archivo de audio: {original_message}")
        print("📝 Transcribiendo audio a texto...")
        try:
            transcribed_text = transcribe_audio(original_message)
            payload["message"] = transcribed_text
            print(f"✅ Transcripción: {transcribed_text}")
            print()
        except Exception as e:
            print(f"❌ Error al transcribir audio: {e}")
            return
    else:
        print(f"📝 Mensaje de texto detectado: {original_message}")
        print()

    # Si es imagen, analizarla antes de enviar al LLM
    if image_input_detected:
        print("🖼️  Detectado enlace a imagen (ticket)")
        try:
            image_analysis = analyze_image(original_message)
            monto = image_analysis.get("monto")
            destinatario = image_analysis.get("destinatario")

            summary_parts = []
            if monto is not None:
                summary_parts.append(f"un monto aproximado de ${monto:,.2f}")
            if destinatario:
                summary_parts.append(f"una cuenta o wallet con número {destinatario}")

            summary = ", ".join(summary_parts) if summary_parts else "sin datos claros"

            payload["message"] = (
                "El usuario envió un ticket de compra. "
                f"Se identificó {summary}. "
                "Confirma la transacción al usuario con un mensaje claro."
            )

            print("✅ Análisis de imagen completado")
            print(json.dumps(image_analysis, indent=2, ensure_ascii=False))
            print()
        except Exception as e:
            print(f"❌ Error al analizar la imagen: {e}")
            return


    url = "http://localhost:8000/webhook/whatsapp"
    headers = {"Content-Type": "application/json"}
    
    print("📤 Enviando mensaje:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print("\n" + "-" * 70)
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        print(f"📥 Respuesta del servidor:")
        print(f"   Status Code: {response.status_code}")
        print("\n📋 Contenido de la respuesta:")
        
        if response.status_code == 200:
            result = response.json()
            
            # Si la entrada era audio, generar audio de la respuesta
            if is_audio_input:
                response_text = result.get("response", "")
                if response_text:
                    print("🔊 Generando audio de la respuesta...")
                    try:
                        # Generar nombre único para el archivo de audio
                        timestamp = int(time.time())
                        audio_filename = f"respuesta_{timestamp}.mp3"
                        audio_file_path = text_to_speech(response_text, audio_filename)
                        
                        # Agregar la URL del audio a la respuesta
                        result["audio_url"] = f"file://{audio_file_path}"
                        result["audio_file"] = audio_file_path
                        
                        print(f"✅ Audio generado: {audio_file_path}")
                        print()
                    except Exception as e:
                        print(f"⚠️  Error al generar audio: {e}")
                        print("   Se devuelve solo la respuesta en texto")

            # Si la entrada era imagen, adjuntar el análisis
            if image_input_detected and image_analysis:
                result["image_analysis"] = image_analysis
            
            # Mostrar la respuesta completa
            print(json.dumps(result, indent=2, ensure_ascii=False))
            print("\n✅ ¡Prueba exitosa!")
            
            if is_audio_input:
                print(f"🎵 URL del audio: {result.get('audio_file', 'No generado')}")
            if image_input_detected:
                print("🖼️  Análisis de imagen incluido en la respuesta")
            
            if has_api_key:
                print("✅ El LLM procesó el mensaje correctamente")
            else:
                print("⚠️  Nota: El mensaje se envió pero el LLM no pudo procesarlo")
                print("   Configura OPENAI_API_KEY para obtener respuestas del LLM")
        else:
            error_detail = response.text
            print(error_detail)
            print(f"\n❌ Error: Status {response.status_code}")
            
            # Mensaje específico si falta la API key
            if "OPENAI_API_KEY" in error_detail:
                print("\n💡 Solución: Configura la API key con:")
                print("   export OPENAI_API_KEY='tu-api-key'")
                print("   Luego reinicia el servidor")
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: No se pudo conectar al servidor")
        print("\n   Asegúrate de que el servidor esté corriendo en otra terminal:")
        print("   cd /Users/misaelalvarezcamarillo/Desktop/Back/Back_LLM")
        print("   python main.py")
        print("\n   El servidor debe estar corriendo en http://localhost:8000")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
    
    print("=" * 70)

if __name__ == "__main__":
    test_whatsapp_api()

