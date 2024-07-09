const postgres = require("postgres");

function conectar(){
    return postgres({
        host: "localhost",
        database: "Tracks",
        user : "postgres",
        password : "admin"
    });
}

function getUser(id){
    return new Promise(async (ok,ko) =>{
        const conexion = conectar();

        try{
            let [usuario] = await conexion`SELECT * FROM users WHERE id_user = ${id}`;
            //cuando devuelve los colores cierra la conexion de la base de datos
            conexion.end();
            //retorna colores si salio todo OK
            ok(usuario);

        }catch(error){
            ko({ error : "error en BBDD"});
        }

    });
}

function getTracks(id){
    return new Promise(async (ok,ko) =>{
        const conexion = conectar();

        try{
            let tracks = await conexion`SELECT * FROM tracks WHERE id_user = ${id}`;
            //cuando devuelve los colores cierra la conexion de la base de datos
            conexion.end();
            //retorna colores si salio todo OK
            ok(tracks);

        }catch(error){
            ko({ error : "error en BBDD"});
        }

    });
}


function createTrack(id_track, url, title, artist, id_user){

    return new Promise(async (ok,ko) =>{
        const conexion = conectar();

        try{

            let [{ id_track: insertedId }] = await conexion`
                INSERT INTO tracks (id_track, url, title, artist, id_user) 
                VALUES (${id_track}, ${url}, ${title}, ${artist}, ${id_user}) 
                RETURNING id_track`; 
            
            //cuando devuelve los colores cierra la conexion de la base de datos
            conexion.end();
            //retorna colores si salio todo OK
            ok(insertedId);

        }catch(error){
            ko({ error : "error en BBDD"});
        }

    });


}


function deleteTrack(id){
    return new Promise(async (ok,ko) =>{
        const conexion = conectar();

        try{
            let resultado = await conexion`DELETE FROM tracks WHERE id_track = ${id}`;
            //cuando devuelve los colores cierra la conexion de la base de datos
            conexion.end();
            //retorna colores si salio todo OK
            ok(resultado.count);

        }catch(error){
            ko({ error : "error en BBDD"});
        }

    });
}

/*getUser(1)
.then( x => console.log(x))
.catch( x => console.log(x))*/

/*createTrack("url.com", "TituloX", "ArtistaX", 23)
.then( x => console.log(x))
.catch( x => console.log(x))*/


/*
getTracks(1)
.then( x => console.log(x))
.catch( x => console.log(x))*/

/*
deleteTrack(7)
.then( x => console.log(x))
.catch( x => console.log(x))*/


module.exports = {getUser, createTrack, getTracks, deleteTrack} ;