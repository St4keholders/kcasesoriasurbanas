const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
// Intenta cargar las variables de entorno de forma simple (sin dotenv si no está instalado)
const envFile = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`${key}="(.*?)"`)) || envFile.match(new RegExp(`${key}=(.*)`));
  return match ? match[1] : null;
};

const clientId = getEnv('GOOGLE_DRIVE_CLIENT_ID');
const clientSecret = getEnv('GOOGLE_DRIVE_CLIENT_SECRET');

if (!clientId || !clientSecret) {
  console.log("Error: Debes poner GOOGLE_DRIVE_CLIENT_ID y GOOGLE_DRIVE_CLIENT_SECRET en .env.local primero.");
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  'http://localhost:3000'
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file'],
  prompt: 'consent'
});

console.log('1. Ve a este enlace en tu navegador e inicia sesión con el correo stakeholdersadm@gmail.com:');
console.log('\n', authUrl, '\n');
console.log('2. Dale permisos. Serás redirigido a http://localhost:3000/?code=ALGO_LARGO');
console.log('3. Copia el valor de "code=" (solo lo que está después del igual y antes del & si lo hay)');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('\nPega el código aquí: ', (code) => {
  rl.close();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error al obtener el token:', err.response?.data || err.message);
    console.log('\n¡ÉXITO! Aquí tienes tu Refresh Token. Cópialo y pégalo en tu .env.local:\n');
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN="${token.refresh_token}"\n`);
  });
});
