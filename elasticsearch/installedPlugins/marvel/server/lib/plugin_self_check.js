const createMarvelIndexPattern = require('./create_marvel_index_pattern');
const ensureVersions = require('./ensure_versions');

module.exports = function pluginSelfCheck(plugin, server) {
  plugin.status.yellow('Waiting for Elasticsearch');
  var client = server.plugins.elasticsearch.client;

  server.plugins.elasticsearch.status.on('green', () => {
    // check if kibana is minimum supported version
    const {
      isKibanaSupported,
      kibanaVersion,
      marvelVersion
    } = ensureVersions(plugin);

    if (isKibanaSupported) {
      // start setting up the Marvel index.
      return createMarvelIndexPattern(server)
      .then(() => plugin.status.green('Marvel index ready'));
    } else if (!isKibanaSupported) {
      plugin.status.red(`Marvel version ${marvelVersion} is not supported with Kibana ${kibanaVersion}`);
    }
  });

};
