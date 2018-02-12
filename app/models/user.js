var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link');


var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function() {
    this.on('creating', function(model, attrs, options) {

      var shasum = bcrypt.hashSync(model.attributes.password);
      //shasum.update(model.get('url'));
      model.set('password', model.attributes.username);
      model.set('password', shasum);
    });
  }

});

module.exports = User;
