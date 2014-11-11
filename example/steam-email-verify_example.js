'use strict';

var SteamEmailVerify = require('../lib/steam-email-verify.js');
var veri = new SteamEmailVerify();
var winston = require('winston');
var config = require('./config.js');

veri.setup(config, function(){

});

veri.on('debug', winston.log);