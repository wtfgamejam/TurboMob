"use strict";

var express = require('express');
var app = express();
var http = require('http').Server(app);

var ServerPort = 3000;

// serve static content from public dir
app.use(express.static('web'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/web/index.html');
});

http.listen(ServerPort, function() {
    console.log('listening on *:' + ServerPort);
});
