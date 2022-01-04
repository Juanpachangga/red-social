'use strict'
const bcrypt = require('bcrypt-nodejs');
const mongoosePaginate = require('./../node_modules/mongoose-pagination/lib/pagination');
const fs = require('fs');
const path = require('path')


const User = require('../models/user');
const Follow = require('../models/follow');
const Publication = require('../models/publication');
const jwt = require('../services/jwt');
const { exists } = require('../models/user');

//Metodos de prueba
function home(req, res) {
    res.status(200).send({
        message: 'Hola mundo desde el servidor de NodeJS'
    });
}

function pruebas(req, res) {
    console.log(req.body);
    res.status(200).send({
        message: 'Accion de pruebas en el servidor de NodeJS'
    });
}

function saveUser(req, res) {
    const params = req.body;
    const user = new User();

    if (params.name && params.surname && params.nick && params.email && params.password) {

        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;

        //Controlar usuarios duplicados
        User.find({
            $or: [
                { email: user.email.toLowerCase() },
                { nick: user.nick.toLowerCase() }
            ]
        }).exec((err, users) => {
            if (err) return res.status(500).send({ message: 'Error en la peticion de usuarios' });

            if (users && users.length >= 1) {
                return res.status(200).send({ message: 'El usuario que intenta registrar ya EXISTE!' });
            } else {

                // Cifra la password y me guarda los datos
                bcrypt.hash(params.password, null, null, (err, hash) => {
                    user.password = hash;

                    user.save((err, userStored) => {
                        if (err) return res.status(500).send({ message: 'El usuario ya EXISTE!!' });

                        if (userStored) {
                            res.status(200).send({ user: userStored });
                        } else {
                            res.status(404).send({ message: 'No se ha registrado el usuario' });
                        }


                    });

                });

            }

        });

    } else {
        res.status(200).send({
            message: 'Envia todos los campos necesarios!!'
        })
    }
}
// Login 
function loginUser(req, res) {
    const params = req.body;

    const email = params.email;
    const password = params.password;

    User.findOne({ email: email }, (err, user) => {
        if (err) return res.status(500).send({ message: 'Error en la peticion' });

        if (user) {
            console.log(user)
            bcrypt.compare(password, user.password, (err, check) => {
                if (check) {
                    if (params.gettoken) {
                        //generar tokken y devolver tokken
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        });
                    } else {

                        //devolver datos de usuario
                        user.password = undefined;
                        return res.status(200).send({ user });

                    }

                } else {
                    return res.status(404).send({ message: 'El usuario no se ha podido identificar' });
                }
            });
        } else {
            return res.status(404).send({ message: 'El usuario no se ha podido identificar' });
        }

    });

}

//Conseguir datos de un usuario
function getUser(req, res) {
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
        if (err) return res.status(500).send({ message: 'Error en la peticion' });

        if (!user) return res.status(404).send({ message: 'El usuario no existe' });

        followThisUser(req.user.sub, userId).then((value) => {
            user.password = undefined;

            return res.status(200).send({
                user,
                following: value.following,
                followed: value.followed

            });

        });


    });
}
async function followThisUser(identity_user_id, user_id) {
    var following = await Follow.findOne({ "user": identity_user_id, "followed": user_id }).exec().then((follow) => {
        return follow;
    }).catch((err) => {
        return handleError(err);
    });

    var followed = await Follow.findOne({ "user": user_id, "followed": identity_user_id }).exec().then((follow) => {
        console.log(follow);
        return follow;
    }).catch((err) => {
        return handleError(err);
    });


    return {
        following: following,
        followed: followed
    }
}
//devolver un listado de usuarios paginado
function getUsers(req, res) {
    const identity_user_id = req.user.sub;

    var page = 1;

    if (req.params.page) {
        page = req.params.page;

    }

    const itemsPerPage = 5;

    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
        if (err) return res.status(500).send({ message: 'Error en la peticion' });

        if (!users) return res.status(404).send({ message: 'No hay usuarios disponibles' });

        followUserIds(identity_user_id).then((value) => {

            return res.status(200).send({
                users,
                users_following: value.following,
                users_follow_me: value.followed,
                total,
                pages: Math.ceil(total / itemsPerPage)

            });
        });


    });
}

