import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup script: creates private.key from keys.json or S3
// KEY_ID and WALLET_ADDRESS_URL are hardcoded in lib/config.js
async function setup() {
  console.log('Setting up environment...\n');
  
  const keysJsonPath = path.join(__dirname, '..', 'keys.json');
  
  if (fs.existsSync(keysJsonPath)) {
    console.log('Found local keys.json, using it...');
    const keys = JSON.parse(fs.readFileSync(keysJsonPath, 'utf8'));
    
    if (keys.private_key) {
      fs.writeFileSync(path.join(__dirname, 'private.key'), keys.private_key);
      console.log('private.key created');
    } else {
      console.log('private_key not found in keys.json');
    }
    
    let envContent = '';
    Object.keys(keys).forEach(key => {
      if (key !== 'private_key') {
        envContent += `${key}=${keys[key]}\n`;
      }
    });
    
    if (!envContent.includes('PRIVATE_KEY_PATH')) {
      envContent += 'PRIVATE_KEY_PATH=private.key\n';
    }
    
    if (envContent.trim()) {
      fs.writeFileSync(path.join(__dirname, '.env'), envContent);
      console.log('.env created');
    }
    
    console.log('\nSetup completed!\n');
    return;
  }
  
  console.log('Downloading configuration from S3...');
  try {
    const { fetchAndWriteEnvAndKey } = await import('./config_env.js');
    await fetchAndWriteEnvAndKey();
    console.log('Configuration downloaded from S3\n');
  } catch (error) {
    console.error('Error downloading from S3:', error.message);
    console.log('\nMake sure you have private.key in the op/ directory\n');
    process.exit(1);
  }
}

setup().catch(console.error);

