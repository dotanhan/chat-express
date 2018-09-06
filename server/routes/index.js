
module.exports = function (io) {
    var express = require('express');
    var router = express.Router();

    /* GET home page. */
    router.get('/', function(req, res, next) {

        res.render('index', { title: 'Express' });

        io.emit('send','send 1 message!!!');


    });
    var user = {};

    io.on('connection', function (socket) {
        socket.on('newName',function (data) {
            socket.username = data;
            user[socket.username] = socket;
        });

        socket.on('sendMessage', function (mgs) {
            if(mgs.indexOf('@') > -1){
                var name = mgs.substring(mgs.indexOf('@')+1, mgs.indexOf(' '));
                console.log(name);
                if (name in user){
                    var mgs = mgs.substring(mgs.indexOf(' '));

                    user[name].emit('getMessage', {username : socket.username, content: mgs});
                }else{
                    socket.emit('getMessage', {username : 'Thong Bao ', content: "NO USER"});
                }

            }else{
                io.emit('getMessage', {username : socket.username, content: mgs});
            }

        });

    });

    return router;
};
