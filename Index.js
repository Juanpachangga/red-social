'use strict'

const mongoose = require('mongoose');
const app = require('./app');
const port = 3800;
const cors = require('cors');

// Conexion Database
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/curso_mean', { useNewUrlParser: true, useUnifiedTopology: true })
       .then(() => {
          console.log("La conexión a la base de datos curso_mean se ha realizado correctamente");
          
         
          // Crear Servidor
          app.listen(port, () => {  
             console.log("Servidor corriendo en http://localhost:3800");
          });
       })
       .catch(err => console.log(err));

       app.use(cors());