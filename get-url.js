const fs = require('fs');
const { google } = require('googleapis');
const envFile = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => (envFile.match(new RegExp(`${key}="(.*?)"`)) || envFile.match(new RegExp(`${key}=(.*)`)))?.[1];
const oAuth2Client = new google.auth.OAuth2(getEnv('GOOGLE_DRIVE_CLIENT_ID'), getEnv('GOOGLE_DRIVE_CLIENT_SECRET'), 'http://localhost:3000');
console.log(oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/drive.file'], prompt: 'consent' }));
