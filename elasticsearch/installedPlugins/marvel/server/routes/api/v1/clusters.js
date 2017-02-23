const Promise = require('bluebird');
const _ = require('lodash');
const root = require('requirefrom')('');
const getClustersStats = root('server/lib/get_clusters_stats');
const getClusters = root('server/lib/get_clusters');
const getClustersHealth = root('server/lib/get_clusters_health');
const Joi = require('joi');

const calculateIndices = root('server/lib/calculate_indices');
const getLastState = root('server/lib/get_last_state');
const getClusterStatus = root('server/lib/get_cluster_status');
const getMetrics = root('server/lib/get_metrics');
const getShardStats = root('server/lib/get_shard_stats');
const getLastRecovery = root('server/lib/get_last_recovery');
const calculateClusterStatus = root('server/lib/calculate_cluster_status');
const handleError = root('server/lib/handle_error');

module.exports = (server) => {
  const config = server.config();
  const callWithRequest = server.plugins.elasticsearch.callWithRequest;

  server.route({
    method: 'POST',
    path: '/api/marvel/v1/clusters',
    config: {
      validate: {
        payload: Joi.object({
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).required()
        })
      }
    },
    handler: (req, reply) => {
      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;
      return calculateIndices(req, start, end)
      .then(indices => {
        return getClusters(req, indices)
        .then(getClustersStats(req))
        .then(getClustersHealth(req))
        .then(clusters => reply(_.sortBy(clusters, 'cluster_name')));
      })
      .catch(err => reply(handleError(err, req)));
    }
  });

  server.route({
    method: 'POST',
    path: '/api/marvel/v1/clusters/{clusterUuid}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        }),
        payload: Joi.object({
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).required(),
          metrics: Joi.array().required()
        })
      }
    },
    handler: (req, reply) => {
      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;
      calculateIndices(req, start, end)
      .then(indices => {
        return getLastState(req, indices)
        .then(lastState => {
          return Promise.props({
            clusterStatus: getClusterStatus(req, indices, lastState),
            metrics: getMetrics(req, indices),
            shardStats: getShardStats(req, indices, lastState),
            shardActivity: getLastRecovery(req, indices)
          });
        });
      })
      .then(calculateClusterStatus)
      .then(reply)
      .catch(err => reply(handleError(err, req)));
    }
  });

  /*
   * Phone Home
   */
  server.route({
    method: 'GET',
    path: '/api/marvel/v1/clusters/{clusterUuid}/info',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        })
      }
    },
    handler: (req, reply) => {
      const params = {
        index: config.get('marvel.index'),
        type: 'cluster_info',
        id: req.params.clusterUuid
      };
      return callWithRequest(req, 'get', params)
      .then(resp => {
        const fields = [
          'cluster_uuid',
          'timestamp',
          'cluster_name',
          'version',
          'license',
          'cluster_stats'
        ];
        reply(_.pick(resp._source, fields));
      })
      .catch(err => reply(handleError(err, req)));
    }
  });
};
