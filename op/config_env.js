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
          
          // Try to write private.key, handle read-only filesystem
          if ('private_key' in json) {
            const privateKey = json['private_key'];
            const privateKeyPath = process.env.PRIVATE_KEY_PATH || 'private.key';
            
            // Only write if file doesn't exist
            if (!fs.existsSync(privateKeyPath)) {
              try {
                fs.writeFileSync(privateKeyPath, privateKey);
                console.log(`private.key created at ${privateKeyPath}`);
              } catch (writeError) {
                if (writeError.code === 'EROFS' || writeError.code === 'EACCES') {
                  console.warn(`Cannot write ${privateKeyPath}: filesystem is read-only. Make sure private.key is mounted as volume.`);
                  // Store in environment variable as fallback
                  process.env.PRIVATE_KEY_CONTENT = privateKey;
                } else {
                  throw writeError;
                }
              }
            } else {
              console.log(`private.key already exists at ${privateKeyPath}, skipping write`);
            }
            delete json['private_key'];
          }
          
          // Try to write .env, handle read-only filesystem
          Object.keys(json).forEach(key => {
            envContent += `${key}=${json[key]}\n`;
          });
          
          try {
            if (envContent.trim()) {
              fs.writeFileSync('.env', envContent);
            }
            dotenv.config();
            console.log('Configuration loaded successfully');
            resolve();
          } catch (writeError) {
            if (writeError.code === 'EROFS' || writeError.code === 'EACCES') {
              // Filesystem is read-only, but we can still load env vars from process.env
              console.log('Cannot write .env: filesystem is read-only. Using environment variables if available.');
              dotenv.config();
              resolve();
            } else {
              throw writeError;
            }
          }
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

