/*
Este fichero contiene las funciones del Google Drive Api para poder gestionar la carga/eliminacion de los archivos, crear o buscar las carpetas. Tambien
contiene las credenciales necesarias. 

Google apis para gestionar la api de google
Stream para manejar la carga de los datos del archivo MP3
Dotenv para gestionar las variables de entorno
*/

const { google } = require('googleapis');
const stream = require('stream');
require('dotenv').config(); 


// Aqui asignamos las credenciales que google nos proporciona, las credenciales fueron modificadas para que se vuelvan un string codificado, (se explicara en la memoria)

const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString('utf-8')); //interpretación de las credenciales

//Aqui asignamos a la variable del drive la versión, y la autorización para que podamos tenemos los permisos de la carpeta
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
      //llamamos al drive para que nos retorne una lista de los archivos que se encuentran ahi
      const response = await drive.files.list({
        //pasamos el parametro del nombre de la carpeta y el ID de la carpeta padre
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      //si encuentra coincidencias y el array es mas grande de 0 entonces quiere decir que existe la carpeta
      return response.data.files.length > 0 ? response.data.files[0].id : null;
    } catch (error) {
      //si no entonces la carpeta no existe
      console.error('Error finding folder: ' + error);
      throw error;
    }
}

// Function para crear una carpeta 
async function createFolder(folderName, parentFolderId) {
    try {
      //Si no existe la carpeta entonces la creamos, pasamos el folderName y el parentFolder id que es el id de la carpeta padre
      const fileMetadata = {
        'name': folderName,
        'mimeType': 'application/vnd.google-apps.folder', 
        'parents': [parentFolderId] 
      };

      //esperamos la respuesta de google drive para crear la carpeta
      const response = await drive.files.create({
        resource: fileMetadata,
        fields: 'id' //aquí le especificamos al drive que campos queremos que nos devuelva, en este caso solo indicamos el ID
      });

      //Nos retorna el id de la carpeta si hubo success
      console.log('Folder ID: ', response.data.id);
      return response.data.id;
    } catch (error) {
      //Si no entonces mandamos el error
      console.error('Error creating folder: ' + error);
      throw error;
    }
}

// Con esta funcion vamos a hacer el archivo publico para que la app pueda tener el acceso de "leer" el archivo
async function setFilePublic(fileId) {
    try {
      //aqui llamamos al metodo create de permissions dentro del drive, donde mandamos el ID y en el body que queremos que suceda con este archivo,
      //donde role es lo que el cliente puede hacer, y type para que sea cualquiera
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      //Si todo sale bien mostramos que el archivo es publico
      console.log('File is now public.');
    } catch (error) {
      //Si no retornamos error
      console.error('Error setting file public: ' + error);
      throw error;
    }
}

// Esta es la función que nos servirá para cargar la canción en el drive
async function uploadFileToGoogleDrive(fileBuffer, fileName, folderId) {
    try {

      //Creamos nuestro objeto metadata donde ponemos el nombre del archivo y el id de la carpeta que recibiremos del index.js 
      const fileMetadata = {
        'name': fileName,
        'parents': [folderId] // aquí viene el ID de la carpeta que se creará
      };

      //Creamos el stream para gestionar la carga de los datos
      const passthroughStream = new stream.PassThrough();
      //pasamos el fileBuffer que es los datos binarios de nuestro mp3 y luego cerramos el stream 
      passthroughStream.end(fileBuffer);

      //especificamos el mimeType (el tipo de contenido) que en este caso le decimos que es un audio y pasamos el stream directamente
      const media = {
        mimeType: 'audio/mpeg',
        body: passthroughStream // Pasa el archivo directamente
      };

      //Aqui esperamos a nuestra respuesta del drive para crear los datos de este archivo
      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      });

      const fileId = response.data.id;

      // Hacemos accesible al archivo
      await setFilePublic(fileId);

      //asignamos el webContentLInk para que nos muestre la ruta donde fue cargado el archivo 
      const webContentLink = `https://drive.google.com/uc?export=open&id=${fileId}`;

      //Se realizo un console log para verificar el ID del archivo y la ruta de la carpeta del drive
      console.log('File ID: ', response.data.id);
      console.log('File LINK: ', webContentLink);

      //Retornamos nuestra "fileData", el ID del archivo y el nombre
      return {
        id: response.data.id,
        fileName: fileName 
      };
    } catch (error) {
      //sino retorna un error
      console.error('The API returned an error: ' + error);
      throw error;
    }
}

//Funcion para borrar el archivo del drive, recibe "fileId" 
async function deleteFileFromGoogleDrive(fileId) {
  try {
    //lamamos al drive para realizar el delete, por dentro del objeto el id
      await drive.files.delete({
          fileId: fileId,
      });
      //se borra el archivo
      console.log('File deleted successfully.');
  } catch (error) {
    //sino retorna error
      console.error('Error deleting file:', error);
      throw error;
  }
}

//Exportamos
module.exports = {findFolder, createFolder, uploadFileToGoogleDrive, deleteFileFromGoogleDrive};
