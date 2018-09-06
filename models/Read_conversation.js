var mongoose = require('mongoose');
// var Schema = mongoose.Schema;
var Schema = mongoose.Schema;

var Conversation = require('./Conversation.js');
var Sticker = require('./Sticker.js');

var ReadConversationSchema = new Schema({
    conversation_id : {
        type : Schema.Types.ObjectId,
        ref : 'Conversation'},
    sender : Number,
    receiver : Number,
    is_read : {type : Boolean, default: false},
    read_time : Date,
    created : {type: Date, default : Date.now}
},{collection: 'ReadConversation'});

var ReadConversation = mongoose.model('Read_conversation',ReadConversationSchema);

ReadConversation.prototype.find = function(cond, callback){
    ReadConversation.find(cond).exec(function (err, data) {
        if (err) {
            var resp = {
                result: "FAILED",
                message: "SERVER_ERR"
            }
            callback(resp);
        } else {
            var resp = {
                result: "OK",
                data: data
            }
            callback(resp);
        }
    });
}

ReadConversation.prototype.countUnRead = function(cond,converID, callback){
    ReadConversation.count(cond).exec(function (err, data) {
        if (err) {
            var resp = {
                result: "FAILED",
                message: "SERVER_ERR",
                converid : converID
            }
            callback(resp);
        } else {
            var resp = {
                result: "OK",
                data: data,
                converid : converID
            }
            callback(resp);
        }
    });
}


ReadConversation.prototype.updateConver = function(cond,setData, callback){
    ReadConversation.update(cond, setData, {multi: true}).exec(function (err, data) {
        if (err) {
            var resp = {
                result: "FAILED",
                message: "SERVER_ERR",
            }
            callback(resp);
        } else {
            var resp = {
                result: "OK",
                data: data,
            }
            callback(resp);
        }
    });
}

ReadConversation.prototype.findOne = function(cond, callback){
    ReadConversation.findOne(cond).sort({created : -1}).exec(function (err, data) {
        if (err) {
            var resp = {
                result: "FAILED",
                message: "SERVER_ERR"
            }
            callback(resp);
        } else {
            var resp = {
                result: "OK",
                data: data
            }
            callback(resp);
        }
    });
}



ReadConversation.prototype.getLastMessage = function(cond,user_id, callback){
    ReadConversation.findOne(cond).sort({created : -1}).exec(function (err, data) {
        if (err) {
            var resp = {
                result: "FAILED",
                message: "SERVER_ERR"
            }
            callback(resp);
        } else {
            var resp = {
                result: "OK",
                data: data,
                user_id : user_id
            }
            callback(resp);
        }
    });
}



ReadConversation.prototype.insert = function (data, resp_func) {
    var readCoversation = new ReadConversation(data);
    readCoversation.save(function (err, data) {
        if (err) {
            var resp = {
                result: "FAILED",
                message: "SERVER_ERR"
            }
            resp_func(resp);
        } else {
            var resp = {
                result: "OK",
                data: data
            }
            resp_func(resp);
        }
    });
}
//make this available to our users in our Node applications
module.exports = ReadConversation;