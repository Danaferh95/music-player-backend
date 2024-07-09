const { google } = require('googleapis');
const stream = require('stream');
require('dotenv').config(); 

const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString('utf-8')); //interpretación de las credenciales

const drive = google.drive({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    }),
});

// Función para verificar si la carpeta ya existe
async function findFolder(folderName, parentFolderId) {
    try {
      const response = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      return response.data.files.length > 0 ? response.data.files[0].id : null;
    } catch (error) {
      console.error('Error finding folder: ' + error);
      throw error;
    }
}

// Function para crear una carpeta
async function createFolder(folderName, parentFolderId) {
    try {
      const fileMetadata = {
        'name': folderName,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parentFolderId] // si se necesita especificar la carpeta madre
      };
      const response = await drive.files.create({
        resource: fileMetadata,
        fields: 'id' //aquí le especificamos al drive que campos queremos que nos devuelva, en este caso solo indicamos el ID
      });
      console.log('Folder ID: ', response.data.id);
      return response.data.id;
    } catch (error) {
      console.error('Error creating folder: ' + error);
      throw error;
    }
}

// Function to set permissions on a file in Google Drive
async function setFilePublic(fileId) {
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log('File is now public.');
    } catch (error) {
      console.error('Error setting file public: ' + error);
      throw error;
    }
}

// Esta es la función que nos servirá para cargar la canción en el drive
async function uploadFileToGoogleDrive(fileBuffer, fileName, folderId) {
    try {
      const fileMetadata = {
        'name': fileName,
        'parents': [folderId] // aquí viene el ID de la carpeta que se creará
      };
      const passthroughStream = new stream.PassThrough();
      passthroughStream.end(fileBuffer);

      const media = {
        mimeType: 'audio/mpeg',
        body: passthroughStream // Pasa el archivo directamente
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      });

      const fileId = response.data.id;

      // Set the file to be publicly accessible
      await setFilePublic(fileId);

      const webContentLink = `https://drive.google.com/uc?export=open&id=${fileId}`;

      console.log('File ID: ', response.data.id);
      console.log('File LINK: ', webContentLink);

      return {
        id: response.data.id,
        webContentLink: webContentLink,
        fileName: fileName // Return the file name
      };
    } catch (error) {
      console.error('The API returned an error: ' + error);
      throw error;
    }
}


async function deleteFileFromGoogleDrive(fileId) {
  try {
      await drive.files.delete({
          fileId: fileId,
      });
      console.log('File deleted successfully.');
  } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
  }
}

module.exports = {findFolder, createFolder, uploadFileToGoogleDrive, deleteFileFromGoogleDrive};
