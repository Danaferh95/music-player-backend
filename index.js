require('dotenv').config(); 
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const fetch = require('node-fetch');
const { parseBlob  } = require('music-metadata-browser');

const { findFolder, createFolder, uploadFileToGoogleDrive, deleteFileFromGoogleDrive } = require("./google-functions");
const { getUser, createTrack, getTracks, deleteTrack } = require("./db");

const servidor = express();

servidor.use(cors()); 
servidor.use(helmet());

// Custom CSP configuration
servidor.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://apis.google.com"],
    connectSrc: ["'self'", "https://www.googleapis.com"],
    mediaSrc: ["'self'", "https://drive.google.com"],
    frameSrc: ["'self'", "https://drive.google.com"],
    imgSrc: ["'self'", "data:", "https://drive.google.com"],
  }
}));

// Configuramos multer para que utilice el memoryStorage y guarde momentáneamente la data del archivo para luego cargarlo directamente en google
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });








//Este end point es para cuando loggee un usuario, el Home.jsx pueda hacer la peticion de pedir todos los datos del usuario para crear la carpeta en el drive, si esq no lo tiene
servidor.get('/user/:id', async(req, res) =>{
  try{
    let userId = await getUser(req.params.id);
    res.json(userId);
  }catch(error){
      res.status(500);
      res.json(error)
  }
});


//Este end point es para  cargar las canciones existentes
servidor.get('/tracks/:id', async(req, res) =>{
  try{
    let userTracks = await getTracks(req.params.id);
    res.json(userTracks);
  }catch(error){
      res.status(500);
      res.json(error)
  }
});


// se crea la carpeta y se carga el archivo
servidor.post('/upload', upload.single('mp3file'), async (req, res) => {
  const file = req.file;
  const { id_user, user_name } = req.body; // Aquí extraemos la información del body que nos llega

  if (!file) { // si no existe el archivo da error
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {

    // Convert file buffer to Blob
    const fileBlob = new Blob([file.buffer]);

    //sacamos la data de la canción
    const metadata = await parseBlob(fileBlob);
    const artist = metadata.common.artist || 'Unknown Artist';
    const title = metadata.common.title || 'Unknown Title';



    // creamos una carpeta específica para el usuario
    const folderName = `${user_name}-${id_user}`; // especificamos cual va a ser el nombre de nuestra carpeta
    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID; // nuestra variable de entorno con el ID de la carpeta madre

    let folderId = await findFolder(folderName, parentFolderId);

    if (!folderId) {
      // Create the folder if it doesn't exist
      folderId = await createFolder(folderName, parentFolderId);
 
    }

    // Upload the file to the found or created folder
    const fileData = await uploadFileToGoogleDrive(file.buffer, file.originalname, folderId);

    const url =  `http://localhost:4000/proxy?id=${fileData.id}` //DUDA PARA PREGUNTAR A JOAQUIN

    const trackData = await createTrack(fileData.id, url, title, artist, id_user);


    res.json({
      message: "File uploaded and forwarded successfully",
      fileId: fileData.id,
      folderId: folderId,
      artist: artist, // Return the file name
      title: title,
      trackData : trackData

    });
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    res.status(500).json({ error: 'Error uploading file to Google Drive.' });
  }
});




// Proxy endpoint to handle Google Drive requests
servidor.get('/proxy', async (req, res) => {
  const { id } = req.query;
  const googleDriveUrl = `https://drive.google.com/uc?export=open&id=${id}`;

  try {
    const response = await fetch(googleDriveUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    res.setHeader('Content-Type', response.headers.get('content-type'));
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    response.body.pipe(res);
  } catch (error) {
    console.error('Error proxying Google Drive request:', error);
    res.status(500).send('Error proxying Google Drive request.');
  }
});


// Define the endpoint to delete a file from Google Drive
servidor.delete('/delete-file/:id', async (req, res) => {
  const { id } = req.params;

  try {
      await deleteFileFromGoogleDrive(id);
      await deleteTrack(id);
      res.json({ message: 'File deleted successfully.' });
  } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      res.status(500).json({ error: 'Error deleting file from Google Drive.' });
  }
});





servidor.listen(process.env.PORT || 4000, () => console.log(`Servidor en : ${process.env.PORT || 4000}`));
