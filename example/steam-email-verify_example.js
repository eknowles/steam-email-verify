'use strict';

var winston = require('winston');
var config = require('./config.js');

var SteamEmailVerify = require('../lib/steam-email-verify.js');

var verify = new SteamEmailVerify(config);
