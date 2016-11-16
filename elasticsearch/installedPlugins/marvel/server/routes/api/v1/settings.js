var _ = require('lodash');
var Joi = require('joi');
var Boom = require('boom');
var root = require('requirefrom')('');
var settingSchemas = root('server/lib/setting_schemas');
var settingsModelProvider = root('server/lib/settings');
var getClusters = root('server/lib/get_clusters');
var handleError = root('server/lib/handle_error');

module.exports = function (server) {
  var config = server.config();
  var index = config.get('marvel.index');
  var Settings = settingsModelProvider(server);

  server.route({
    method: 'GET',
    path: '/api/marvel/v1/settings',
    handler: function (req, reply) {
      return getClusters(req)
      .then((clusters) => {
        var cluster = req.query.cluster;
        var clusterKeys = cluster && [cluster] || _.map(clusters, (cluster) => cluster.cluster_uuid);
        var keys = [];
        _.each(clusterKeys, function (cluster) {
          _.each(_.keys(settingSchemas), function (key) {
            keys.push(cluster + ':' + key);
          });
        });
        return Settings.bulkFetch({ ids: keys, req: req });
      })
      .then(reply)
      .catch(err => reply(handleError(err, req)));
    }
  });

  server.route({
    method: 'GET',
    path: '/api/marvel/v1/settings/{id}',
    handler: function (req, reply) {
      var parts = req.params.id.split(/:/);
      var schema = settingSchemas[parts[1]];
      if (!schema) return reply(Boom.notFound('Resouce does not exist.'));
      return Settings.fetchById({ req: req, id: req.params.id })
      .then(reply)
      .catch(err => reply(handleError(err, req)));
    }
  });

  server.route({
    method: [ 'PUT', 'POST' ],
    path: '/api/marvel/v1/settings/{id}',
    config: {
      validate: {
        payload: function (value, options, next) {
          var parts = options.context.params.id.split(/:/);
          var schema = settingSchemas[parts[1]];
          if (!schema) return next(Boom.notFound('Resouce does not exist'));
          var settings = new Settings(value);
          settings.validate();
          next(null, settings);
        }
      }
    },
    handler: function (req, reply) {
      var settings = req.payload;
      return settings.save({ req: req, stripDefaults: true })
      .then(function (doc) {
        reply(doc).code(201);
      })
      .catch(err => reply(handleError(err, req)));
    }
  });

};
