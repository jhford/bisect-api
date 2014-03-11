var express = require('express');
var q = require('./queue');
var app = express();

function head(name) {
  return "<!DOCTYPE html><html><head><title>" + name + "</title>" +
         "</head>\n<body>\n<h1>" + name + "</h1>\n";
}

function foot() {
  return "</body></html>";
}

function error(msg) {
  return JSON.stringify({'error': msg});
}

function success(msg) {
  return JSON.stringify({'outcome': msg});
}

function github_v3(req, res) {
  var commit;
  var repo_owner;
  var repo_name;

  if (req.body.after){
    commit = req.body.after;
  }
  if (req.body.repository && req.body.repository.owner && req.body.repository.owner.name) {
    repo_owner = req.body.repository.owner.name;
  }
  if (req.body.repository && req.body.repository.name) {
    repo_name = req.body.repository.name;
  }

  if (commit && repo_name && repo_owner) {
    q.insert('github:' + repo_owner + ':' + repo_name, commit, function(err) {
      if (err) res.send(500, error(err));
      else res.send(200, success("inserted"));
    });
  } else {
    res.send(500, error('Invalid submission!'));
  }
}

app.use(express.json());
app.use(express.urlencoded());

app.get('/unprocessed', function(req, res) {
  var unprocessed = q.view(function(err, values){
    doc = head('Unprocessed');
    // Woo, lazy!
    doc += '<table border="1">\n';
    doc += '<thead><tr><th>Repository</th><th>Commit</th><th>Time</th></tr></thead>\n';
    doc += '<tfoot><tr><td colspan="2">Count:</td><td>' + values.length;
    doc += '</td></tr></tfoot>\n';
    values.forEach(function(val, idx, arr) {
      doc += '<tr><td>' + val.repo_name + '</td><td>' + val.commit;
      doc += '</td><td>' + val.time + '</td></tr>\n';
    });
    doc += '</table>\n' + foot();
    res.send(doc);
  });

});

app.get('/processed', function(req, res) {
});

function add_and_respond(res, repo_name, commit) {
  q.insert(repo_name, commit, function(err) {
    if (err) {
      res.send(500, error(err));
    } else {
      res.send(200, success(repo_name + "@" + commit + " inserted into queue"));
    }
  });
}

app.get('/insert-get', function(req, res){
  var query = req.query;
  if (query.repo_name && query.commit) {
    add_and_respond(res, query.repo_name, query.commit);
  } else {
    res.send(500, 'Invalid submission!');
  }
});

app.post('/insert-post', function(req, res) {
  if (req.body.repo_name && req.body.commit) {
    add_and_respond(res, req.body.repo_name, req.body.commit);
  } else {
    res.send(500, 'Invalid submission!');
  }
});

app.post('/github/v3', function(req, res) {
  console.log(req.body);
  github_v3(req, res);
});

app.listen(7040);


