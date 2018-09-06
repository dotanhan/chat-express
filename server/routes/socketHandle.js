module.exports = function (io) {
    var express = require('express');
    var router = express.Router();
    var fs = require('fs');
    var mysql = require('mysql');

    //load core
    var Constant = require('../core/constant.js');
    var Common = require('../core/common.js');
    var common = new Common();

    router.get('/abc', function (req, res) {
        res.send('sdsdsds');
    })

    //load model
    var Conversation = require('../models/Conversation.js');
    var User_join_conversation = require('../models/User_join_conversation.js');
    var Message = require('../models/Message.js');
    var User_tmp = require('../models/User_tmp.js');
    var ReadConversation = require('../models/Read_conversation');

    var user_tmp = new User_tmp();

    var users = {};
    var socket_data = {};
    var user_onlines_ = [];
    var user_leaves_ = [];
    io.on('connection', function (socket) {
// when the client emits 'adduser', this listens and executes
        /**
         * emit message to other clients
         */

        socket.on('add_user', function (data) {
            var user_id = data.user_id;
            common.dlog(user_id + ' Connected');
            //add user_onlines_
            user_onlines_.push(user_id);
            // common.xlog('user_onlines_', user_onlines_);
            // common.xlog('user_leaves_', user_leaves_);
            // remove user_id in user_leaves_
            user_leaves_.splice(user_leaves_.indexOf(user_id), 1);
            // common.xlog('after remove user_id', user_leaves_);
            //get user info
                var query = "SELECT _id, fullname, img_src FROM account WHERE _id="+user_id;
                user_tmp.get_info(query, function (result) {
                    if (result.result == 'OK' && result.data.length) {
                        var result_user = result.data[0];
                        socket.nickname = result_user.fullname;
                        socket.user_id = result_user._id;

                        socket.avatar = '';
                        if (common.isNotEmpty(result_user.img_src)) {
                            socket.avatar = result_user.img_src;
                        }
                        else if (common.isNotEmpty(result_user.fb_img_src)) {
                            socket.avatar = result_user.drop_img_src;
                        }
                        else if (common.isNotEmpty(result_user.gg_img_src)) {
                            socket.avatar = result_user.gg_img_src;
                        }

                        socket_data[socket.user_id] = socket;
                        users[socket.user_id] = {name: socket.nickname, id: socket.user_id};
                        // updateNickname();
                        update_conversation();
                        socket.broadcast.emit('online_status', {user_id : socket.user_id, status : 'on'});

                    }else{
                        socket.emit('error_server', {result: Constant.FAILED_CODE, message: Constant.SERVER_ERR});
                    }
                });
        });

        socket.on('revert_conversation', function (data) {
            if (common.isNotEmpty(data.conversation_id)) {
                socket.conver = data.conversation_id;
                socket.join(socket.conver);
            }
        });

        //update user online
        function updateNickname() {
            var user_array = [];
            for (var us in users) {
                user_array.push(users[us]);
            }
            io.sockets.emit('update_user', user_array);
        }

        //send image user
        socket.on('send_image', function (data) {
            var image = data.image;
            var ext = data.ext;
            if (common.isEmpty(socket.conver)) {
                var conversa = new Conversation();
                var userJoin_conv = new User_join_conversation();
                var data_conver = {
                    title: '',
                    channel: '',
                    type: Constant.TYPE_MESSAGE.SINGLE,
                    user_id: socket.user_id,
                    join_user: [parseInt(socket.user_id), parseInt(socket.conver_user)].sort()
                }
                conversa.insert(data_conver, function (result) {
                    common.xlog('conversa.insert result', result.data);
                    /*Todo: need check*/
                    //crash server ????
                    // socket.conver = result.data._id.toString();
                    // socket.join(socket.conver);
                    //crash server ????
                    sendMessageFile(image, ext);
                });
            } else {
                sendMessageFile(image, ext);
            }
        });

        //send image message
        function sendMessageFile(image, ext) {
            // common.xlog('22222 image', image);
            // var base64Data  =   image.replace(/^data:image\/png;base64,/, "");
            // base64Data  +=  base64Data.replace('+', ' ');
            var imageBuffer = decodeBase64Image(image);

            if (common.isEmpty(ext)) {
                var str = imageBuffer.type;
                var n = str.lastIndexOf('/');
                var file_type = str.substring(n + 1);
            }
            else {
                var file_type = ext;
            }

            // common.xlog('imageBuffer', imageBuffer);
            var file_name = "./public/upload/" + socket.user_id + "/message/";
            try {
                stat = fs.statSync(file_name);
            } catch (err) {		//not exist
                file_name = "./public/upload/" + socket.user_id;
                try {
                    fs.mkdirSync(file_name);
                } catch (e) {
                }
                file_name += "/message/";
                try {
                    fs.mkdirSync(file_name);
                } catch (e) {
                }
            }

            file_name = file_name + new Date().getTime() + "." + file_type;
            common.xlog('file_name', file_name);
            fs.writeFile(file_name, imageBuffer.data, function (err) {
                if (err) throw err;

                //update database
                var message = new Message();
                var msg = socket.nickname + ' đã gửi file';
                var data_message = {
                    message: msg,
                    attachment_thumb_src: file_name,
                    user_id: socket.user_id,
                    user_name: socket.nickname,
                    conversation_id: socket.conver,
                    type: Constant.TYPE_MESSAGE.IMAGE
                }
                // common.xlog('data_message', data_message);
                // message.insert(data_message, function (resp_data_msg) {
                //     common.xlog('resp_data_msg', resp_data_msg);
                //     update_conversation_dual(socket.conver);
                //     update_conversation();
                //     io.sockets.in(socket.conver).emit('add_image', {nick : socket.nickname, msg: image});
                // });

                var conversation = new Conversation();

                message.insert(data_message, function (resp_data_msg) {
                    io.sockets.in(socket.conver).emit('update_message', resp_data_msg);
                    conversation.update({_id: socket.conver}, {
                        last_message: msg,
                        update_time: Date.now()
                    }, function () {

                        // common.xlog('user_leaves_', user_leaves_);
                        if (user_leaves_.length) {

                            //send push notification
                            var sender_id = socket.user_id;
                            var receiver_ids = user_leaves_;
                            var conversation_id = socket.conver;

                            common.xlog('sender_id', sender_id);
                            common.xlog('receiver_ids', receiver_ids);
                            common.xlog('conversation_id', conversation_id);

                        }
                        //end check user_leaves_

                        //update conversation
                        update_conversation_dual(socket.conver);
                        update_conversation();
                    });
                });

            });
        }


        /**
         * Decode Base64 to Buffer
         * @param dataString
         * @returns {*}
         */
        function decodeBase64Image(dataString) {
            // common.xlog('dataString', dataString);
            //test base64 image
            // var dataString = 'data:image/gif;base64,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';
            // var dataString = 'data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAA\/8AAAH+CAIAAABFoymNAAAAAXNSR0IArs4c6QAA\r\nAAlwSFlzAAAhOAAAITgBRZYxYAAAABxpRE9UAAAAAgAAAAAAAAD\/AAAAKAAAAP8A\r\nAAD\/AAiFyH3EPagAAEAASURBVHgBlL13fJv1vfbvx378OCdpmpSSJidNSkKhBR6g\r\nhTIKBwiltKVQ1oFDW0qaMAOhtGlLmpSkiYNtLDta0bSGbdnYGta0LUuWl7w0LWvv\r\n7b2dzejvn9\/1veUY2jNer8fn4j63tnTfcvy+Pp\/r823RSY38vRbpH+TS91X1H6gb\r\nT2sbq\/TNNR1NzM5mlrGZa2oWdcsbe5QtfepWSooBbZtVrxs0tI8YOkb0HUN644jB\r\n4uga8PQMevuHPH1D7p4RT7\/DP+QOjoyH7L6IMxBxBaPucNwTTfliqUA06Y+mAvF0\r\nMJkJJbMRSuFEJhTPhCJJXzjujSSIQjFPIDoWiLgh7AdjHm\/YOR5yeEJ2T5BoLGBz\r\nB0ZdvlG3z+b0jzr8o66A3RNyjkdc45ExT8jlCjgcPrvdb8N2dHxkaGzQ6rL2Owd6\r\nKVkcA932fqO9r320Rw+N9ELa0R7VUHfLQFejxSDu1p8z61hdmtoOVZW+tULbckbd\r\nUq5pKde3ntbLT+sVp\/TykzrFcY38T21N7ykaDrdKDjVL3pSJX5dJXmtpPKRo+oOy\r\n9Q+Kj99panyzQXKgQXyQXN\/welP9282y9xWt5VpNdbuB3W0+Z7FUGNt\/r239D3nT\r\n4y3yfbKWhxsaH6pvfKRB9lhD00\/qmx6XNj4mkf2soRmi9nGx8UeSxn2i+geFkh9w\r\nBXfwhbdJpNCtYgn0XaHkJj4kvpEn3ssV3cSvv1nQ';

            var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
                response = {};

            // common.xlog('matches', matches);
            if (matches.length !== 3) {
                return new Error('Invalid input string');
            }

            response.type = matches[1];
            response.data = new Buffer(matches[2], 'base64');

            return response;
        }

        //show conversation
        function update_conversation() {
            // var userJoin = new User_join_conversation();
            var conversa = new Conversation();
            var readConver = new ReadConversation();
            var message = new Message();
            var user = new User_tmp();
            var list_conver = {};
            var index_ = 0;
            var cond = {
                join_user: {'$in': [socket.user_id]},
            }

            conversa.find(cond, function (result_conve) {
                if (result_conve.result == Constant.OK_CODE && result_conve.data.length > 0) {
                    for (var i = 0; i < result_conve.data.length; i++) {
                        var data_conv = result_conve.data[i];

                        list_conver[data_conv._id] = {
                            id_conver: data_conv._id,
                            name: '', //name user
                            avartar: '',
                            last_message: data_conv.last_message,
                            created_time: data_conv.update_time
                        }
                        var user_ev = '';
                        for (var x = 0; x < data_conv.join_user.length; x++) {
                            if (data_conv.join_user[x] != socket.user_id) {
                                user_ev = data_conv.join_user[x];
                            }
                        }
                        //info user
                        var query = "SELECT _id, fullname, img_src, online_status FROM account WHERE _id="+user_ev;

                        user_tmp.get_info_syns(query,data_conv._id, function (result) {
                            if (result.result == 'OK' &&  result.data.length) {
                                var data_user = result.data[0];
                                list_conver[result.data_syns]['name'] = data_user.fullname;
                                list_conver[result.data_syns]['_id'] = data_user._id;
                                list_conver[result.data_syns]['status'] = data_user.online_status;
                                if (common.isNotEmpty(data_user.img_src)) {
                                    list_conver[result.data_syns]['avartar'] = data_user.img_src;
                                }
                                else if (common.isNotEmpty(data_user.fb_img_src)) {
                                    list_conver[result.data_syns]['avartar'] = data_user.fb_img_src;
                                }
                                else if (common.isNotEmpty(data_user.gg_img_src)) {
                                    list_conver[result.data_syns]['avartar'] = data_user.gg_img_src;
                                }
                                readConver.countUnRead({conversation_id : result.data_syns,receiver: socket.user_id, is_read: false},result.data_syns, function (data) {
                                    list_conver[data.converid]['unread'] = data.data;

                                    index_++;
                                    if (index_ == result_conve.data.length) {
                                        var list_conver_array = [];
                                        for (var conv in list_conver) {
                                            list_conver_array.push(list_conver[conv]);
                                        }
                                        var list_conver_ = list_conver_array.sort(function (date1, date2) {
                                            return new Date(date1).getTime() - new Date(date2).getTime();
                                        });
                                        var conversation_list = {list_conver: list_conver_};
                                        //{list_conver: list_conver_, current_conver: socket.conver }
                                        if (common.isNotEmpty(socket.conver)) {
                                            conversation_list['current_conver'] = socket.conver;
                                        } else {
                                            conversation_list['current_conver'] = '';
                                        }
                                        // common.xlog('9999 emit update_conversation', conversation_list);
                                        socket.emit('update_conversation', conversation_list);
                                    }
                                });

                            }else{
                                list_conver[result.data_syns]['name'] = "User";
                            }
                        });
                    }
                } else {
                    // common.xlog('update_conversation()', 'not found');
                    socket.emit('update_conversation', {current_conver : '', list_conver: []});
                }
            });
        }

        // when the client emits 'sendchat', this listens and executes
        socket.on('send_message', function (data) {
            //created database
            common.dlog('send message: socket.conversation: ' + socket.conver);
            if (common.isEmpty(socket.conver)) {
                var conversa = new Conversation();
                var userJoin_conv = new User_join_conversation();
                var data_conver = {
                    title: '',
                    channel: '',
                    type: Constant.TYPE_MESSAGE.SINGLE,
                    user_id: socket.user_id,
                    join_user: [parseInt(socket.user_id), parseInt(socket.conver_user)].sort()
                }
                // common.xlog('333 send_message', socket.user_id + ' === ' +  socket.conver_user);
                conversa.insert(data_conver, function (result) {
                    if (result.result == Constant.OK_CODE) {
                        socket.conver = result.data._id.toString();
                        socket.join(socket.conver);
                        sendMessage(data.message);
                    }
                });
            } else {
                sendMessage(data.message);
            }
        });

        function sendMessage(msg) {
            var message = new Message();
            var conversation = new Conversation();
            var readCoversation = new ReadConversation();
            var data_message = {
                message: msg,
                user_id: socket.user_id,
                user_name: socket.nickname,
                conversation_id: socket.conver,
                type: Constant.TYPE_MESSAGE.TEXT
            }
            message.insert(data_message, function (resp_data_msg) {
                var query = "SELECT _id, fullname, img_src FROM account WHERE _id="+socket.user_id;
                user_tmp.get_info(query, function (result) {
                    if (result.result == 'OK' && result.data.length) {
                        var data_user = result.data[0];
                        resp_data_msg['data']['user_name'] = data_user.fullname;
                        if (common.isNotEmpty(data_user.img_src)) {
                            resp_data_msg['data']['avatar'] = data_user.img_src;
                        }
                        else if (common.isNotEmpty(data_user.fb_img_src)) {
                            resp_data_msg['data']['avatar'] = data_user.fb_img_src;
                        }
                        else if (common.isNotEmpty(data_user.gg_img_src)) {
                            resp_data_msg['data']['avatar'] = data_user.gg_img_src;
                        }
                    }
                    io.sockets.in(socket.conver).emit('update_message', resp_data_msg);
                    conversation.update({_id: socket.conver}, {last_message: msg, update_time: Date.now()}, function () {
                        //update conversation
                        update_conversation();
                        //notify
                        conversation.findOne({_id: socket.conver}, function (conver_data) {
                            for (var z = 0; z < conver_data.data.join_user.length; z++) {
                                if (conver_data.data.join_user[z] != socket.user_id) {
                                    //
                                    var string = conver_data.data.last_message;
                                    if(string.length > 20){
                                        string = string.substring(1, 20)+'...';
                                    }
                                    if(socket_data[conver_data.data.join_user[z]]){
                                        socket_data[conver_data.data.join_user[z]].emit('pushNotify', {user : socket.nickname,last_mess : string });
                                        //   Insert Read_Conversation table is
                                        var dataRead = {
                                            conversation_id : socket.conver,
                                            sender : socket.user_id,
                                            receiver : conver_data.data.join_user[z],
                                            is_read : false,
                                        };
                                        readCoversation.insert(dataRead, function () {
                                            update_conversation_dual(socket.conver);
                                        });
                                    }

                                }
                            }
                        });
                    });
                });
            });
        }

        function update_conversation_dual(conver_id) {
            // var userJoin = new User_join_conversation();
            var conversa = new Conversation();
            var readConver = new ReadConversation();
            var message = new Message();
            var user = new User_tmp();
            var list_conver = {};
            var index_ = 0;
            conversa.findOne({_id: conver_id}, function (conver_data) {
                for (var z = 0; z < conver_data.data.join_user.length; z++) {
                    if (conver_data.data.join_user[z] != socket.user_id) {
                        var id_sent_update = conver_data.data.join_user[z];
                        var cond = {
                            join_user: {'$in': [conver_data.data.join_user[z]]},
                        }
                        // common.xlog('1111', cond);
                        conversa.find(cond, function (result_conve) {
                            if (result_conve.result == Constant.OK_CODE && result_conve.data.length > 0) {
                                for (var i = 0; i < result_conve.data.length; i++) {
                                    var data_conv = result_conve.data[i];
                                    list_conver[data_conv._id] = {
                                        id_conver: data_conv._id,
                                        unread : '',
                                        name: '', //name user
                                        avartar: '',
                                        last_message: data_conv.last_message,
                                        created_time: data_conv.update_time
                                    }
                                    var user_ev = '';

                                    for (var x = 0; x < data_conv.join_user.length; x++) {
                                        if (data_conv.join_user[x] != id_sent_update) {
                                            user_ev = data_conv.join_user[x];
                                        }
                                    }
                                    var query = "SELECT _id, fullname, img_src, online_status FROM account WHERE _id="+user_ev;
                                    user_tmp.get_info_syns(query,data_conv._id, function (result) {
                                        if (result.result == 'OK' && result.data.length) {
                                            var data_user = result.data[0];
                                            list_conver[result.data_syns]['name'] = data_user.fullname;
                                            list_conver[result.data_syns]['_id'] = data_user._id;
                                            list_conver[result.data_syns]['status'] = data_user.online_status;
                                            if (common.isNotEmpty(data_user.img_src)) {
                                                list_conver[result.data_syns]['avartar'] = data_user.img_src;
                                            }
                                            else if (common.isNotEmpty(data_user.fb_img_src)) {
                                                list_conver[result.data_syns]['avartar'] = data_user.fb_img_src;
                                            }
                                            else if (common.isNotEmpty(data_user.gg_img_src)) {
                                                list_conver[result.data_syns]['avartar'] = data_user.gg_img_src;
                                            }
                                            readConver.countUnRead({conversation_id : result.data_syns,receiver: id_sent_update, is_read: false},result.data_syns, function (data) {
                                                list_conver[data.converid]['unread'] = data.data;
                                                //
                                                index_++;
                                                if (index_ == result_conve.data.length) {

                                                    var list_conver_array = [];
                                                    for (var conv in list_conver) {
                                                        list_conver_array.push(list_conver[conv]);
                                                    }
                                                    var list_conver_ = list_conver_array.sort(function (date1, date2) {
                                                        return new Date(date1).getTime() - new Date(date2).getTime()
                                                    });
                                                    // socket.emit('update_conversation',{list_conver: list_conver_, current_conver: socket.conver });
                                                    if (common.isNotEmpty(users[id_sent_update])) {
                                                        if (id_sent_update == users[id_sent_update].id) {
                                                            socket_data[id_sent_update].emit('update_conversation', {
                                                                list_conver: list_conver_,
                                                                current_conver: ''
                                                            });
                                                        }
                                                    }
                                                }

                                            })
                                        } else {
                                            list_conver[data_conv._id]['name'] = "User";
                                        }
                                    });
                                }
                            } else {
                                common.dlog('update_conversation_dual: not found conversation: ' + result_conve);
                            }
                        });
                    }
                }
            });

        }

        function readConversation(conver_id, callback){
            var readConver = new ReadConversation();
            readConver.updateConver({conversation_id : conver_id, receiver : socket.user_id},{is_read : true}, function (data) {
                callback();
            });
        }


        socket.on('switch_user', function (data) {
            var user_id = data.user_id;
            var user = new User_tmp();
            socket.leave(socket.conver);
            delete socket.conver;

            //get user info
            var query = "SELECT _id, fullname, img_src FROM account WHERE _id=" + user_id;
            user_tmp.get_info(query, function (result) {
                if(result.result == 'OK' && result.data.length){
                    var data_user = result.data[0];
                    socket.conver_user_name = data_user.fullname;
                    socket.conver_user = data_user._id;

                    var conversa = new Conversation();
                    var message = new Message();

                    var cond_conver = {
                        join_user: [parseInt(socket.user_id), parseInt(socket.conver_user)].sort(),
                        type: Constant.TYPE_MESSAGE.SINGLE
                    }
                    conversa.findOne(cond_conver, function (result_conver) {
                        if (result_conver.result == Constant.OK_CODE && common.isNotEmpty(result_conver.data)) {
                            var index = 0;
                            for (var x = 0; x < result_conver.data.join_user.length; x++) {
                                if (result_conver.data.join_user[x] != socket.user_id) {
                                    user_ev = result_conver.data.join_user[x];
                                }

                                //get avatar
                                //get user info
                                var avatar = [];
                                var query = "SELECT _id, img_src FROM account WHERE _id=" + result_conver.data.join_user[x];
                                user_tmp.get_info(query, function (result) {

                                    avatar[result.data[0]._id] = result.data[0].img_src;
                                    index++;
                                    if(index == result_conver.data.join_user.length ){
                                        socket.conver_user = user_ev;
                                        socket.conver = result_conver.data._id;
                                        socket.join(socket.conver);
                                        message.find({conversation_id: result_conver.data._id}, function (message) {
                                            update_conversation();
                                            if (message.result == Constant.OK_CODE && common.isNotEmpty(message.data)) {
                                                for (var i = 0; i < message.data.length; i++) {
                                                    message.data[i]['avatar'] = avatar[message.data[i].user_id];
                                                }
                                            }
                                            socket.emit('update_old_message', message);
                                        });
                                    }
                                });
                            }
                            //
                            // socket.join(result_conver.data._id);
                            // socket.conver = result_conver.data._id;
                            // message.find({conversation_id: result_conver.data._id}, function (message) {
                            //
                            //     socket.emit('update_old_message', message);
                            // });
                        } else {
                            socket.emit('update_old_message', {result: 'FAILED', data: 'NO_MESSAGE'});
                        }
                    });
                }
            });
        });

        socket.on('switch_conversation', function (data) {
            var id_conver = data.conversation_id;
            var conversa = new Conversation();
            var message = new Message();
            var cond_conver = {
                _id: id_conver,
            }
            socket.leave(socket.conver);
            delete socket.conver;
            readConversation(id_conver, function () {
                conversa.findOne(cond_conver, function (result_conver) {
                    if (result_conver.result == Constant.OK_CODE && common.isNotEmpty(result_conver.data)) {
                        var index = 0;
                        for (var x = 0; x < result_conver.data.join_user.length; x++) {
                            if (result_conver.data.join_user[x] != socket.user_id) {
                                user_ev = result_conver.data.join_user[x];
                            }

                            //get avatar
                            //get user info
                            var avatar = [];
                            var query = "SELECT _id, img_src FROM account WHERE _id=" + result_conver.data.join_user[x];
                            user_tmp.get_info(query, function (result) {
                                avatar[result.data[0]._id] = result.data[0].img_src;
                                index++;
                                if(index == result_conver.data.join_user.length ){
                                    socket.conver_user = user_ev;
                                    socket.conver = result_conver.data._id;
                                    socket.join(socket.conver);
                                    message.find({conversation_id: result_conver.data._id}, function (message) {
                                        update_conversation();
                                        if (message.result == Constant.OK_CODE && common.isNotEmpty(message.data)) {
                                            for (var i = 0; i < message.data.length; i++) {
                                                message.data[i]['avatar'] = avatar[message.data[i].user_id];
                                            }
                                        }
                                        socket.emit('update_old_message', message);

                                    });
                                }
                            });
                        }


                    } else {
                        socket.emit('update_old_message', {result: 'FAILED', data: 'NO_MESSAGE'});
                    }
                });
            });

        });

        // when the user disconnects.. perform this
        socket.on('disconnect', function () {
            // remove the username from global usernames list
            common.dlog(socket.id + ' Disconneted');
            // common.xlog('socket.user_id',socket.user_id);
            if (!socket.user_id) return;
            delete users[socket.user_id];

            // common.xlog('user_onlines_', user_onlines_);
            // remove user_id in user_onlines_
            user_onlines_.splice(user_onlines_.indexOf(socket.user_id), 1);
            // common.xlog('after remove user_id', user_onlines_);

            //add user_leaves_
            user_leaves_.push(socket.user_id);

            common.xlog('Disconneted user_leaves_', user_leaves_);
            // common.xlog('Disconneted user_onlines_', user_onlines_);
            socket.broadcast.emit('online_status', {user_id : socket.user_id, status : 'off'});
            user_tmp.update_status_online(socket.user_id, false, function () {
                
            });

            updateNickname();
            socket.leave(socket.conver);
        });
    });

    return router;
}