'use strict';

module.exports = LootSteamController;

// "request": "2.27.0",
var request = require('request'),
  cheerio = require('cheerio'),
  crypto = require('crypto'),
  Long = require('long'),
  querystring = require('querystring');

require('util').inherits(LootSteamController, require('events').EventEmitter);

function LootSteamController() {
  require('events').EventEmitter.call(this);

  var self = this;

  this._j = request.jar();
  this._request = request.defaults({jar: this._j});
}

LootSteamController.prototype.setup = function(bot, callback) {

  if (!bot) {
    throw 'No Bot';
  }

  var self = this;

  this.on('debug', console.log);

  self.bot = bot;

  // var sessionId = 'MTM5OkTyOTM1MA==';
  var sessionId = randomSessionId();
  this.sessionID = sessionId;
  // console.log('using sessionID: ' + sessionId);

  self.bot.cookies.push('sessionid=' + sessionId);
  self.bot.cookies.forEach(function(name) {
    setCookie(self, name);
  });

  getAPIKey(this, callback);

  //callback();

};

function getAPIKey(self, callback) {
  if (self.APIKey || self.bot.apiKey) {
    return callback();
  }
  self._request.get({
    uri: 'https://steamcommunity.com/dev/apikey'
  }, function(error, response, body) {
    if (error || response.statusCode != 200) {
      self.emit('debug', 'retrieving apikey: ' + (error || response.statusCode));
      if(typeof callback == 'function'){
        callback(error || response.statusCode);
      }
    } else {
      var $ = cheerio.load(body);
      if ($('#mainContents h2').html() == 'Access Denied') {
        self.emit('debug', 'retrieving apikey: access denied (probably limited account)');
        self.emit('needsAPIKey', self.bot.steamId);
        self.APIKey = '';
        var error = new Error('Access Denied');
        if(typeof callback == 'function'){
          callback(error);
        } else {
          throw error;
        }
      } else if($('#bodyContents_ex h2').html() == 'Your Steam Web API Key'){
        var key = $('#bodyContents_ex p').html().split(' ')[1];
        self.APIKey = key;
        if(typeof callback == 'function'){
          callback();
        }
      } else {
        self._request.post({
          uri: 'https://steamcommunity.com/dev/registerkey',
          form: {
            domain: 'localhost',
            agreeToTerms: 1
          }
        }, function(error, response, body) {
          getAPIKey(self, callback);
        }.bind(self));
      }
    }
  }.bind(self));
}

LootSteamController.prototype._loadInventory = function(inventory, uri, options, contextid, start, callback) {
  options.uri = uri;

  if (start) {
    options.uri = options.uri + '&' + querystring.stringify({'start': start});
  }

  this._request.get(options, function(error, response, body) {
    if (error || response.statusCode != 200 || JSON.stringify(body) == '{}') {
      this.emit('debug', 'loading my inventory: ' + (error || (response.statusCode != 200 ? response.statusCode : '{}')));
      this._loadInventory(inventory, uri, options, contextid, start, callback);
    } else if (typeof body != 'object') {
      // no session
      if (typeof callback == 'function') {
        callback(new Error('No session'));
      }
    } else if (body.success == false) {
      // inventory not found
      if (typeof callback == 'function') {
        callback(new Error('Inventory not found'));
      }
    } else if (Object.prototype.toString.apply(body) == '[object Array]') {
      //private inventory
      if (typeof callback == 'function') {
        callback(new Error('Inventory is private'));
      }
    } else {
      inventory = inventory.concat(mergeWithDescriptions(body.rgInventory, body.rgDescriptions, contextid)
        .concat(mergeWithDescriptions(body.rgCurrency, body.rgDescriptions, contextid)));
      if (body.more) {
        this._loadInventory(inventory, uri, options, contextid, body.more_start, callback);
      } else {
        if (typeof callback == 'function') {
          callback(null, inventory);
        }
      }
    }
  }.bind(this));
};

LootSteamController.prototype.loadMyInventory = function(appid, contextid, callback) {
  var self = this;

  var uri = 'http://steamcommunity.com/my/inventory/json/' + appid + '/' + contextid + '/?trading=1';

  this._loadInventory([], uri, {json: true}, contextid, null, callback);
};

