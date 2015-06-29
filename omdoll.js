var mysql = require('mysql'),
    db = require('./db_config'),
    _sql = mysql.createPool(db);
var irc = require('irc'),
    config = require('./config');

var async = require('async');

var omdoll = new irc.Client("localhost", "클랜봇", config);

function c2s (short) {
    return "#Clan_"+String.fromCharCode(short>>24,short>>16&0xff,short>>8&0xff,short&0xff);
}

_sql.query("SELECT `short` FROM `pvpgn_clan`", function(err, rows) {
    if (err) console.error(err);
    else {
        async.forEach(rows, function(item, callback) {
            omdoll.join(c2s(item.short), function() {
                omdoll.say(c2s(item.short), "Initializing Ban Configuration");
            });
            callback();
        }, function(err) {
            if (err) console.error(err);
        });
    }
});

_sql.query("SELECT * FROM `pvpgn_channel_ban`", function(err, rows) {
    if (err) console.error(err);
    else {
        async.forEach(rows, function(item, callback) {
            if (item.ipban == "true") {
                omdoll.send("BOTBANIP", item.channel, item.ban);
                callback();
            } else {
                omdoll.send("BOTBAN", item.channel, item.ban);
                callback();
            }
        }, function(err) {
            if (err) console.error(err);
        });
    }
});

omdoll.addListener('message', function(from, to, message) {
    if (message.indexOf('-clanbanip') > -1 ) {
        var msg = message.split(" ");
        var obj = {
            "channel": msg[1],
            "ban": msg[2],
            "ipban": true
        };
        _sql.query("INSERT INTO `pvpgn_channel_ban` SET ?", obj, function(err) {
            if (err) omdoll.say(msg[1], "ERROR! - 01 SQL Connection");
            else {
                omdoll.send("BOTBANIP", msg[1], msg[2]);
            }
        });
    }

    else if (message.indexOf('-clanban') > -1 ) {
        var msg = message.split(" ");
        var obj = {
            "channel": msg[1],
            "ban": msg[2],
            "ipban": false
        };
        _sql.query("INSERT INTO `pvpgn_channel_ban` SET ?", obj, function(err) {
            if (err) omdoll.say(msg[1], "ERROR! - 01 SQL Connection");
            else {
                omdoll.send("BOTBAN", msg[1], msg[2]);
            }
        });
    }

    if (message.indexOf('-clanunban') > -1 ) {
        var msg = message.split(" ");
        _sql.query("DELETE FROM `pvpgn_channel_ban` WHERE `channel` = ? AND `ban` = ?", [msg[1], msg[2]], function(err) {
            if (err) omdoll.say(msg[1], "ERROR! - 01 SQL Connection");
            else {
                omdoll.send("BOTUNBAN", msg[1], msg[2]);
            }
        });
    }

    if (message.indexOf('-인사') > -1) {
        var msg = message.split(" ");
        if (msg.length < 2) {
            omdoll.say(from, "-인사 <인삿말> 로 입력하세요.");
        } else {
            var obj = {
                "user_id": from,
                "message": msg[1]
            };
            _sql.query("SELECT * FROM `pvpgn_omdoll_hello` WHERE `user_id` = " + mysql.escape(from), function(err, rows) {
                if (err) return omdoll.say(from, "ERROR! - 01 SQL Connection");
                else if (rows.length) {
                    _sql.query("UPDATE `pvpgn_omdoll_hello` SET `message` = ? WHERE `user_id` = ?", [msg[1], from], function(err) {
                        if (err) omdoll.say(from, "ERROR! - 01 SQL Connection");
                        else {
                            omdoll.say(from, "설정 되었습니다.");
                        }
                    });
                } else {
                    _sql.query("INSERT INTO `pvpgn_omdoll_hello` SET ?", obj, function(err) {
                        if (err) omdoll.say(from, "ERROR! - 01 SQL Connection");
                        else {
                            omdoll.say(from, "설정 되었습니다.");
                        }
                    });
                }
            });
        }
    }

    if (message.indexOf('-명령어') > -1) {
        omdoll.say(from, "그런거 몰라융 아직 만들고 있단 말이에요! (v20150630)");
    }
});

omdoll.addListener('join', function(channel, nick) {
    if (typeof(nick) == "undefined") return;
    _sql.query("SELECT * FROM `pvpgn_omdoll_hello` WHERE `user_id` = " + mysql.escape(nick), function(err, rows) {
        if (rows.length) {
            omdoll.say(channel, "["+nick+"] " + rows[0].message);
        }
    });
});