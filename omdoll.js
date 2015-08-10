var mysql = require('mysql'),
    db = require('./db_config'),
    _sql = mysql.createPool(db);
var irc = require('irc'),
    config = require('./config');

var async = require('async');
var CronJob = require('cron').CronJob,
    tip = require('./tip');

var omdoll = new irc.Client("localhost", "옴도리", config);

/*
 * @ M16 Announce TIP
 */
new CronJob("0 */15 * * * *", function() {
    omdoll.send("ANN2", "[TIP] " + tip[Math.floor(Math.random() * tip.length)]);
}, null, true);


function c2s (short) {
    return "#Clan_"+String.fromCharCode(short>>24,short>>16&0xff,short>>8&0xff,short&0xff);
}

/*
 * @ Omdoll Join Clan Channel
 */


_sql.query("SELECT `short` FROM `pvpgn_clan`", function(err, rows) {
    if (err) omdoll.say(err.stack);
    else {
        async.forEach(rows, function(item, callback) {
            omdoll.join(c2s(item.short), function() {
                omdoll.say(c2s(item.short), "안뇽, 내 이름은 옴도리!");
            });
            callback();
        }, function(err) {
            if (err) console.error(err.stack);
            console.log("[Omdoll] Complete Clan Channel Join");
        });
    }
});

/*
 * @ Omdoll Execute Banned Users
 */
_sql.query("SELECT * FROM `pvpgn_channel_ban`", function(err, rows) {
    if (err) omdoll.say(err.stack);
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
            if (err) omdoll.say(err.stack);
            console.log("[Omdoll] Complete Execute Clan Banned Users");
        });
    }
});

/*
 * @ Omdoll Join Personal Channel
 */
_sql.query("SELECT `perch_name` FROM `pvpgn_omdoll_personal_channel`", function(err, rows) {
    if (err) omdoll.say(err.stack);
    else {
        async.forEach(rows, function(item, callback) {
            omdoll.join("#"+item.perch_name, function() {
                omdoll.say(item.perch_name, "안뇽, 내 이름은 옴도리!");
            });
            callback();
        }, function(err) {
            if (err) omdoll.say(err.stack);
            console.log("[Omdoll] Complete Personal Channel Join");
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
        } else if (from == "PLZMONEY") {
            omdoll.say(from, "뽀큐뽀큥~");
        } else if (msg[1] == "삭제") {
            _sql.query("DELETE FROM `pvpgn_omdoll_hello` WHERE `user_id` = " + mysql.escape(from), function(err, rows) {
                if (err) return omdoll.say(from, "ERROR! - 01 SQL Connection");
                else {
                    omdoll.say(from, "삭제했어요.");
                }
            });
        } else {
            var obj = {
                "user_id": from,
                "message": message.substring(4)
            };
            _sql.query("SELECT * FROM `pvpgn_omdoll_hello` WHERE `user_id` = " + mysql.escape(from), function(err, rows) {
                if (err) return omdoll.say(from, "ERROR! - 01 SQL Connection");
                else if (rows.length) {
                    _sql.query("UPDATE `pvpgn_omdoll_hello` SET `message` = ? WHERE `user_id` = ?", [message.substring(4), from], function(err) {
                        if (err) omdoll.say(from, "ERROR! - 01 SQL Connection");
                        else {
                            omdoll.say(from, "설정 되었습니다. (-인사 삭제)로 삭제 할 수 있어요.");
                        }
                    });
                } else {
                    _sql.query("INSERT INTO `pvpgn_omdoll_hello` SET ?", obj, function(err) {
                        if (err) omdoll.say(from, "ERROR! - 01 SQL Connection");
                        else {
                            omdoll.say(from, "설정 되었습니다. (-인사 삭제)로 삭제 할 수 있어요.");
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
    if (typeof(nick) == "undefined" || nick == "옴도리") return;

    //_sql.getConnection(function (err, conn) {
    //    if (err) return console.error(err.stack);
        async.parallel([
            function (callback) {
                _sql.query("SELECT * FROM `pvpgn_omdoll_hello` WHERE `user_id` = " + mysql.escape(nick), function (err, rows) {
                    if (err) callback(err);
                    if (rows.length) {
                        omdoll.say(channel, "[" + nick + "] " + rows[0].message);
                        callback(null, null);
                    }
                });
            },

            function (callback) {
                _sql.query("SELECT * FROM `pvpgn_omdoll_personal_channel` WHERE `user_id` = ? AND `perch_name` = ? ", [nick, channel], function (err, rows) {
                    if (err) callback(err);
                    if (rows.length) {
                        omdoll.send("BOTTMPOP", channel, nick);
                        callback(null, null);
                    }
                });
            }

        ], function (err) {
            if (err) {
                omdoll.say(channel, err);
                console.error(err.stack);
            }
        });
    //});
});