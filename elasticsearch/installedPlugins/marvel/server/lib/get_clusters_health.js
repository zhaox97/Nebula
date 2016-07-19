import { get, find, indexBy } from 'lodash';
import moment from 'moment';

module.exports = function (req) {
  const server = req.server;
  const callWithRequest = server.plugins.elasticsearch.callWithRequest;
  const config = server.config();
  return function (clusters) {
    const bodies = [];
    clusters.forEach((cluster) => {
      bodies.push({
        index: config.get('marvel.index_prefix') + '*',
        type: 'cluster_state'
      });
      bodies.push({
        size: 1,
        sort: {
          'timestamp': { order: 'desc' }
        },
        query: {
          filtered: {
            filter: {
              term: {
                'cluster_uuid': cluster.cluster_uuid
              }
            }
          }
        }
      });
    });
    if (!bodies.length) return Promise.resolve();
    const params = {
      index: config.get('marvel.index_prefix') + '*',
      type: 'cluster_state',
      body: bodies
    };
    return callWithRequest(req, 'msearch', params)
    .then(res => {
      res.responses.forEach(resp => {
        const hit = get(resp, 'hits.hits[0]');
        if (resp && resp.hits && resp.hits.total !== 0) {
          const clusterName = get(hit, '_source.cluster_uuid');
          const nodes = get(hit, '_source.cluster_state.nodes');
          const cluster = find(clusters, { cluster_uuid: clusterName });
          cluster.status = get(hit, '_source.cluster_state.status');
          cluster.state_uuid = get(hit, '_source.cluster_state.state_uuid');
          cluster.state_timestamp = get(hit, '_source.timestamp');
          cluster.nodes = indexBy(nodes, config.get('marvel.node_resolver'));
        }
      });
      return clusters;
    });
  };
};


