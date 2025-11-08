import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';

export async function fetchAndWriteEnvAndKey() {
  const url = 'https://dropi-front-end-bucket.s3.us-east-1.amazonaws.com/keys.json';

  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';

      resp.on('data', (chunk) => { data += chunk; });

      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          let envContent = '';
          if ('private_key' in json) {
            fs.writeFileSync('private.key', json['private_key']);
            delete json['private_key'];
          }
          Object.keys(json).forEach(key => {
            envContent += `${key}=${json[key]}\n`;
          });
          fs.writeFileSync('.env', envContent);
          // Cargar las variables de entorno después de crear el archivo
          dotenv.config();
          console.log('.env y private.key escritos correctamente');
          resolve();
        } catch (err) {
          console.error('Error al procesar el JSON:', err);
          reject(err);
        }
      });

    }).on("error", (err) => {
      console.log("Error: " + err.message);
      reject(err);
    });
  });
}