var assert = require('assert');
var should = require('should');
var redis = require('redis');
var sinon = require('sinon');
var subject = require('../redis-queue.js');
var debug = require('debug')('redis-queue-test');

describe("queue", function () {
  var client,
      sandbox,
      expected;

  beforeEach(function(done){
    client = redis.createClient();
    client.flushall(function(err){
      done(err);
    });
    sandbox = sinon.sandbox.create();
    expected = {
      repo_name: 'insert_repo',
      commit: 'abcd123',
      time: 1393536842
    }
    sandbox.stub(Date, 'now').returns(expected.time * 1000);    
  });

  afterEach(function() {
    client.end();
    sandbox.restore();
  });

  describe('inserting', function() {
    it('should work', function(done) {
      subject.insert(expected.repo_name, expected.commit, function(err) {
        client.rpop(subject.INCOMING_QUEUE_NAME, function(err, reply) {
          should.exist(reply);
          should.not.exist(err);
          expected.should.eql(JSON.parse(reply));
          done(err);
        });
      });
    });

    it('should publish a message', function(done) {
      client.subscribe(subject.INCOMING_QUEUE_CHANNEL);
      
      client.on('message', function(channel, msg){
        should.exist(msg);
        should.exist(channel);
        channel.should.equal(subject.INCOMING_QUEUE_CHANNEL);
        msg.should.equal('incoming_change');
        client.unsubscribe();
        done();
      });

      subject.insert('repo', 'abcd123', function(err){
        should.not.exist(err); 
      })

    });

    describe('on error', function() {
      it('should fail if the redis operation transaction fails', function(done) {
        var exec = sandbox.stub(redis.Multi.prototype, 'exec');
        exec.callsArgWithAsync(0, new Error());
        subject.insert('repo', 'abc123', function(err) {
          should.exist(err);
          done();
        });
      });
    });
  });

  describe('pulling', function() {
    beforeEach(function(done) {
      subject.insert(expected.repo_name, expected.commit, function(err) {
        done(err)
      });
    });

    it('should get a valid repo name, commit and time', function(done) {
      subject.pull(function(err, repo_name, commit, time) {
        should.not.exist(err);
        expected.should.eql({repo_name: repo_name, commit: commit, time: time});
        time.should.be.a.Number;
        time.should.be.above(100000);
        done(err);
      });
    });

    describe('on error', function() {
      it('should fail if the redis operation fails', function(done) {
        var rpop = sandbox.stub(redis.RedisClient.prototype, 'rpop');
        rpop.callsArgWithAsync(1, new Error());
        subject.pull(function(err) {
          should.exist(err);
          done();
        });
      });

      it('should fail if the redis operation returns non-JSON', function(done) {
        var rpop = sandbox.stub(redis.RedisClient.prototype, 'rpop');
        rpop.callsArgWithAsync(1, 'NOTJSON');
        subject.pull(function(err){
          should.exist(err);
          done();
        });
      });
    });
  });

  describe('pulling all', function() {
    beforeEach(function(done) {
      subject.insert(expected.repo_name, expected.commit, function(err) {
        subject.insert(expected.repo_name, expected.commit, function(err) {
          subject.insert(expected.repo_name, expected.commit, function(err) {
            done(err)
          });
        });
      });
    });

    it('should get all items in the queue', function(done) {
      subject.pull_all(function(err, list) {
        list.should.eql([expected, expected, expected]);
        done(err);
      });
    });

    describe('on error', function() {
      it('should fail if the redis operation fails', function(done) {
        var exec = sandbox.stub(redis.Multi.prototype, 'exec');
        exec.callsArgWithAsync(1, new Error());
        subject.pull(function(err) {
          should.exist(err);
          done();
        });
      });
    });
  });



  describe('view', function() {
    beforeEach(function(done) {
      subject.insert(expected.repo_name, expected.commit, function(err) {
        done(err);
      });
    });

    it('should work', function(done) {
      subject.view(function(err, values) {
        should.not.exist(err);
        should.exist(values);
        values.length.should.equal(1);
        values[0].should.eql(expected);
        done(err)
      });
    });
  });

  describe('count', function() {
    it('should be zero with no elements', function(done) {
      subject.count(function (err, count) {
        count.should.equal(0);
        done(err);
      });
    });

    it('should be one with one element', function(done) {
      subject.insert('test', 'abcd123', function(err) {
        if (err) return done(err);
        subject.count(function(err, count) {
          count.should.equal(1);
          done(err);
        });
      });
    });
  });
});