LootSteamController.prototype.loadPartnerInventory = function(partner, appid, contextid, callback) {
  var self = this;

  var form = {
    sessionid: this.sessionID,
    partner: partner,
    appid: appid,
    contextid: contextid
  };

  var uri = 'http://steamcommunity.com/tradeoffer/new/partnerinventory/?' + querystring.stringify(form);

  this._loadInventory([], uri, {
    json: true,
    headers: {
      referer: 'http://steamcommunity.com/tradeoffer/new/?partner=' + toAccountId(partner)
    }
  }, contextid, null, callback);
};

LootSteamController.prototype.editProfileSettings = function(options, callback) {
  var self = this;
  var url = 'http://steamcommunity.com/profiles/' + self.bot.steamId + '/edit/?welcomed=1';
  options.sessionID = this.sessionID;
  options.type = 'profileSave';
  options.summary = options.summary || ' ';
  options.personaName = options.personaName || 'loot.gg';
  options.real_name = options.real_name || 'live esports • betting • shop • trading';
  this._request.post({
    url: url,
    form: options,
    headers: {
      Referer: url,
      DNT: 1
    }
  }, function(err, httpResponse, body) {
    console.log('Updated Profile ' + self.bot.steamId);
    callback(err, body);
  });
};

LootSteamController.prototype.editPrivacySettings = function(callback) {
  var self = this;
  var url = 'http://steamcommunity.com/profiles/' + self.bot.steamId + '/edit/settings';
  var options = {};
  options.sessionID = this.sessionID;
  options.type = 'profileSettings';
  options.commentSetting = 'commentselfonly';
  options.privacySetting = 3;
  options.inventoryGiftPrivacy = 1;
  options.inventoryPrivacySetting = 3;
  this._request.post({
    url: url,
    form: options,
    headers: {
      Referer: url,
      DNT: 1
    }
  }, function(err, httpResponse, body) {
    console.log('Updated Profile Privacy ' + self.bot.steamId);
    callback(err, body);
  });
};


LootSteamController.prototype.getOfferUrl = function(callback) {
  var self = this;
  var url = 'http://steamcommunity.com/profiles/' + self.bot.steamId + '/tradeoffers/privacy';
  this._request.get({
    url: url,
    headers: {
      Referer: url,
      DNT: 1
    }
  }, function(err, httpResponse, body) {
    if (httpResponse.statusCode == 200 && !err) {
      var $ = cheerio.load(body);
      var url = $('input#trade_offer_access_url').val();
      console.log(url);
      callback(null, url);
    } else {
      callback(err);
    }
  });
};

LootSteamController.prototype.getOffers = function(options, callback) {
  doAPICall(this, {
    method: 'GetTradeOffers/v1',
    params: options,
    callback: function(error, res) {
      if (error) {
        if (typeof callback == 'function') {
          callback(error);
        }
      } else {
        if (res.response.trade_offers_received !== undefined) {
          res.response.trade_offers_received = res.response.trade_offers_received.map(function(offer) {
            offer.steamid_other = toSteamId(offer.accountid_other);
            return offer;
          });
        }
        if (res.response.trade_offers_sent !== undefined) {
          res.response.trade_offers_sent = res.response.trade_offers_sent.map(function(offer) {
            offer.steamid_other = toSteamId(offer.accountid_other);
            return offer;
          });
        }
        if (typeof callback == 'function') {
          callback(null, res);
        }
      }
    }
  });
};

LootSteamController.prototype.getOffer = function(options, callback) {
  doAPICall(this, {
    method: 'GetTradeOffer/v1',
    params: options,
    callback: function(error, res) {
      if (error) {
        if (typeof callback == 'function') {
          callback(error);
        }
      } else {
        res.response.offer.steamid_other = toSteamId(res.response.offer.accountid_other);
        if (typeof callback == 'function') {
          callback(null, res);
        }
      }
    }
  });
};

LootSteamController.prototype.declineOffer = function(tradeofferid, callback) {
  doAPICall(this, {
    method: 'DeclineTradeOffer/v1',
    params: {tradeofferid: tradeofferid},
    post: true,
    callback: callback
  });
};

LootSteamController.prototype.cancelOffer = function(tradeofferid, callback) {
  doAPICall(this, {
    method: 'CancelTradeOffer/v1',
    params: {tradeofferid: tradeofferid},
    post: true,
    callback: callback
  });
};

