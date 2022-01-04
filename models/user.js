'use strict'
const uniqueValidator = require('mongoose-unique-validator');

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = Schema({
    name: String,
    surname: String,
    nick: {
        type: String,
        unique:true
    },
    email:{
        type: String,
        unique: true
    },
    password: String,
    role: String,
    image: String
    });

module.exports = mongoose.model('User', UserSchema);

UserSchema.plugin(uniqueValidator,({
    message: "{PATH} debe ser unico"
}));
