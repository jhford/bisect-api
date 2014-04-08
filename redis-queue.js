var redis = require('redis');
var debug = require('debug')('redis-queue');
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

function pull_all(callback){
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (err) {
      return callback(err);
    }
  });
  client.multi()
    .lrange(INCOMING_QUEUE_NAME, 0, - 1)
    .ltrim(INCOMING_QUEUE_NAME, 1, 0)
    .exec(function(err, replies){
      var data = new Array();
      if (err) {
        return callback(err);
      }

      debug('pull all reply: ' + JSON.stringify(replies));
      replies[0].forEach(function(val) { 
        debug('interating');
        try {
          data.push(JSON.parse(val));
          debug('Inserting into array');
        } catch(e) {
          return callback(new Error("invalid json from queue"));
        }
      });

      return callback(null, data);
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

function count(callback) {
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (err) {
      return callback(err);
    }
  });
  client.llen(INCOMING_QUEUE_NAME, function(err, reply) {
    if (err) return callback(err);
    return callback(null, reply);
  });
}

module.exports = {
  insert: insert,
  pull: pull,
  pull_all: pull_all,
  view: view,
  count: count,
  INCOMING_QUEUE_NAME: INCOMING_QUEUE_NAME,
  INCOMING_QUEUE_CHANNEL: INCOMING_QUEUE_CHANNEL
}
