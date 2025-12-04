const path = require('path');
const fs = require('fs');
const { TokenStore } = require('../../packages/core/token-store');

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    const value = rest.join('=');
    if (!process.env[key]) process.env[key] = value;
  });
};

const main = async () => {
  loadEnvFile(path.join(process.cwd(), '.env'));
  const store = new TokenStore();
  const client = await store._ensureConnection();
  const docs = await store.collection.find({}).project({ token: 0 }).toArray();
  if (!docs.length) {
    console.log('No tokens found.');
  } else {
    console.log('Tokens:');
    docs.forEach((doc) =>
      console.log(
        `- user_id=${doc.user_id} (_id=${doc._id}) created=${doc.createdAt || 'n/a'} updated=${doc.updatedAt || 'n/a'}`
      )
    );
  }
  if (store.client && client) await store.client.close();
};

main().catch((err) => {
  console.error('Failed to list tokens:', err.message || err);
  process.exit(1);
});
