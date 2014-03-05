var should = require('should');
var redis = require('redis');
var sinon = require('sinon');
var subject = require('../queue.js');
var debug = require('debug')('queue_test');

describe("inserting into queue", function() {
  var client;

  beforeEach(function(done){
    client = redis.createClient();
    client.flushall(function(err){
      done(err);
    });
  });

  afterEach(function() {
    client.end();
  });

  it('should insert commit into queue', function(done) {
    subject.insert('repo', 'abcd123', function(err) {
      client.rpop(subject.INCOMING_QUEUE_NAME, function(err, reply) {
        should.exist(reply);
        should.not.exist(err);
        reply.should.equal('abcd123');
        done(err);
      });
    });
  });

  it('should insert repository name into a hash', function(done) {
    subject.insert('repo', 'abcd123', function(err) {
      client.hget('abcd123', 'repo_name', function(err, reply) {
        should.exist(reply);
        should.not.exist(err);
        reply.should.equal('repo');
        done(err);
      });
    });
  });

  it('should insert the right time', function(done) {
    var old_date_now = Date.now
    Date.now = function(){
      // This needs to be 1000 * expected because JS does MS
      // and we want seconds to emulate unicode
      return 1393536842234;
    }
    subject.insert('repo', 'abcd123', function(err) {
      client.hget('abcd123', 'time', function(err, reply) {
        should.exist(reply);
        should.not.exist(err);
        reply.should.equal('1393536842');
        done(err);
      });
    });
    Date.now = old_date_now
  });

  it('should publish a message', function(done) {
    client.subscribe(subject.INCOMING_QUEUE_CHANNEL);
    
    client.on('message', function(channel, msg){
      should.exist(msg);
      should.exist(channel);
      channel.should.equal(subject.INCOMING_QUEUE_CHANNEL);
      msg.should.equal('inserted_to_incoming');
      client.unsubscribe();
      done();
    });

    subject.insert('repo', 'abcd123', function(err){
      should.not.exist(err); 
    })

  });

  // Let's test some error handling!
  describe('error handling', function() {
    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should not insert a commit that is already queued', function(done) {
      client.hmset('abc123', 'key', 'value', function(err) {
        should.not.exist(err);
        subject.insert('repo', 'abc123', function(insert_err) {
          should.exist(insert_err);
          done();
        });
      });
      

    });
  });
});

describe('pulling from queue', function() {
  var client;

  beforeEach(function(done){
    client = redis.createClient();
    client.flushall(function(err){
      done(err);
    });
  });

  afterEach(function() {
    client.end();
  });

  it('should get a valid repo name and commit', function(done) {
    var expected_repo = 'repositoryA',
        expected_commit = 'commit123';
    
    subject.insert(expected_repo, expected_commit, function(err) {
      subject.pull(function(err, repo_name, commit, date) {
        should.not.exist(err);
        repo_name.should.equal(expected_repo);
        commit.should.equal(expected_commit);
        date.should.be.a.Number;
        date.should.be.above(100000);
        done(err);
      });
    });
  });

  describe('there is an error', function() {
    var sandbox, 
        expected;

    beforeEach(function(done) {
      sandbox = sinon.sandbox.create(); 
      expected = {
        repo_name: 'repo_name',
        commit: 'commit', 
        time: 2500000
      }
      sandbox.stub(Date, 'now').returns(expected.time * 1000);
      subject.insert(expected.repo_name, expected.commit, function(err) {
        done(err); 
      });
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should fail if the pop fails', function(done) {
      done();
    });

    it('should fail if the hash is missing', function(done) {
      client.del(expected.commit, function(err) {
        subject.pull(function(err) {
          should.exist(err);
          done();
        });
      });
    });
  });
});

describe('viewing queue', function() {
  var client;

  beforeEach(function(done) {
    client = redis.createClient();
    client.flushall(function(err) {
      done(err);
    });
  });

  afterEach(function() {
    client.end();
  });

  it('should work', function(done) {
    subject.insert('repo', 'abc123', function(err) {
      should.not.exist(err);
      subject.view(function(err, values) {
        should.exist(values);
        values.length.should.equal(1);
        done(err)
      });

    });
  });

});

// TODO: Write some unit tests of the lua script!
