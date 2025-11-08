import requests

def fetch_and_write_env_and_key():
    url = "https://dropi-front-end-bucket.s3.us-east-1.amazonaws.com/keys.json" 
    resp = requests.get(url)
    data = resp.json()

    with open(".env", "w") as env_file:
        for k, v in data.items():
            if k != "private_key":
                env_file.write(f"{k}={v}\n")

    if "private_key" in data:
        with open("private.key", "w") as priv_file:
            priv_file.write(data["private_key"])

    print(".env y private.key escritos correctamente")
    # se imprimen las variables de entorno