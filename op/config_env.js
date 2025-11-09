import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';

// Fetches configuration from S3 and writes private.key and .env files
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
          dotenv.config();
          console.log('.env and private.key written successfully');
          resolve();
        } catch (err) {
          console.error('Error processing JSON:', err);
          reject(err);
        }
      });

    }).on("error", (err) => {
      console.log("Error: " + err.message);
      reject(err);
    });
  });
}

