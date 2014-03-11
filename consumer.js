var queue = require('./queue');
var sqlite3 = require('sqlite3').verbose();
var redis = require('redis');
var debug = require('debug')('consumer');
var client = redis.createClient();
var db = new sqlite3.Database(__dirname + '/commits.sqlite');

function db_create() {
  db.run('CREATE TABLE IF NOT EXISTS commits ("repo_name" TEXT, "commit" TEXT, "time" INT)');
}

function err_back(err) {
  db.close();
  console.err("FATAL ERROR: " + err);
  process.exit(1);
}

db_create();

client.subscribe(queue.INCOMING_QUEUE_CHANNEL);
client.on('error', err_back);
db.on('error', err_back);

client.on('message', function(channel, msg) {
  if (channel !== queue.INCOMING_QUEUE_CHANNEL) {
    return; 
  }
  debug('Received a new commit');
  queue.pull(function(err, repo_name, commit, time) {
    if (err) return err_back(err);
    var stmt = db.prepare('INSERT INTO commits VALUES (?,?,?)');
    stmt.run(repo_name, commit, time);
    stmt.finalize();
  });
});
