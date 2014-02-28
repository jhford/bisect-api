var redis = require('redis');
var debug = require('debug')('insert');

var INCOMING_QUEUE_NAME = 'bisect::incoming';
var INCOMING_QUEUE_CHANNEL = 'bisect::new_incoming';

function queue(repo_name, commit, callback){
  var client = redis.createClient();
  client.on("error", function(err) {
    debug("ERROR: " + err);
    if (callback) return callback(err);
  })
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
        error = new Error('Error inserting into queue: ' + err);
        return callback(error);
      }
      debug("Inserted " + commit + " into queue");
      client.end()
      if (callback) return callback(null);
    })
  
}

module.exports = {
  queue: queue,
  INCOMING_QUEUE_NAME: INCOMING_QUEUE_NAME,
  INCOMING_QUEUE_CHANNEL: INCOMING_QUEUE_CHANNEL
}
