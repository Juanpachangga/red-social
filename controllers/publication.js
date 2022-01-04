'use strict'

const path = require('path');
const fs = require('fs');
const moment = require('moment');
const mongoosePaginate = require('mongoose-pagination');

const Publication = require('../models/publication');
const User = require('../models/user');
const Follow = require('../models/follow');
const follow = require('../models/follow');

function probando(req, res){
    res.status(200).send({
        message: "Hola desde el CONTROLADOR DE PUBLICACIONES"
    });
}

function savePublication(req, res){ 

    const params = req.body;
    

    if(!params.text) return res.status(200).send({message: 'Debes enviar un texto!!'});

    const publication = new Publication();
    publication.text = params.text;
    publication.file = 'null';
    publication.user = req.user.sub;
    publication.created_at = moment().unix();

    publication.save ((err, publicationStored) =>{


        if(err) return res.status(500).send({message: 'Error al guardar la publicacion'});

        if(!publicationStored) return res.status(404).send({message: 'La publicacion NO ha sido guardada'})

        return res.status(200).send({publication: publicationStored});

    });
        
}
    function getPublications(req, res){

        var page = 1
        if(req.params.page){
            page = req.params.page;

        }

        var itemsPerPage = 4;

        Follow.find({user: req.user.sub}).populate('followed').exec((err,follows) => {
            if(err) return res.status(500).send({message: 'Error al devolver el seguimiento'});

            var follows_clean = [];

            follows.forEach((follow) =>{
                follows_clean.push(follow.followed);

            });

            Publication.find({user:{"$in": follows_clean}}).sort('-created_at').populate('user').paginate(page, itemsPerPage, (err, publications, total) =>{
                if(err) return res.status(500).send({message: 'Error al devolver publicaciones'});

                if(!publications) return res.status(404).send({message: 'No hay publicaciones'});

                return res.status(200).send({
                    total_items: total,
                    pages: Math.ceil(total/itemsPerPage),
                    page: page,
                    publications
                })

            });
        });
    }

     function getPublication(req, res){
         const publicationId = req.params.id;

         Publication.findById(publicationId, (err, publication) =>{
            if(err) return res.status(500).send({message: 'Error al devolver publicaciones'});

            if(!publication) return res.status(404).send({message: 'No existe la publicacion'});

            res.status(200).send({publication});

         });
     }

     function deletePublication(req, res){
         const publicationId = req.params.id;

         Publication.find({'user': req.user.sub, '_id': publicationId}).remove(err => {
            if(err) return res.status(500).send({message: 'Error al borrar publicaciones'});

            if(!publicationRemoved) return res.status(404).send({message: 'No se ha borrado la publicacion'});

            return res.status(200).send({message: 'Publicacion eliminada correctamente'});
         });
     }

     function uploadImage(req, res){
        const publicationId = req.params.id;
    
        
        if(req.files){
    
            const file_path = req.files.image.path;
            const file_split = file_path.split('\\');
            const file_name = file_split[2];
            const ext_split = file_name.split('\.');
            const file_ext = ext_split[1];
    
            if(file_ext == 'png' || file_ext =='jpg' || file_ext =='jpeg' || file_ext == 'gif'){

                Publication.findOne({'user':req.user.sub, '_id':publicationId}).exec((err, publication) =>{
                    console.log(publication);
                    if(publication){
                        //Actualizar documento de la publicacion
                        Publicaction.findByIdAndUpdate(publicationId, {image: file_name}, {new:true}, (err, publicationUpdated) =>{
                            if(err) return res.status(500).send({message: 'Error en la petición'});
             
                            if(!publicationUpdated) return res.status(404).send({message: 'No se ha podido actualizar el usuario'});
             
                            return res.status(200).send({publication: publicationUpdated});
                         });
            
                    }else{

                        return removeFilesOfUploads(res, file_path, 'No tienes permiso para actualizar esta publicacion');
                    }
                });
                
    
                
    
            }else{
    
                return removeFilesOfUploads(res, file_path, 'Extension no valida');
            
    
            }
    
        }else{
            return res.status(200).send({message: 'No se han subido imagenes'});
    
        }
    
    }
    
    function removeFilesOfUploads(res, file_path, message) {
        fs.unlink(file_path, (err) => {
            return res.status(200).send({message: message});
    
        });
    
    }
    
    function getImageFile(req, res){
        const image_file = req.params.imageFile;
        const path_file = './uploads/publications/'+image_file;
     
        fs.exists(path_file, (exists) => {
            if(exists){
                res.sendFile(path.resolve(path_file));
            }else{
                res.status(200).send({message: 'No existe la imagen...'});
            }
        });
    }

module.exports = {
    probando,
    savePublication,
    getPublications,
    getPublication,
    deletePublication,
    uploadImage,
    getImageFile

}