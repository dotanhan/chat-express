var mongoose = require('mongoose');
// var Schema = mongoose.Schema;
var Schema = mongoose.Schema;

var ConversationSchema = new Schema({
    title : String,
    channel : String,
    is_active : {type : Boolean, default: true},
    is_delete : {type : Boolean, default: false},
    type : String,
    user_id : Number,
    created : {type: Date, default : Date.now},
    join_user : [Number],
    last_message : String,
    update_time : Date,
},{collection: 'Conversation'});

var Conversation = mongoose.model('Conversation',ConversationSchema);

Conversation.prototype.insert = function (data, resp_func) {
    var conversation = new Conversation(data);
    conversation.save(function (err, data) {
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

Conversation.prototype.find = function(cond, callback){
    Conversation.find(cond).sort({created : -1}).exec(function (err, data) {
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

Conversation.prototype.findOne = function(cond, callback){
    Conversation.findOne(cond).exec(function (err, data) {
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

Conversation.prototype.update = function (cond,data, callback) {
    Conversation.update(cond, data, function (err, data) {
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

//make this available to our users in our Node applications
module.exports = Conversation;