/*
El siguiente fichero tiene como objetivo crear los endpoints para que el FrontEnd se pueda 
comunicar con la base de datos y la API de Google Drive, donde guardarémos los archivos MP3 que suben lo usuarios.


Utilizaremos express, multer, cors, body-parser,dot-env, music-metadata-browser, y express-session.

Dot-env para manejar nuestras variables de entorno
Express para manejar los requests y responseses.
Multer para manejar la carga de los archivos
Cors para manejar los permisos de acceso entre websites
Body-parser para que se encarge del parse de los json
Music-metadata-browser para que recolectemos la información de los MP3s (artista, titulo)
Express-session para que maneje nuestro login

*/



require('dotenv').config(); 
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const {urlencoded, json} = require('body-parser');
const fetch = require('node-fetch');
const { parseBlob  } = require('music-metadata-browser');
const session = require("express-session");


/*
Aquí tratemos las funciones que hemos generado para el manejo de la api de google, estas se detallan en el fichero del mismo
*/
const { findFolder, createFolder, uploadFileToGoogleDrive, deleteFileFromGoogleDrive } = require("./google-functions");

/*
Aquí tratemos las funciones que hemos generado para el manejo de la conexión con las base de datos, estas se detallan en el fichero del mismo
*/
const { getUser, getAllUsers, createTrack, getTracks, deleteTrack, updateTrack } = require("./db");


//Activamos express
const servidor = express();

//Mencionamos que utilice CORS

servidor.use(cors()); 


//Aquí activamos la session

servidor.use(session({
  secret: "Este es un secreto",
  resave: true,
  saveUninitialized : false
}));


//Aqui manejamos el envio del form data
servidor.use(urlencoded({ extended : true }));

//Aqui para que se haga parse del json
servidor.use(json());


// Configuramos multer para que utilice el memoryStorage y guarde momentáneamente la data del archivo para luego cargarlo directamente en google
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



// Aquí verificamos que el usuario que está realizando el LOG IN coincida su USER NAME y su PASSWORD que tenemos guardado en la base de datos

servidor.post("/login", async (req, res) => {

  //Por default el resultado de "KO", es decir si no coincide nada entonces por defecto no se entra
  let resultado = "ko";

  //por ahora seteamos el ID del usuario en nulo
  let id_user = null;

  //Ahora probamos, llamamos a la funcion de getAllUSers de la base de datos
    try {

      const currentUsers = await getAllUsers();

      //Por cada usuario empezamos a verificar el user name primero
      for (let i = 0; i < currentUsers.length; i++) {
        if (currentUsers[i].user_name === req.body.user_name) {

          //si existe un user name verificamos su password a continuación

            if (currentUsers[i].user_password === req.body.user_password) {
              //si todo coincide entonces la session tiene el user_name
                req.session.user_name = currentUsers[i].user_name;

              //el resultado cambia a OK
                resultado = "ok";

              //nuestro id_user es lo que retorna del currentUsers
                id_user = currentUsers[i].id_user;

                break; // coincide y cerramos
            }
        }
    }

    //Mandamos el resultado y el id del usuario que se logeo
    res.json({ resultado, id_user : id_user }); 
      
  } catch (error) {
    //si ocurre un error entonces enviamos el error
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Internal server error' });
  }

});


//En esta sección es simplementa para cuando el usuario haga log out destruimos la session

servidor.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid'); 
    res.json({ message: 'Logged out successfully' });
  });
});



//Este end point es para cuando ya loggee un usuario, el Home.jsx pueda hacer la peticion de pedir todos los datos del mismo para crear la carpeta en el drive ( si no lo tiene )
servidor.get('/user/:id', async(req, res) =>{
  try{
    //Aqui esperamos a que el getUser nos retorne el userID 
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
    //Aqui llamamos a la base de datos de getTracks para cargar nuestras canciones
    let userTracks = await getTracks(req.params.id);
    res.json(userTracks);
  }catch(error){
      res.status(500);
      res.json(error)
  }
});


//Este endpoint es para actualizar la canción
servidor.put('/updateTrack/:id', async (req, res) => {

  //En params enviamos el id, y tambien recibimos el titulo y el artista en el body.
  const  id  = req.params.id;
  const { title, artist } = req.body;

//Entonces hacemos el llamado a la base de datos para actualizar la información
  try {
    let updatedTrack = await updateTrack(id, title, artist); 

    res.json({ message: 'Track updated successfully', id: updatedTrack });

  } catch (error) {
    res.status(500).json({ error: 'Error updating track in BBDD' });
  }

});

