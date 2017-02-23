const _ = require('lodash');
const filterPartialBuckets = require('./filter_partial_buckets');
const pickMetricFields = require('./pick_metric_fields');
const root = require('requirefrom')('');
const metrics = root('public/lib/metrics');

function mapChartData(metric) {
  return (bucket) => {
    const bucketMetricDeriv = bucket.metric_deriv;
    const bucketMetricValue = bucket.metric.value;
    const data = { x: bucket.key };
    if (metric.derivative && bucketMetricDeriv) {
      data.y = bucketMetricDeriv.normalized_value || bucketMetricDeriv.value || 0;
    } else if (bucketMetricValue) {
      data.y = bucketMetricValue;
    }

    return data;
  };
}

function calcSlope(data) {
  var length = data.length;
  var xSum = data.reduce(function (prev, curr) { return prev + curr.x; }, 0);
  var ySum = data.reduce(function (prev, curr) { return prev + curr.y; }, 0);
  var xySum = data.reduce(function (prev, curr) { return prev + (curr.y * curr.x); }, 0);
  var xSqSum = data.reduce(function (prev, curr) { return prev + (curr.x * curr.x); }, 0);
  var numerator = (length * xySum) - (xSum * ySum);
  var denominator = (length * xSqSum) - (xSum * ySum);
  return numerator / denominator;
}

/*
 * Calculation rules per type
 */
function calculateMetrics(type, partialBucketFilter) {
  // Rich statistics calculated only for nodes. Indices only needs lastVal
  let minVal;
  let maxVal;
  let slope;
  let lastVal;

  const calculators = {
    nodes: function (buckets, metric) {
      const results = _.chain(buckets)
      .filter(partialBucketFilter) // buckets with whole start/end time range
      .map(mapChartData(metric)) // calculate metric as X/Y
      .value();

      minVal = _.min(_.pluck(results, 'y'));
      maxVal = _.max(_.pluck(results, 'y'));
      slope = calcSlope(results);
      lastVal = _.last(_.pluck(results, 'y'));

      return { minVal, maxVal, slope, lastVal };
    },

    indices: function (buckets, metric) {
      // just find the last whole bucket
      let currentBucket;
      let idx = buckets.length - 1;
      while (idx > -1) {
        currentBucket = buckets[idx];
        if (currentBucket.doc_count > 0 && partialBucketFilter(currentBucket)) {
          // found the last whole bucket
          break;
        }
        idx -= 1;
      }

      lastVal = mapChartData(metric)(currentBucket).y;

      return { minVal, maxVal, slope, lastVal };
    }
  };

  return calculators[type];
}

module.exports = function mapListingResponse(options) {
  const { type, items, listingMetrics, min, max, bucketSize } = options;
  const partialBucketFilter = filterPartialBuckets(min, max, bucketSize, { ignoreEarly: true });
  const metricCalculator = calculateMetrics(type, partialBucketFilter);

  const data = _.map(items, function (item) {
    const row = { name: item.key, metrics: {} };

    _.each(listingMetrics, function (id) {

      const metric = metrics[id];
      const buckets = item[id].buckets;
      const { minVal, maxVal, slope, lastVal } = metricCalculator(buckets, metric);

      row.metrics[id] = {
        metric: pickMetricFields(metric),
        min: minVal,
        max: maxVal,
        slope: slope,
        last: lastVal
      };
    });

    return row;
  });

  return data;
};
