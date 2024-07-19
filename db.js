/*
Este fichero contiene las funciones para gestionar la base de datos

Dotenv para gestionas las variables de entorno
Postgres para gestionar nuestra base de datos PostgresSQL

*/

require('dotenv').config(); 
const postgres = require("postgres");


//Primero con la funcion conectar llamamos a postgres donde le mandamos como datos estas variables de entorno

function conectar(){
    return postgres({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
}


//Con esta funcion buscamos todos los usuarios donde coincida el "id" 
function getUser(id){
    
    return new Promise(async (ok,ko) =>{
        //conectamos a la BBDD
        const conexion = conectar();

        //hacemos el llamado para que nos retorne todos los datos del usuario (id, user_name, password)
        try{
            let [usuario] = await conexion`SELECT * FROM users WHERE id_user = ${id}`;
            //cuando devuelve el usuario cierra la conexion de la base de datos
            conexion.end();
            //retorna usuario si salio todo OK
            ok(usuario);

        }catch(error){
            //sino retorna error
            ko({ error : "error en BBDD"});
        }

    });
}

//Esta funcion es para retornar todos los ususario que esta en la base de datos, esto es para poder hacer la verificación del Log IN

function getAllUsers(){
    return new Promise(async (ok,ko) =>{
        //conectamos a la BBDD
        const conexion = conectar();

        try{

            //pedimos todos los ususarios
            let users = await conexion`SELECT * FROM users`;
             //cuando devuelve los usuarios cierra la conexion de la base de datos
            conexion.end();
           //retorna usuarios si salio todo OK
            ok(users);

        }catch(error){
            //sino retorna error
            ko({ error : "error en BBDD"});
        }

    });
}

//Esta funcion es para cargar los tracks que se asocian al ususario, el "id" es el ID del ususario

function getTracks(id){
    return new Promise(async (ok,ko) =>{
         //conectamos a la BBDD
        const conexion = conectar();
       
        try{
            let tracks = await conexion`SELECT * FROM tracks WHERE id_user = ${id}`;
            //cuando devuelve los tracks cierra la conexion de la base de datos
            conexion.end();
            //retorna tracks si salio todo OK
            ok(tracks);

        }catch(error){
            //sino retorna error
            ko({ error : "error en BBDD"});
        }

    });
}

//Esta funcion es para la creación de una nueva track en la base de datos, como paremetros neceistamos el id_track, su url, titulo, artista, y id_user

function createTrack(id_track, url, title, artist, id_user){

    return new Promise(async (ok,ko) =>{
         //conectamos a la BBDD
        const conexion = conectar();

        try{
            //insertamos toda la data, y nos retorna el id_track que es el insertedID
            let [{ id_track: insertedId }] = await conexion`
                INSERT INTO tracks (id_track, url, title, artist, id_user) 
                VALUES (${id_track}, ${url}, ${title}, ${artist}, ${id_user}) 
                RETURNING id_track`; 
            
            conexion.end();
            //retorna el inserted ID si todo salio OK
            ok({insertedId});

        }catch(error){
            //sino retorna error
            ko({ error : "error en BBDD"});
        }

    });


}

//Esta funcion es para la actualización del titulo y nombre de artista del MP3 (pero afecta solo en la base de datos, 
//no en el archivo del DRIVE, el cual mantiene su nombre original según los datos que recibio, esta para es para la parte visual del usuario)
//le pasamos el id_track, el nuevo texto de title que queremos, y el nuevo texto de artista que queremos

function updateTrack(id_track, title, artist){

    return new Promise(async (ok,ko) =>{
        //conectamos a la BBDD
        const conexion = conectar();

        try{
            //Aqui de igual forma hacemos el llamado a la base de datos para actualizar segun el ID del track el titulo y el artista
            let [{ id_track: insertedId }] = await conexion`
                UPDATE tracks
                SET title = ${title}, artist = ${artist}
                WHERE id_track = ${id_track}
                RETURNING id_track`; 
            
            //cierra la conexion
            conexion.end();
            //retorna el insertedId que modifico
            ok(insertedId);

        }catch(error){
            //sino retorna error
            ko({ error : "error en BBDD"});
        }

    });
    
}


//Funcion para borrar el track, le pasamos el "Id"
function deleteTrack(id){
    return new Promise(async (ok,ko) =>{
        //conectamos a la BBDD
        const conexion = conectar();

        try{
            //llamamos a la base de datos para borrar la información de la canción segun el ID
            let resultado = await conexion`DELETE FROM tracks WHERE id_track = ${id}`;
            //cierra la conexion
            conexion.end();
            //retorna el "count" de los resultados, si retorna 1 es porque borro item, lo cual quiere decir q funciono
            ok(resultado.count);

        }catch(error){
            //retorna error
            ko({ error : "error en BBDD"});
        }

    });
}


/*
getUser(1)
.then( x => console.log(x))
.catch( x => console.log(x))*/

/*
getAllUsers()
.then( x => console.log(x))
.catch( x => console.log(x)) */

/*createTrack("url.com", "TituloX", "ArtistaX", 23)
.then( x => console.log(x))
.catch( x => console.log(x))*/


/*
getTracks(1)
.then( x => console.log(x))
.catch( x => console.log(x))*/

/*
updateTrack("14MWIP0XWYsuzX-9_JASB99vxhOB0l01M", "Around Mid", "Synapson")
.then( x => console.log(x))
.catch( x => console.log(x))*/


/*
deleteTrack(7)
.then( x => console.log(x))
.catch( x => console.log(x))*/


module.exports = {getUser, getAllUsers, createTrack, getTracks, deleteTrack, updateTrack} ;