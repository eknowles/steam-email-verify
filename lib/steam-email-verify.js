/*
 * 
 * http://eknowles.com
 *
 * Copyright (c) 2014 Edward Knowles
 * Licensed under the MIT license.
 */

'use strict';

// WARNING: ALL OF THIS CODE IS DISGUSTING. BUT IT WORKS.

var MailListener = require("mail-listener2");
var dialog = require('dialog');
var cheerio = require('cheerio');
var request = require('request');
var md5 = require('MD5');
var BigInteger = require('jsbn');
var fs = require('fs');
var Steam = require('steam');
var low = require('lowdb');

require('util').inherits(SteamEmailVerify, require('events').EventEmitter);

if (fs.existsSync('servers')) { Steam.servers = JSON.parse(fs.readFileSync('servers')); }

function SteamEmailVerify(config) {

  require('events').EventEmitter.call(this);
  var self = this;

  self.config = config;
  self.db = low(config.lowDB);

  // Steam Web Stuff
  self.steamRSA = {};
  self.emailauth = '';
  self.emailsteamid = '';
  self.username = '';
  self.password = '';

  self.mailListener = new MailListener(config);

  self.mailListener.start(); // start listening

  // stop listening
  //mailListener.stop();

  self.mailListener.on("server:connected", function() {
    console.log("imapConnected");
  });

  self.mailListener.on("server:disconnected", function() {
    console.log("imapDisconnected");
  });

  self.mailListener.on("error", function(err) {
    console.log(err);
  });

  self.mailListener.on("mail", function(mail, seqno, attributes) {
    // do something with mail object including attachments
    var subject = mail.headers.subject;
    var from = mail.from[0]['address'];
    var toString = mail.headers.to;
    var emailTo = toString.split("@");
    var username = emailTo[0];
    // mail processing code goes here
    if (from === 'noreply@steampowered.com') {
      var $ = cheerio.load(mail.html);

      if (subject === 'Your Steam account: Email address verification') {
        console.log('EMAIL: Email address verification ' + username);
        var validateUrl = $("a[href^='http://steamcommunity.com/actions/validateemail?stoken']").attr('href');
        self.validateEmailAddress(validateUrl, username, function(err, usr, pwd) {
          self.username = usr;
          self.password = pwd
        });
      }
      else if (subject === 'Your Steam account: Access from new computer') {
        var guardCode = $("h2").text();
        console.log('EMAIL: Access from new computer ' + guardCode, username);
        self.db('bots').find({username: username}).assign({authCode: guardCode});
        self.usernameToPassword(username, function(pw) {
          self.steamLogin({
            accountName: username,
            password: self.password,
            authCode: guardCode
          }, function(err) {
            if (err) {
              console.log(err);
              if (err.eresult == 63) {
                console.log('Waiting for Steam Auth Code...');
              }
            }
          });
        });
      }
      else if (subject === 'Your Steam account: Access from new device') {
        var guardCode = $("h2").text();
        console.log('EMAIL: Access from new device ' + guardCode, username);
        self.emailauth = guardCode;
        if (self.emailsteamid !== '') {
          self.getrsakey(function(err, steamRSA) {
            if (err) { console.log(err); }
            self.OnRSAKeyResponse(function(err, response) {
              if (err) { console.log(err); }
            });
          });
        }
      }

    }
  });

  self.mailListener.on("attachment", function(attachment) {
    console.log(attachment.path);
  });

  self.createNewSteamAccount()
//  self.getrsakey(function(err, steamRSA) {
//    if (err) { console.log(err); }
//    self.OnRSAKeyResponse(function(err, response) {
//    });
//  });

}
SteamEmailVerify.prototype.resetCreds = function(callback) {
  var self = this;
  self.steamRSA = {};
  self.emailauth = '';
  self.emailsteamid = '';
  self.username = '';
  self.password = '';
  callback();
};

SteamEmailVerify.prototype.createNewSteamAccount = function(options, callback) {
  var child = require('child_process').exec("D:\\Steam\\Steam.exe");
  child.stdout.pipe(process.stdout);
  child.on('exit', function() {
    callback();
  })
};

