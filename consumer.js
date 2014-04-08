var queue = require('./queue');
var sqlite3 = require('sqlite3').verbose();
var debug = require('debug')('consumer');
var db = new sqlite3.Database(__dirname + '/commits.sqlite');
var idle_interval;

function db_create() {
  db.run('CREATE TABLE IF NOT EXISTS commits ("repo_name" TEXT, "commit" TEXT, "time" INT)');
}

function err_back(err) {
  db.close();
  console.log("FATAL ERROR: " + err);
  process.exit(1);
}

db_create();

db.on('error', err_back);

function claim_commit() {
  queue.pull_all(function(err, commits) {
    if (err) return err_back(err);
    var stmt = db.prepare('INSERT INTO commits VALUES (?,?,?)');
    commits.forEach(function(val) {
      stmt.run(val.repo_name, val.commit, val.time);
    });
    stmt.finalize();
  });
}

claim_commit();
idle_interval = setInterval(function() {
  queue.count(function(err, count) {
    debug('Queue has ' + count + ' items');
    for (var i = 0 ; i < count ; i++) {
      claim_commit(); 
    }
  });
}, 10 * 1000);
