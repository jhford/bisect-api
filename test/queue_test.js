var assert = require('assert');
var should = require('should');
var redis = require('redis');
var sinon = require('sinon');
var subject = require('../queue.js');
var debug = require('debug')('queue_test');

describe("Queue tests", function () {
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

  describe("inserting into queue", function() {
    it('should insert into queue', function(done) {
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

    describe('error handling', function() {
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

  describe('pulling from queue', function() {
    it('should get a valid repo name, commit and time', function(done) {
      subject.insert(expected.repo_name, expected.commit, function(err) {
        if (err) return done(err);
        subject.pull(function(err, repo_name, commit, time) {
          should.not.exist(err);
          expected.should.eql({repo_name: repo_name, commit: commit, time: time});
          time.should.be.a.Number;
          time.should.be.above(100000);
          done(err);
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
        //should.not.exist(err);
        subject.view(function(err, values) {
          should.exist(values);
          values.length.should.equal(1);
          done(err)
        });

      });
    });

  });
});
