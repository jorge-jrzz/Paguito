# WhatsApp LLM API

API FastAPI para procesar mensajes de WhatsApp usando LLM (OpenAI).

## Instalación

1. Instala las dependencias:
```bash
uv sync
```

O si usas pip:
```bash
pip install -e .
```

2. Configura la variable de entorno para la API key de OpenAI:

**Opción A: Usando archivo .env (RECOMENDADO)**
```bash
# Crea un archivo .env en la raíz del proyecto
echo 'OPENAI_API_KEY=sk-proj-tu-api-key-aqui' > .env
```

**Opción B: Variable de entorno en la terminal**
```bash
export OPENAI_API_KEY="tu-api-key-aqui"
```

**Opción C: Permanente (agregar a ~/.zshrc)**
```bash
echo 'export OPENAI_API_KEY="tu-api-key-aqui"' >> ~/.zshrc
source ~/.zshrc
```

## Ejecutar el servidor

**Opción A: Usando uv (recomendado)**
```bash
uv run python main.py
```

**Opción B: Directamente (si tienes el entorno activado)**
```bash
python main.py
```

⚠️ **IMPORTANTE**: El servidor ahora carga automáticamente el archivo `.env` si existe.

El servidor se ejecutará en `http://localhost:8000`

## Verificar configuración

Antes de iniciar el servidor, puedes verificar que la API key esté configurada:

```bash
uv run python check_api_key.py
```

## Probar la API

### Opción 1: Usar el script de prueba en Python

```bash
uv run python test_with_example.py
```

### Opción 2: Usar curl directamente

```bash
curl -X POST "http://localhost:8000/webhook/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "wa_id": "5215513076942",
    "name": "Yorch Juárez",
    "message": "bro",
    "identity_key_hash": null
  }'
```

### Opción 3: Ver la documentación interactiva

Una vez que el servidor esté corriendo, visita:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

- `GET /`: Endpoint de salud
- `POST /webhook/whatsapp`: Recibe mensajes de WhatsApp y los procesa con el LLM
- `POST /webhook/whatsapp/raw`: Versión alternativa que acepta formato raw

## Formato de mensaje

```json
{
  "wa_id": "5215513076942",
  "name": "Yorch Juárez",
  "message": "bro",
  "identity_key_hash": null
}
```

## Respuesta

```json
{
  "response": "Respuesta del LLM",
  "wa_id": "5215513076942",
  "name": "Yorch Juárez"
}
```