SteamEmailVerify.prototype.steamLogin = function(options, callback) {
  console.log('Something');
  var bot = new Steam.SteamClient();
  var sentryFile = options.accountName + '.sentry';

  if (fs.existsSync(sentryFile)) {
    options.shaSentryfile = fs.readFileSync(sentryFile);
  }

  console.log(options);
  bot.logOn(options);

  bot.on('servers', function(servers) { fs.writeFile('servers', JSON.stringify(servers)); });
  bot.on('debug', console.log);
  bot.on('sentry', function(sentryHash) {
    console.log('SENTRY');
    fs.writeFile(options.accountName + '.sentry', sentryHash, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log('Saved sentry file hash as "sentryfile"');
      }
    });
  });

  bot.on('error', function(error) {

    console.log(error);

    // AccountLogonDenied
    if (error.eresult == 63) {
      // do something
    }
    // InvalidLoginAuthCode
    if (error.eresult == 65) {
      // do something
    }

    callback(error);

  });

  bot.on('loggedOn', function() {
    console.log('loggedOn');
    callback();
  });

  bot.on('webSessionID', function(sessionId) {
    console.log("Got webSessionID " + sessionId);
    var webSessionId = sessionId;
    bot.webLogOn(function(newCookies) {
      console.log("webLogOn returned " + newCookies);
      var cookies = newCookies;
      console.log("cookies/session set up");
    });
  });

};

SteamEmailVerify.prototype.validateEmailAddress = function(url, user, callback) {
  var self = this;

  request(url, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      console.log("Username " + user + " verified by email.");
      var pw = self.usernameToPassword(user, function(password) {
        self.db('bots').push({
          username: user,
          password: password,
          created: Date.now()
        });
        self.db.save(function() {
          callback(null, user, password);
        });
      });

    } else {
      callback(error);
    }
  });

};

SteamEmailVerify.prototype.openDialog = function(title, message) {
  var self = this;
  dialog.info(message, title, function(err) {
    if (!err) {}
  });
};

SteamEmailVerify.prototype.usernameToPassword = function(username, callback) {
  var self = this;
  var hash = md5(username);
  var test_password_prefix = hash.substr(0, hash.length - 24);
  return callback(test_password_prefix + self.config.steamPasswordSecret);
};

SteamEmailVerify.prototype.OnRSAKeyResponse = function(callback) {
  var self = this;

  if (self.steamRSA.publickey_mod && self.steamRSA.publickey_exp && self.steamRSA.timestamp) {
    var pubKey = RSA.getPublicKey(self.steamRSA.publickey_mod, self.steamRSA.publickey_exp);
    var encryptedPassword = RSA.encrypt(self.password, pubKey);

    var form = {
      password: encryptedPassword,
      username: self.username,
      twofactorcode: '',
      emailauth: self.emailauth,
      loginfriendlyname: '',
      captchagid: -1,
      captcha_text: '',
      emailsteamid: self.emailsteamid,
      rsatimestamp: self.steamRSA.timestamp,
      remember_login: 'false',
      donotcache: ( new Date().getTime() )
    };

    console.log('+---------------------------------------------------------+');
    console.log('+ Signing into Steam...');
    console.log('+');
    if (self.username !== '') {
      console.log('+ Account Name: ' + self.username);
    }
    if (self.password !== '') {
      console.log('+ Password: ' + self.password);
    }
    if (self.emailsteamid !== '') {
      console.log('+ Steam ID: ' + self.emailsteamid);
    }
    if (self.emailauth !== '') {
      console.log('+ Auth Code: ' + self.emailauth);
    }
    console.log('+---------------------------------------------------------+');

    request.post({
      url: 'https://steamcommunity.com/login/dologin/',
      form: {
        password: encryptedPassword,
        username: self.username,
        twofactorcode: '',
        emailauth: self.emailauth,
        loginfriendlyname: '',
        captchagid: -1,
        captcha_text: '',
        emailsteamid: self.emailsteamid,
        rsatimestamp: self.steamRSA.timestamp,
        remember_login: 'false',
        donotcache: ( new Date().getTime() )
      }
    }, function(err, httpResponse, body) {
      var result = JSON.parse(body);
      if (result.success) {
        console.log('STEAM: Login Success!');
        console.log(httpResponse.headers['set-cookie']);
        var cookies = httpResponse.headers['set-cookie'];
        self.db('bots').find({username: self.username}).assign({cookies: cookies});
        self.db.save();
      } else {
        console.log('STEAM: Login FAILED.');
      }
      if (result.captcha_needed || result.bad_captcha) {
        console.warn('STEAM: Captcha Needed');
      }
      if (result.emailauth_needed) {
        console.log('STEAM: Waiting for email auth code.');
      }
      if (result.message) {
        console.log('STEAM: ' + result.message);
      }
      if (result.emailsteamid) {
        self.emailsteamid = result.emailsteamid;
        self.db('bots').find({username: self.username}).assign({steamid: result.emailsteamid});
        self.db.save();
      }
      callback(err, result);
    });
  } else {
    console.log('STOP HERE!');
  }
};

