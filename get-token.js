const fs = require('fs');
const { google } = require('googleapis');
const envFile = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => (envFile.match(new RegExp(`${key}="(.*?)"`)) || envFile.match(new RegExp(`${key}=(.*)`)))?.[1];
const oAuth2Client = new google.auth.OAuth2(getEnv('GOOGLE_DRIVE_CLIENT_ID'), getEnv('GOOGLE_DRIVE_CLIENT_SECRET'), 'http://localhost:3000');
const code = process.argv[2];
if (!code) { console.error('Falta el código'); process.exit(1); }
oAuth2Client.getToken(code, (err, token) => {
  if (err) return console.error('Error:', err.response?.data || err.message);
  console.log('REFRESH_TOKEN=' + token.refresh_token);
});
