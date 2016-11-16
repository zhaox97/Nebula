const module = require('ui/modules').get('marvel/clusters');
module.service('marvelClusters', (timefilter, $http, Private) => {
  const url = '../api/marvel/v1/clusters';
  return () => {
    const { min, max } = timefilter.getBounds();
    return $http.post(url, {
      timeRange: {
        min: min.toISOString(),
        max: max.toISOString()
      }
    })
    .then(response => response.data)
    .catch(err => {
      const ajaxErrorHandlers = Private(require('plugins/marvel/lib/ajax_error_handlers'));
      return ajaxErrorHandlers.fatalError(err);
    });
  };
});
