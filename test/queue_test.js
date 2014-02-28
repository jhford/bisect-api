var should = require('should');
var redis = require('redis');
var sinon = require('sinon');
var subject = require('../queue.js');
var debug = require('debug')('insert_test');

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
      msg.should.equal('published commit');
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

    it('should fail if the insert transaction fails', function(done){
      var multi_stub = sandbox.stub(redis.Multi.prototype, 'exec');
      // The multi exec failure
      multi_stub.callsArgWithAsync(0, new Error());
      subject.insert('repo', 'abcd123', function(err){
        should.exist(err);
        done();
      });
    });
  });
});

describe('pulling from queue', function() {
  

});