LootSteamController.prototype.acceptOffer = function(tradeofferid, callback) {
  if (typeof tradeofferid == 'undefined') {
    if (typeof callback == 'function') {
      callback(new Error('No options'));
    }
  } else {
    this._request.post({
      uri: 'https://steamcommunity.com/tradeoffer/' + tradeofferid + '/accept',
      headers: {
        referer: 'http://steamcommunity.com/tradeoffer/' + tradeofferid + '/'
      },
      form: {
        sessionid: this.sessionID,
        tradeofferid: tradeofferid
      }
    }, function(error, response, body) {
      if (error || response.statusCode != 200) {
        if (typeof callback == 'function') {
          callback(error || new Error(response.statusCode));
        }
      } else {
        if (typeof callback == 'function') {
          callback(null, {response: {}});
        }
      }
    });
  }
};

LootSteamController.prototype.makeOffer = function(options, callback) {

  var self = this;
  var referer;

  var tradeoffer = {
    'newversion': true,
    'version': 2,
    'me': {
      'assets': options.itemsFromMe,
      'currency': [],
      'ready': false
    },
    'them': {
      'assets': options.itemsFromThem,
      'currency': [],
      'ready': false
    }
  };

  var formFields = {
    sessionid: this.sessionID,
    partner: options.partnerSteamId || toSteamId(options.partnerAccountId),
    tradeoffermessage: options.message || '',
    json_tradeoffer: JSON.stringify(tradeoffer)
  };

  var query = {
    partner: options.partnerAccountId || toAccountId(options.partnerSteamId)
  };

  if (typeof options.accessToken != 'undefined') {
    formFields.trade_offer_create_params = JSON.stringify({trade_offer_access_token: options.accessToken});
    query.token = options.accessToken;
  }

  if (typeof options.counteredTradeOffer != 'undefined') {
    formFields.tradeofferid_countered = options.counteredTradeOffer;
    referer = 'http://steamcommunity.com/tradeoffer/' + options.counteredTradeOffer + '/';
  }
  else {
    referer = 'http://steamcommunity.com/tradeoffer/new/?' + querystring.stringify(query);
  }

  this._request.post({
    uri: 'https://steamcommunity.com/tradeoffer/new/send',
    headers: {
      referer: referer
    },
    form: formFields
  }, function(error, response, body) {
    var result = {};
    try {
      result = JSON.parse(body) || {};
    } catch (e) {
      if (typeof callback == 'function') {
        return callback(e);
      }
    }

    if (error || response.statusCode != 200) {
      self.emit('debug', 'making an offer: ' + (error || response.statusCode));
      if (typeof callback == 'function') {
        callback(error || result.strError || response.statusCode);
      }
    } else {
      if (typeof callback == 'function') {
        callback(null, result);
      }
    }
  });
};

function toSteamId(accountId) {
  return new Long(parseInt(accountId, 10), 0x1100001).toString();
}

function toAccountId(steamId) {
  return Long.fromString(steamId).toInt().toString();
}

function mergeWithDescriptions(items, descriptions, contextid) {
  return Object.keys(items).map(function(id) {
    var item = items[id];
    var description = descriptions[item.classid + '_' + (item.instanceid || '0')];
    for (var key in description) {
      item[key] = description[key];
    }
    // add contextid because Steam is retarded
    item.contextid = contextid;
    return item;
  });
}

function doAPICall(self, options) {
  var request_params = {
    uri: 'http://api.steampowered.com/IEconService/' + options.method + '/?key=' + self.APIKey + ((options.post) ? '' : '&' + querystring.stringify(options.params)),
    json: true,
    method: options.post ? 'POST' : 'GET'
  };

  if (options.post) {
    request_params.form = options.params;
  }

  request(request_params, function(error, response, body) {
    if (error || response.statusCode != 200) {
      self.emit('debug', 'doing API call ' + options.method + ': ' + (error || response.statusCode));
      if (typeof options.callback == 'function') {
        options.callback(error || new Error(response.statusCode));
      }
    } else if (typeof body != 'object') {
      if (typeof options.callback == 'function') {
        options.callback(new Error('Invalid response'));
      }
    } else {
      if (typeof options.callback == 'function') {
        options.callback(null, body);
      }
    }
  });
}

function setCookie(self, cookie) {
  self._j.add(request.cookie(cookie));
}

function randomSessionId() {
  var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789',
    count = 12;

  var rnd = crypto.randomBytes(count),
    value = new Array(count),
    len = chars.length;

  for (var i = 0; i < count; i++) {
    value[i] = chars[rnd[i] % len];
  }

  return value.join('');

}
