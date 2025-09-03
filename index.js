require('dotenv').config()
const express = require('express');
const ParseServer = require('parse-server').ParseServer;
const app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const { PORT, PARSE_MONGODB_URI, PARSE_APPID, PARSE_MASTERKEY, PARSE_RESTKEY, PARSE_JSKEY, PARSE_SERVER_URL } = process.env;

const server = new ParseServer({
    databaseURI: PARSE_MONGODB_URI,
    cloud: './cloud/main.js',
    appId: PARSE_APPID,
    masterKey: PARSE_MASTERKEY,
    restAPIKey: PARSE_RESTKEY,
    javascriptKey: PARSE_JSKEY,
    serverURL: PARSE_SERVER_URL,
    liveQuery: {
        classNames: ['Account']
    }
});

const init = async () => {
    await server.start();
    app.use('/parse', server.app);
    let httpServer = require('http').createServer(app);
    httpServer.listen(PORT || 1337);
    ParseServer.createLiveQueryServer(httpServer);
    /*app.listen(PORT || 1337, function () {
        console.log('Partner backend running', PORT || 1337);
    });*/
}
init();
