require('dotenv').config()
const express = require('express');
const ParseServer = require('parse-server').ParseServer;
const app = express();

const { PORT, PARSE_MONGODB_URI, PARSE_APPID, PARSE_MASTERKEY, PARSE_RESTKEY, PARSE_SERVER_URL } = process.env;

const server = new ParseServer({
    databaseURI: PARSE_MONGODB_URI,
    cloud: './cloud/main.js',
    appId: PARSE_APPID,
    masterKey: PARSE_MASTERKEY,
    restAPIKey: PARSE_RESTKEY,
    serverURL: PARSE_SERVER_URL
});

const init = async () => {
    await server.start();
    app.use('/parse', server.app);
    app.listen(PORT || 1337, function () {
        console.log('Partner backend running', PORT || 1337);
    });
}
init();
