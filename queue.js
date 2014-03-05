var redis = require('redis');
var debug = require('debug')('queue');
var fs = require('fs');
var pull_script = require('./pull_script');
var insert_script = require('./insert_script');

var INCOMING_QUEUE_NAME = 'bisect:incoming';
var INCOMING_QUEUE_CHANNEL = 'bisect:new_incoming';

// 
function insert(repo_name, commit, callback){
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (callback) { 
      return callback(err);
    }
  });
  var to_store = {
    'repo_name': repo_name,
    'commit': commit,
    'time': Math.round(Date.now() / 1000)
  }
  client.eval(
      insert_script,
      1,
      INCOMING_QUEUE_NAME,
      INCOMING_QUEUE_CHANNEL,
      commit,
      repo_name,
      Math.round(Date.now() / 1000),
      function (err, reply) {
        if (err)
          return callback(err);
        if (reply !== 'OK') 
          return callback(new Error('Other insert script error'));
        return callback();
      });
  
}

function pull(callback){
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (callback) {
      return callback(err);
    }
  });
  client.eval(pull_script, 1, INCOMING_QUEUE_NAME, function(err, reply){
    if (err)
      return callback(err);
    values = JSON.parse(reply);
    return callback(null, values.repo_name, values.commit, parseInt(values.time, 10));
  });
}

function view(callback) {
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (callback) {
      return callback(err);
    }
  });  
  client.lrange(INCOMING_QUEUE_NAME, 0, -1, function(err, replies) {
    if (err) return callback(err);
    callback(null, replies);
  });
}

module.exports = {
  insert: insert,
  pull: pull,
  view: view,
  INCOMING_QUEUE_NAME: INCOMING_QUEUE_NAME,
  INCOMING_QUEUE_CHANNEL: INCOMING_QUEUE_CHANNEL
}
