var Agent         = require('./agent')
  , util          = require('util')
  , _             = require('underscore')
  // , EventEmitter  = require('events').EventEmitter
  , upnode        = require('upnode')
  , dnode_stream  = require('dnode-http-stream')
  , man           = require('taskmill-core-man')
  ;

function AgentRegistry(options) {
  this.options = options;
}

// util.inherits(AgentRegistry, EventEmitter);

AgentRegistry.prototype.list = {};

AgentRegistry.prototype.initialize = function(cb) {
  var me = this;

  var io = require('socket.io')(this.options.port);

  io.on('connection', function(socket){
    var agent = new Agent(socket, {
        createLogStream : me.options.createLogStream
      , web_socket      : me.options.web_socket
    });

    me.register(agent);

    socket.on('ping', function(info){
      agent.info      = info;
      agent.group     = info.group
      agent.name      = info.name;
    });

    socket.on('disconnect', function(){
      me.unregister(agent);
    });
  });

  cb();
};

AgentRegistry.prototype.find = function(id) {
  if (_.isObject(id)) {
    id = id.id;
  }

  return this.list[id];
};

AgentRegistry.prototype.register = function(agent) {
  this.list[agent.id] = agent;
};

AgentRegistry.prototype.unregister = function(agent) {
  if (_.isObject(agent)) {
    delete this.list[agent.id];
  }
};

AgentRegistry.prototype.handle = function(req, res, next) {
  var group  = this.options.default_group_id
    // , manual    = man.get(req.task.content)
    , manual = {}
    ;

  if (manual.group) {
    group = manual.group;
  }

  // todo [akamel] cache group_id
  var workers = _.where(this.list, { group : group })
    , agent   = _.sample(workers);
    ;

  if (agent) {
    agent.handle(req, res, next);
  } else {
    next(new Error('no agents available'));
  }
};

var singleton = undefined;

function listen(options, cb) {
  if (!singleton) {
    singleton = new AgentRegistry(options);

    singleton.initialize(cb);

    return singleton;
  } else {
    _.defer(cb, new Error('registry already initialized'));
  }
}

module.exports = {
    listen  : listen
  , get     : function() { return singleton; }
};