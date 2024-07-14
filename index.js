require('dotenv').config(); 
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const {urlencoded, json} = require('body-parser');
const fetch = require('node-fetch');
const { parseBlob  } = require('music-metadata-browser');
const session = require("express-session");

const { findFolder, createFolder, uploadFileToGoogleDrive, deleteFileFromGoogleDrive } = require("./google-functions");
const { getUser, getAllUsers, createTrack, getTracks, deleteTrack, updateTrack } = require("./db");

const servidor = express();

servidor.use(cors()); 

servidor.use(session({
  secret: "Este es un secreto",
  resave: true,
  saveUninitialized : false
}));


servidor.use(urlencoded({ extended : true }));
servidor.use(json());


// Configuramos multer para que utilice el memoryStorage y guarde momentáneamente la data del archivo para luego cargarlo directamente en google
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



servidor.post("/login", async (req, res) => {
  let resultado = "ko";
  let id_user = null;
  //console.log(req.body);

    try {

      const currentUsers = await getAllUsers();
      for (let i = 0; i < currentUsers.length; i++) {
        if (currentUsers[i].user_name === req.body.user_name) {
            if (currentUsers[i].user_password === req.body.user_password) {
                req.session.user_name = currentUsers[i].user_name;
                resultado = "ok";
                id_user = currentUsers[i].id_user;
                //console.log(id_user);
                break; // Si coincide cerramos
            }
        }
    }

    res.json({ resultado, id_user : id_user }); //mandamos el resultado y el id del usuario que se logeo
      
  } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Internal server error' });
  }

});

servidor.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid'); // Assuming you're using the default session cookie name
    res.json({ message: 'Logged out successfully' });
  });
});



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


servidor.put('/updateTrack/:id', async (req, res) => {

  const  id  = req.params.id;
 const { title, artist } = req.body;

  //console.log(title, artist);

  try {
    let updatedTrack = await updateTrack(id, title, artist); // Use updateTrack to update the track

    res.json({ message: 'Track updated successfully', id: updatedTrack });

  } catch (error) {
    res.status(500).json({ error: 'Error updating track in BBDD' });
  }

});

// se crea la carpeta y se carga el archivo
servidor.post('/upload', upload.single('mp3file'), async (req, res) => {
  console.log("hola si entro al upload");
  
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

    const url =  `${process.env.BASE_URL}/proxy?id=${fileData.id}` //DUDA PARA PREGUNTAR A JOAQUIN

    const trackData = await createTrack(fileData.id, url, title, artist, id_user);


    res.json({
      message: "File uploaded and forwarded successfully",
      fileId: fileData.id,
      folderId: folderId,
      artist: artist, // Return the file name
      title: title,
      trackData : trackData,
      url : url

    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Error uploading file.' });
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


// 404 error 
servidor.use((req, res) => {
  res.status(404);
  res.json({ error: "recurso no encontrado" });
});

// Error general
servidor.use((error, req, res, next) => {
  res.status(500);
  res.json({ error: "error en la petición" });
});





servidor.listen(process.env.PORT || 4000, () => console.log(`Servidor en : ${process.env.PORT || 4000}`));
