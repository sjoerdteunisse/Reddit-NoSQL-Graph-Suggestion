const mongoose = require('mongoose');
const express = require('express');
const morgan =  require('morgan');
const bodyParser = require('body-parser');


//Custom
const apiError = require('./src/models/apierror');
const routes = require('./src/routes/routes')

const app = express();

app.use(morgan('dev'));
app.use(bodyParser.json());

const expressPort = process.env.PORT || 3000;
// const mongoConnectionUrl = process.env.MONGOURI || "mongodb://localhost:27017/studdit_nosql_prod";

let mongoConnectionUrl;
if(process.env.NODE_ENV === 'test'){
    console.log('test')
    mongoConnectionUrl = "mongodb+srv://studdit:0TVVRmcG9PivtBrf@cluster0-grbyc.gcp.mongodb.net/test?retryWrites=true&w=majority";
}
else if (process.env.NODE_ENV === 'production'){
    mongoConnectionUrl = "mongodb+srv://studdit:0TVVRmcG9PivtBrf@studdit-production-ppgfs.mongodb.net/test?retryWrites=true&w=majority";
    console.log('prod')
}
else if (process.env.NODE_ENV === 'local'){
    console.log('local')
    mongoConnectionUrl = 'mongodb://127.0.0.1/studdit_nosql_test';
}

//Set routing on app
routes(app);

//Handler for non existent routes
app.use('*', (req, res, next) =>{ 
  next(new apiError('Non existing endpoint', '404'))
});

//Handler for errors
app.use("*", (err, req, res, next) =>{
    console.log('Error handler encountered: ' + err.errorName + ' On: ');
    res.status(err.errorStatus >= 100 && err.errorStatus < 600 ? err.errorStatus : 500).json(err).end();
});

// since app inherits from Event Emitter, we can use this to get the app started
// after the database is connected
app.on('databaseConnected', function() {
    app.listen(expressPort, () => {
        console.log(`server is listening on port ${expressPort}`)
    });
});

// connect to the database
if(process.env.NODE_ENV !== 'test'){
    mongoose.connect(mongoConnectionUrl, {useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connection established')
        
        // fire the event that the app is ready to listen
        app.emit('databaseConnected');
    })
    .catch(err => {
        console.log('MongoDB connection failed')
        console.log(err)
    })
}
module.exports = app

