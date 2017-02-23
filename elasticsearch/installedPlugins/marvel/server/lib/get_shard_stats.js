const _ = require('lodash');
const createQuery = require('./create_query');
const root = require('requirefrom')('');
const calculateNodeType = root('server/lib/calculate_node_type');
const nodeAggVals = root('server/lib/node_agg_vals');

module.exports = (req, indices, lastState) => {
  const config = req.server.config();
  const nodeResolver = config.get('marvel.node_resolver');
  const callWithRequest = req.server.plugins.elasticsearch.callWithRequest;
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const clusterUuid = req.params.clusterUuid;
  const aggSize = 10;
  const params = {
    index: indices,
    type: 'shards',
    ignore: [404],
    searchType: 'count',
    body: {
      sort: { timestamp: { order: 'desc' } },
      query: createQuery({
        clusterUuid: clusterUuid,
        filters: [ { term: { state_uuid: _.get(lastState, 'cluster_state.state_uuid') } } ]
      }),
      aggs: {
        indices: {
          terms: {
            field: 'shard.index',
            size: config.get('marvel.max_bucket_size')
          },
          aggs: {
            states: {
              terms: { field: 'shard.state', size: aggSize },
              aggs: { primary: { terms: { field: 'shard.primary', size: aggSize } } }
            }
          }
        },
        nodes: {
          terms: {
            field: `source_node.${nodeResolver}`,
            size: config.get('marvel.max_bucket_size')
          },
          aggs: {
            index_count: { cardinality: { field: 'shard.index' } },
            node_names: {
              terms: { field: 'source_node.name', size: aggSize },
              aggs: { max_timestamp: { max: { field: 'timestamp' } } }
            },
            node_transport_address: {
              terms: { field: 'source_node.transport_address', size: aggSize },
              aggs: { max_timestamp: { max: { field: 'timestamp' } } }
            },
            node_data_attributes: { terms: { field: 'source_node.attributes.data', size: aggSize } },
            node_master_attributes: { terms: { field: 'source_node.attributes.master', size: aggSize } },
            // for doing a join on the cluster state to determine if node is current master
            node_ids: { terms: { field: 'source_node.uuid', size: aggSize } }
          },
        }
      }
    }
  };

  return callWithRequest(req, 'search', params)
  .then((resp) => {
    const data = {
      nodes: {},
      totals: {
        primary: 0, replica: 0, unassigned: { replica: 0, primary: 0 }
      }
    };

    function createNewMetric() {
      return {
        status: 'green',
        primary: 0,
        replica: 0,
        unassigned: {
          replica: 0,
          primary: 0
        }
      };
    };

    function setStats(bucket, metric, ident) {
      const states = _.filter(bucket.states.buckets, ident);
      states.forEach((state) => {
        metric.primary = state.primary.buckets.reduce((acc, state) => {
          if (state.key) acc += state.doc_count;
          return acc;
        }, metric.primary);
        metric.replica = state.primary.buckets.reduce((acc, state) => {
          if (!state.key) acc += state.doc_count;
          return acc;
        }, metric.replica);
      });
    }

    function processIndexShards(bucket) {
      const metric = createNewMetric();
      setStats(bucket, metric, { key: 'STARTED' });
      setStats(bucket, metric.unassigned, (bucket) => bucket.key !== 'STARTED' && bucket.key !== 'RELOCATING');
      data.totals.primary += metric.primary;
      data.totals.replica += metric.replica;
      data.totals.unassigned.primary += metric.unassigned.primary;
      data.totals.unassigned.replica += metric.unassigned.replica;
      if (metric.unassigned.replica) metric.status = 'yellow';
      if (metric.unassigned.primary) metric.status = 'red';
      data[bucket.key] = metric;
    };

    // Mutate "data" with a nodes object having a field for every node
    function processNodeShards(bucket) {
      data.nodes[bucket.key] = {
        shardCount: bucket.doc_count,
        indexCount: bucket.index_count.value,
        name: nodeAggVals.getLatestAggKey(bucket.node_names.buckets),
        transport_address: nodeAggVals.getLatestAggKey(bucket.node_transport_address.buckets),
        node_ids: bucket.node_ids.buckets.map(bucket => bucket.key),
        attributes: {
          data: nodeAggVals.getNodeAttribute(bucket.node_data_attributes.buckets),
          master: nodeAggVals.getNodeAttribute(bucket.node_master_attributes.buckets)
        }
      };
      data.nodes[bucket.key].resolver = data.nodes[bucket.key][nodeResolver];
    }

    if (resp && resp.hits && resp.hits.total !== 0) {
      resp.aggregations.indices.buckets.forEach(processIndexShards);
      resp.aggregations.nodes.buckets.forEach(processNodeShards);
    }

    _.forEach(data.nodes, node => {
      node.type = calculateNodeType(node, lastState.cluster_state);
    });

    return data;

  });
};