SteamEmailVerify.prototype.getrsakey = function(callback) {
  var self = this;

  if (self.username === '') {
    callback('No Username');
  }

  request.post({
    url: 'https://steamcommunity.com/login/getrsakey/',
    form: {
      username: self.username,
      donotcache: ( new Date().getTime() )
    }
  }, function(err, httpResponse, body) {
    var result = JSON.parse(body);
    self.steamRSA = result;
    callback(err, result);
  });

};

var RSAPublicKey = function($modulus_hex, $encryptionExponent_hex) {
  this.modulus = new BigInteger($modulus_hex, 16);
  this.encryptionExponent = new BigInteger($encryptionExponent_hex, 16);
};

var Base64 = {
  base64: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  encode: function($input) {
    if (!$input) {
      return false;
    }
    var $output = "";
    var $chr1, $chr2, $chr3;
    var $enc1, $enc2, $enc3, $enc4;
    var $i = 0;
    do {
      $chr1 = $input.charCodeAt($i++);
      $chr2 = $input.charCodeAt($i++);
      $chr3 = $input.charCodeAt($i++);
      $enc1 = $chr1 >> 2;
      $enc2 = (($chr1 & 3) << 4) | ($chr2 >> 4);
      $enc3 = (($chr2 & 15) << 2) | ($chr3 >> 6);
      $enc4 = $chr3 & 63;
      if (isNaN($chr2)) {
        $enc3 = $enc4 = 64;
      } else if (isNaN($chr3)) {
        $enc4 = 64;
      }
      $output += this.base64.charAt($enc1) + this.base64.charAt($enc2) + this.base64.charAt($enc3) + this.base64.charAt($enc4);
    } while ($i < $input.length);
    return $output;
  },
  decode: function($input) {
    if (!$input) {
      return false;
    }
    $input = $input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    var $output = "";
    var $enc1, $enc2, $enc3, $enc4;
    var $i = 0;
    do {
      $enc1 = this.base64.indexOf($input.charAt($i++));
      $enc2 = this.base64.indexOf($input.charAt($i++));
      $enc3 = this.base64.indexOf($input.charAt($i++));
      $enc4 = this.base64.indexOf($input.charAt($i++));
      $output += String.fromCharCode(($enc1 << 2) | ($enc2 >> 4));
      if ($enc3 != 64) {
        $output += String.fromCharCode((($enc2 & 15) << 4) | ($enc3 >> 2));
      }
      if ($enc4 != 64) {
        $output += String.fromCharCode((($enc3 & 3) << 6) | $enc4);
      }
    } while ($i < $input.length);
    return $output;
  }
};

var Hex = {
  hex: "0123456789abcdef",
  encode: function($input) {
    if (!$input) {
      return false;
    }
    var $output = "";
    var $k;
    var $i = 0;
    do {
      $k = $input.charCodeAt($i++);
      $output += this.hex.charAt(($k >> 4) & 0xf) + this.hex.charAt($k & 0xf);
    } while ($i < $input.length);
    return $output;
  },
  decode: function($input) {
    if (!$input) {
      return false;
    }
    $input = $input.replace(/[^0-9abcdef]/g, "");
    var $output = "";
    var $i = 0;
    do {
      $output += String.fromCharCode(((this.hex.indexOf($input.charAt($i++)) << 4) & 0xf0) | (this.hex.indexOf($input.charAt($i++)) & 0xf));
    } while ($i < $input.length);
    return $output;
  }
};

var RSA = {

  getPublicKey: function($modulus_hex, $exponent_hex) {
    return new RSAPublicKey($modulus_hex, $exponent_hex);
  },

  encrypt: function($data, $pubkey) {
    if (!$pubkey) {
      return false;
    }
    $data = this.pkcs1pad2($data, ($pubkey.modulus.bitLength() + 7) >> 3);
    if (!$data) {
      return false;
    }
    $data = $data.modPowInt($pubkey.encryptionExponent, $pubkey.modulus);
    if (!$data) {
      return false;
    }
    $data = $data.toString(16);
    if (($data.length & 1) == 1) {
      $data = "0" + $data;
    }
    return Base64.encode(Hex.decode($data));
  },

  pkcs1pad2: function($data, $keysize) {
    if ($keysize < $data.length + 11) {
      return null;
    }
    var $buffer = [];
    var $i = $data.length - 1;
    while ($i >= 0 && $keysize > 0)
      $buffer[--$keysize] = $data.charCodeAt($i--);
    $buffer[--$keysize] = 0;
    while ($keysize > 2)
      $buffer[--$keysize] = Math.floor(Math.random() * 254) + 1;
    $buffer[--$keysize] = 2;
    $buffer[--$keysize] = 0;
    return new BigInteger($buffer);
  }
};

module.exports = SteamEmailVerify;