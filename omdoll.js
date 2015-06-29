var mysql = require('mysql');
var irc = require('irc'),
    config = require('./config');

var omdoll = new irc.Client("ggu.la", "옴도리", config);

omdoll.addListener('message', function(from, to, message) {
    if (message.indexOf('Hello') > -1 ) {
        omdoll.say(to, "Hello");
    }
});