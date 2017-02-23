const _ = require('lodash');
const Promise = require('bluebird');
const createQuery = require('./create_query.js');
const validateMarvelLicense = require('./validate_marvel_license');
module.exports = function getClusters(req, indices) {
  const callWithRequest = req.server.plugins.elasticsearch.callWithRequest;
  const config = req.server.config();
  // Get the params from the POST body for the request
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;

  const params = {
    index: indices,
    type: 'cluster_stats',
    meta: 'get_clusters_stats',
    ignore: [404],
    // terms agg for the cluster_uuids
    body: {
      size: 0, // return no hits, just aggregation buckets
      query: createQuery({
        start,
        end,
        clusterUuid: null
      }),
      aggs: {
        cluster_uuids: {
          terms: {
            field: 'cluster_uuid'
          }
        }
      }
    }
  };
  return callWithRequest(req, 'search', params)
  .then(statsResp => {
    const statsBuckets = _.get(statsResp, 'aggregations.cluster_uuids.buckets');
    if (_.isArray(statsBuckets)) {

      return Promise.map(statsBuckets, (uuidBucket) => {
        const cluster = {
          cluster_uuid: uuidBucket.key
        };

        const infoParams = {
          index: config.get('marvel.index'),
          type: 'cluster_info',
          meta: 'get_clusters_info',
          id: cluster.cluster_uuid
        };

        return callWithRequest(req, 'get', infoParams)
        .then(infoResp => {
          const infoDoc = infoResp._source;

          cluster.cluster_name = infoDoc.cluster_name;
          const license = infoDoc.license;
          if (license && validateMarvelLicense(cluster.cluster_uuid, license)) {
            cluster.license = license;
            cluster.version = infoDoc.version;
          }

          return cluster;
        });
      })
      // Only return clusters with valid licenses
      .filter(cluster => cluster.license);
    }
  });
};
