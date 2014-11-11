/*
 * 
 * http://eknowles.com
 *
 * Copyright (c) 2014 Edward Knowles
 * Licensed under the MIT license.
 */

'use strict';

var dialog = require('dialog');
var Imap = require('imap'),
  inspect = require('util').inspect;

module.exports = SteamEmailVerify;

require('util').inherits(SteamEmailVerify, require('events').EventEmitter);

function SteamEmailVerify() {
  require('events').EventEmitter.call(this);
}

SteamEmailVerify.prototype.setup = function(config, callback){
  var self = this;

  this.openDialog('Hello', 'World');
  callback();

};

SteamEmailVerify.prototype.openDialog = function(title, message, callback) {
  var self = this;
  dialog.info('Message', 'Title', function(err){
    if (!err) console.log('User clicked OK');
    callback();
  });
};