async function followUserIds(user_id) {
    //Following
    const following = await Follow.find({ "user": user_id }).select({ '_id': 0, '__v': 0, 'user': 0 }).exec().then((follows) => {


        const follows_clean = [];

        follows.forEach((follow) => {
            follows_clean.push(follow.followed);


        });

        return follows_clean;
    })
        .catch((err) => {

            return handleerror(err);

        });
    //Followed
    const followed = await Follow.find({ "followed": user_id }).select({ '_id': 0, '__v': 0, 'followed': 0 }).exec().then((follows) => {
        const follows_clean = [];

        follows.forEach((follow) => {
            follows_clean.push(follow.user);


        });

        return follows_clean;
    })
        .catch((err) => {

            return handleerror(err);

        });


    return {
        following: following,
        followed: followed
    }

}

function getCounters(req, res) {
    var userId = req.user.su;
    if (req.params.id) {
        userId = req.params.id;
    }

    getCountFollow(userId).then((value) => {
        return res.status(200).send(value);

    });
}

async function getCountFollow(user_id) {
    var following = await Follow.countDocuments({ user: user_id })
        .exec()
        .then((count) => {
            console.log(count);
            return count;
        })
        .catch((err) => { return handleError(err); });

    var followed = await Follow.countDocuments({ followed: user_id })
        .exec()
        .then((count) => {
            return count;
        })
        .catch((err) => { return handleError(err); });

    var publications = await Publication.countDocuments({ user: user_id })
        .exec()
        .then((count) => {
            return count;
        })
        .catch((err) => { return handleError(err); });

    return { following: following, followed: followed, publication: publications }
}



//Edicion de datos de usuario

//Actualizar datos del usuario
function updateUser(req, res) {
    var userId = req.params.id;
    var update = req.body;
    //borrar contraseña
    delete update.password;
    //borrar email
    delete update.email;
    if (userId != req.user.sub) {
        console.log(userId)
        console.log(req.user.sub)
        res.status(500).send({ message: 'No tienes permisos para actualizar los datos' });
    } else {
        User.find({
            $or: [
                { nick: update.nick() }
            ]
        }).exec((err, users) => {
            if (users && users.length >= 1) {
                return res.status(200).send({ message: 'El nick ya está registrado por otro usuario' });
            } else {
                User.findByIdAndUpdate(userId, update, { new: true }, (err, userUpdated) => {
                    if (err) return res.status(500).send({ message: 'Error en la petición' });
                    if (!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });
                    return res.status(200).send({ user: userUpdated });
                });
            }
        });
    }
}

//subir archivos de imagen/avatar de usuario

function uploadImage(req, res) {
    const userId = req.params.id;


    if (req.files) {

        const file_path = req.files.image.path;
        console.log(file_path);

        const file_split = file_path.split('\\');
        console.log(file_split);

        const file_name = file_split[2];
        console.log(file_name);

        const ext_split = file_name.split('\.');
        console.log(ext_split);

        const file_ext = ext_split[1];

        if (userId != req.user.sub) {
            return removeFilesOfUploads(res, file_path, 'No tienes permiso para actualizar los datos del usuario');

        }

        if (file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif') {
            //voy actualizar documento de usuario logueado

            User.findByIdAndUpdate(userId, { image: file_name }, { new: true }, (err, userUpdated) => {
                if (err) return res.status(500).send({ message: 'Error en la petición' });

                if (!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });

                return res.status(200).send({ user: userUpdated });
            });

        } else {

            return removeFilesOfUploads(res, file_path, 'Extension no valida');


        }

    } else {
        return res.status(200).send({ message: 'No se han subido imagenes' });

    }

}

function removeFilesOfUploads(res, file_path, message) {
    fs.unlink(file_path, (err) => {
        return res.status(200).send({ message: message });

    });

}

function getImageFile(req, res) {
    const image_file = req.params.imageFile;
    const path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendFile(path.resolve(path_file));
        } else {
            res.status(200).send({ message: 'No existe la imagen...' });
        }
    });
}



module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    updateUser,
    uploadImage,
    getImageFile,
    getCounters,
    getCountFollow

}