import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getAuthClient() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  // Retrocompatibility if they still use Service Account (which failed, but just in case)
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
  } else if (email && privateKey) {
    return new google.auth.JWT({
      email,
      key: privateKey,
      scopes: SCOPES,
    });
  }

  throw new Error('Google Drive credentials are not set in environment variables.');
}

export async function getOrCreateMonthFolder(monthName: string): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID is not set.');
  }

  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  // Check if folder exists
  const query = `mimeType='application/vnd.google-apps.folder' and name='${monthName}' and '${rootFolderId}' in parents and trashed=false`;
  
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = response.data.files;
  if (files && files.length > 0 && files[0].id) {
    return files[0].id;
  }

  // Create folder if it doesn't exist
  const folderMetadata = {
    name: monthName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [rootFolderId],
  };

  const createResponse = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
    supportsAllDrives: true,
  });

  if (!createResponse.data.id) {
     throw new Error('Failed to create folder.');
  }

  return createResponse.data.id;
}

export async function getOrCreatePettyCashFolder(folderName: string): Promise<string> {
  const rootFolderId = '1PGbKgZpo4Y14ZBLTADN42-QNTI1o6H5P'; // Fixed as requested by user

  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  // Check if folder exists
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${rootFolderId}' in parents and trashed=false`;
  
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = response.data.files;
  if (files && files.length > 0 && files[0].id) {
    return files[0].id;
  }

  // Create folder if it doesn't exist
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [rootFolderId],
  };

  const createResponse = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
    supportsAllDrives: true,
  });

  if (!createResponse.data.id) {
     throw new Error('Failed to create petty cash folder.');
  }

  return createResponse.data.id;
}

export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<{ id: string; webViewLink: string | null | undefined }> {
  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: mimeType,
    body: Readable.from(fileBuffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  return {
    id: response.data.id!,
    webViewLink: response.data.webViewLink,
  };
}
