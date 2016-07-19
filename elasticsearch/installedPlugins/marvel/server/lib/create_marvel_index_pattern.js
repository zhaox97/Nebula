var Promise = require('bluebird');
var marvelIndexPattern = require('./marvel_index_pattern.json');
module.exports = function (server) {
  var client = server.plugins.elasticsearch.client;
  var config = server.config();
  var index = config.get('kibana.index');
  var marvelIndexPrefix = config.get('marvel.index_prefix');
  var id =  marvelIndexPrefix + '*';
  var type = 'index-pattern';
  return client.get({
    index: index,
    type: type,
    id: id,
    ignoreUnavailable: true
  })
  .catch(function (resp) {
    if (resp.status !== 404) return Promise.reject(resp);
    // Create an index pattern for Marvel indices.
    return client.index({
      index: index,
      type: type,
      id: id,
      body: marvelIndexPattern
    });
  });
};
