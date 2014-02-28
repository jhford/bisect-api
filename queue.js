var redis = require('redis');
var debug = require('debug')('queue');

var INCOMING_QUEUE_NAME = 'bisect::incoming';
var INCOMING_QUEUE_CHANNEL = 'bisect::new_incoming';

function insert(repo_name, commit, callback){
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (callback) { 
      debug('redis client error');
      return callback(new Error('Redis error: ' + err));
    }
  });
  var to_store = {
    'repo_name': repo_name,
    'commit': commit,
    'time': Math.round(Date.now() / 1000)
  }
  client.multi()
    .hmset(commit, to_store)
    .lpush(INCOMING_QUEUE_NAME, commit)
    .publish(INCOMING_QUEUE_CHANNEL, 'published commit')
    .exec(function (err, replies){
      if (err) {
        error = new Error('Redis error: ' + err);
        return callback(err);
      }
      debug("Inserted " + commit + " into queue");
      client.end()
      if (callback) return callback(null);
    })
  
}

function pull(callback){
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (callback) {
      debug('redis client error');
      return callback(new Error('Redis error: ' + err));
    }
  });
  client.rpop(INCOMING_QUEUE_NAME, function(err, commit) {
    if (err) {
      debug('error trying to pop from incoming queue');
      return callback(new Error('Redis error: ' + err));
    }
    client.hgetall(commit, function(err, obj) {
      debug('retreived ' + obj.repo_name + ' ' + obj.time);
      client.del(commit, function(err, reply) {
        client.end();
        if (err) {
          debug('WARNING: failed to delete hash for ' + commit);
        }
        return callback(null, obj.repo_name, commit, parseInt(obj.time, 10)); 
      });
    });
  });
}

module.exports = {
  insert: insert,
  pull: pull,
  INCOMING_QUEUE_NAME: INCOMING_QUEUE_NAME,
  INCOMING_QUEUE_CHANNEL: INCOMING_QUEUE_CHANNEL
}
