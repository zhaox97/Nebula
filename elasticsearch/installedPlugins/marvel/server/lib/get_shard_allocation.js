const _ = require('lodash');
const createQuery = require('./create_query');

module.exports = (req, indices, filters, lastState) => {
  filters.push({
    term: { state_uuid: _.get(lastState, 'cluster_state.state_uuid') }
  });

  const config = req.server.config();
  const callWithRequest = req.server.plugins.elasticsearch.callWithRequest;
  const clusterUuid = req.params.clusterUuid;
  const params = {
    index: config.get('marvel.index_prefix') + '*',
    type: 'shards',
    body: {
      size: config.get('marvel.max_bucket_size'),
      query: createQuery({ clusterUuid, filters })
    }
  };

  return callWithRequest(req, 'search', params)
  .then((resp) => {
    const hits = _.get(resp, 'hits.hits');
    if (!hits) return [];
    // map into object with shard and source properties
    return hits.map(doc => _.merge(doc._source.shard, {
      resolver: _.get(doc, `_source.source_node[${config.get('marvel.node_resolver')}]`)
    }));
  });
};
