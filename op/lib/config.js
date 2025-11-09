import fs from 'fs';
import dotenv from 'dotenv';

const KEY_ID = 'f5a43f8c-bfff-4daf-81e8-798db41e4518';
const WALLET_ADDRESS_URL = 'https://ilp.interledger-test.dev/paguito-sender';

// Default private key as fallback
const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIN6r651NLWoAJH/61HvFQha5mZGzwQ2xlFrhdVOw2qp/
-----END PRIVATE KEY-----`;

export async function loadConfig() {
  dotenv.config();
  
  const privateKeyPath = process.env.PRIVATE_KEY_PATH || 'private.key';
  
  // Check if path exists and is a file (not a directory)
  if (fs.existsSync(privateKeyPath)) {
    const stats = fs.statSync(privateKeyPath);
    if (stats.isDirectory()) {
      // If it's a directory, remove it so config_env.js can create the file
      try {
        fs.rmSync(privateKeyPath, { recursive: true, force: true });
      } catch (err) {
        throw new Error(`Private key path is a directory: ${privateKeyPath}. Could not remove it.`);
      }
    }
  }
  
  // If file doesn't exist, try to get it from environment variable or download from S3
  let privateKey;
  if (!fs.existsSync(privateKeyPath)) {
    // First, try to get from environment variable (set by config_env.js if filesystem is read-only)
    if (process.env.PRIVATE_KEY_CONTENT) {
      privateKey = process.env.PRIVATE_KEY_CONTENT;
      console.log('Using private key from environment variable');
    } else {
      // Try to download from S3
      try {
        const { fetchAndWriteEnvAndKey } = await import('../config_env.js');
        await fetchAndWriteEnvAndKey();
        
        // Check again if file was created
        if (fs.existsSync(privateKeyPath)) {
          privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        } else if (process.env.PRIVATE_KEY_CONTENT) {
          privateKey = process.env.PRIVATE_KEY_CONTENT;
        } else {
          // Use default private key as fallback
          console.log('Using default private key as fallback');
          privateKey = DEFAULT_PRIVATE_KEY;
          
          // Try to write it if possible
          try {
            fs.writeFileSync(privateKeyPath, privateKey);
            console.log(`Created ${privateKeyPath} with default private key`);
          } catch (writeError) {
            // If can't write, that's okay, we'll use it from memory
            if (writeError.code !== 'EROFS' && writeError.code !== 'EACCES') {
              console.warn(`Could not write default private key to ${privateKeyPath}: ${writeError.message}`);
            }
          }
        }
      } catch (err) {
        // If download fails, use default private key
        console.warn(`Failed to download from S3: ${err.message}. Using default private key.`);
        privateKey = DEFAULT_PRIVATE_KEY;
        
        // Try to write it if possible
        try {
          fs.writeFileSync(privateKeyPath, privateKey);
          console.log(`Created ${privateKeyPath} with default private key`);
        } catch (writeError) {
          // If can't write, that's okay, we'll use it from memory
          if (writeError.code !== 'EROFS' && writeError.code !== 'EACCES') {
            console.warn(`Could not write default private key to ${privateKeyPath}: ${writeError.message}`);
          }
        }
      }
    }
  } else {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  }
  
  if (!privateKey || privateKey.trim().length === 0) {
    throw new Error(`Private key is empty at: ${privateKeyPath}`);
  }
  
  return {
    privateKey,
    keyId: KEY_ID,
    walletAddressUrl: WALLET_ADDRESS_URL,
  };
}