// En este endpoint cuando hacemos el upload tenemos algunas acciones que vamos a realizar

servidor.post('/upload', upload.single('mp3file'), async (req, res) => {
  
  //Aquí recibimos el archivo
  const file = req.file;
   // Aquí extraemos la información del body que nos llega
  const { id_user, user_name } = req.body;

  if (!file) { // si no existe el archivo da error
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  
  
  try {

    // Creamos un "Blob" (Binary Large Object) para manejar data grande que nos llega del archivo. 
    //usamos file.buffer porq esta propiedad accede a la información binaria del archivo directamente
    const fileBlob = new Blob([file.buffer]);

    //Ahora con el parseBlob de music-metadata-browser, interpretamos la informacióny obtenemos el artista y el titulo
    const metadata = await parseBlob(fileBlob);
    const artist = metadata.common.artist || 'Unknown Artist';
    const title = metadata.common.title || 'Unknown Title';



    // Creamos una carpeta específica para el usuario
    const folderName = `${user_name}-${id_user}`; // especificamos cual va a ser el nombre de nuestra carpeta
    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID; // nuestra variable de entorno con el ID de la carpeta madre

    //Aquí buscamos si existe la carpeta con ese id buscando el folderName y parentFolder ID que los asignamos en la parte superior (esta funcion viene del archivo de google-functions)
    let folderId = await findFolder(folderName, parentFolderId);

    if (!folderId) {
      // Si no existe, creamos la carpeta (funcion del google-functions)
      folderId = await createFolder(folderName, parentFolderId);
 
    }

    

    // Ahora cargamos el archivo en la nueva carpeta (funcion de google-functions) 
    const fileData = await uploadFileToGoogleDrive(file.buffer, file.originalname, folderId);

    //Aqui generamos la URL del archivo que se guardara en la base de datos
    const url =  `${process.env.BASE_URL}/proxy?id=${fileData.id}`

    //Por ultimo hacemos el llamado a la base de datos con toda la información. Esto retorna el ID del track cargado
    const trackData = await createTrack(fileData.id, url, title, artist, id_user);


    //Recibimos este objeto como respuesta para verificar que todo se cargo correctamente
    res.json({
      message: "File uploaded and forwarded successfully",
      fileId: fileData.id,
      folderId: folderId,
      artist: artist,
      title: title,
      trackData : trackData,
      url : url

    });
  } catch (error) {
    //Si existe un error respondemos que no se pudo cargar
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Error uploading file.' });
  }
});




// Aquí tenemos a nuestro endpoint proxy que nos va a ayudar a "recoger" nuestro archivo de google drive y luego servirlo a nuestra app para que lo pueda utilizar.
servidor.get('/proxy', async (req, res) => {

  //recolectames los datos del ID
  const { id } = req.query;
  //asignamos el URL del drive con el ID recibido
  const googleDriveUrl = `https://drive.google.com/uc?export=open&id=${id}`;

  try {
    //llamamos a google drive
    const response = await fetch(googleDriveUrl);

    //Si nos da un error, respondemos
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    //Configuramos los encabezados de la respuesta para asegurarnos de que el archivo se maneje correctamente por la aplicación
    // y que se permita su acceso desde diferentes orígenes
    res.setHeader('Content-Type', response.headers.get('content-type'));
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    //Aqui enviamos el archivo a la app si todo sale OK
    response.body.pipe(res);
  } catch (error) {
    //Si no entonces retornamos el error
    console.error('Error proxying Google Drive request:', error);
    res.status(500).send('Error proxying Google Drive request.');
  }
});


// Este endpoint sirve tanto para borrar la canción de google como de la base de datos
servidor.delete('/delete-file/:id', async (req, res) => {
  //Recibimos el ID de el request
  const { id } = req.params;

  
  try {
    //Ahora esperamos a que se borre el track de Google
      await deleteFileFromGoogleDrive(id);
    //Luego que se borre el track de nuestra base de datos
      await deleteTrack(id);
      //Respondemos que todo salio succesful
      res.json({ message: 'File deleted successfully.' });
  } catch (error) {
    // y si no entonces tenemos el error
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



//Aqui es el puerto donde va a escuchar nuestro servidor. Se actualizará con la variable de entorno

servidor.listen(process.env.PORT || 4000, () => console.log(`Servidor en : ${process.env.PORT || 4000}`));
