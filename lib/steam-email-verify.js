/*
 * 
 * http://eknowles.com
 *
 * Copyright (c) 2014 Edward Knowles
 * Licensed under the MIT license.
 */

'use strict';

var MailListener = require("mail-listener2");
var dialog = require('dialog');
var cheerio = require('cheerio');
var request = require('request');

require('util').inherits(SteamEmailVerify, require('events').EventEmitter);

function SteamEmailVerify(config) {
  require('events').EventEmitter.call(this);
  var self = this;
  self.mailListener = new MailListener(config);

  self.mailListener.start(); // start listening

  // stop listening
  //mailListener.stop();

  self.mailListener.on("server:connected", function(){
    console.log("imapConnected");
  });

  self.mailListener.on("server:disconnected", function(){
    console.log("imapDisconnected");
  });

  self.mailListener.on("error", function(err){
    console.log(err);
  });

  self.mailListener.on("mail", function(mail, seqno, attributes){
    // do something with mail object including attachments
    var subject = mail.headers.subject;
    var from = mail.from[0]['address'];
    var tostring = mail.headers.to;
    var emailto = tostring.split("@");
    // mail processing code goes here
    if (subject === 'Your Steam account: Email address verification' && from === 'noreply@steampowered.com') {
      var $ = cheerio.load(mail.html);
      var validateUrl = $("a[href^='http://steamcommunity.com/actions/validateemail?stoken']").attr('href');
      self.validateEmailAddress(validateUrl, emailto[0]);
    }
  });

  self.mailListener.on("attachment", function(attachment){
    console.log(attachment.path);
  });
}

SteamEmailVerify.prototype.validateEmailAddress = function(url, user) {
  var self = this;

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("Username " + user + " verified by email.");
    }
  });

};

SteamEmailVerify.prototype.openDialog = function(title, message) {
  var self = this;
  dialog.info(message, title, function(err) {
    if (!err) {}
  });
};

module.exports = SteamEmailVerify;