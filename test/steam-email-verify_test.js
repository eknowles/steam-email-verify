/*global describe,it*/
'use strict';
var assert = require('assert'),
  steamEmailVerify = require('../lib/steam-email-verify.js');

describe('steam-email-verify node module.', function() {
  it('must be awesome', function() {
    assert( steamEmailVerify .awesome(), 'awesome');
  });
});
