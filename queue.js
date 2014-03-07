var redis = require('redis');
var debug = require('debug')('queue');
var fs = require('fs');

var INCOMING_QUEUE_NAME = 'bisect:incoming';
var INCOMING_QUEUE_CHANNEL = 'bisect:new_incoming';

// 
function insert(repo_name, commit, callback){
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (err) { 
      return callback(err);
    }
  });
  var to_store = {
    'repo_name': repo_name,
    'commit': commit,
    'time': Math.round(Date.now() / 1000)
  }
  client.multi()
    .lpush(INCOMING_QUEUE_NAME, JSON.stringify(to_store))
    .publish(INCOMING_QUEUE_CHANNEL, "incoming_change")
    .exec(function(err) {
      client.end();
      if (err) {
        return callback(err);
      } else {
        return callback(null);
      }
    });
  
  
}

function pull(callback){
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (err) {
      return callback(err);
    }
  });
  client.rpop(INCOMING_QUEUE_NAME, function(err, reply){
    var data;
    if (err) {
      return callback(err);
    }

    try {
      data = JSON.parse(reply);
    } catch(e) {
      return callback(new Error("invalid json from queue"));
    }

    if (data && data.repo_name && data.commit && data.time) {
      return callback(null, data.repo_name, data.commit, data.time);
    } else {
      return callback(new Error("Missing repo_name, commit or time"));
    }
  });
}

function view(callback) {
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (err) {
      return callback(err);
    }
  });  
  client.lrange(INCOMING_QUEUE_NAME, 0, -1, function(err, replies) {
    if (err) return callback(err);
    var values = [];
    replies.forEach(function(val, idx, arr) {
      values.push(JSON.parse(val));
    });
    callback(null, values);
  });
}

module.exports = {
  insert: insert,
  pull: pull,
  view: view,
  INCOMING_QUEUE_NAME: INCOMING_QUEUE_NAME,
  INCOMING_QUEUE_CHANNEL: INCOMING_QUEUE_CHANNEL
}
