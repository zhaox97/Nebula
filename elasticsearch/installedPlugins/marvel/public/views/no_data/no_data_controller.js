const _ = require('lodash');
const chrome = require('ui/chrome');
const mod = require('ui/modules').get('marvel', [
  'marvel/directives'
]);
require('ui/routes')
.when('/no-data', {
  template: require('plugins/marvel/views/no_data/no_data_template.html'),
  resolve: {
    clusters: (marvelClusters, kbnUrl, Promise) => {
      return marvelClusters()
      .then(clusters => {
        if (clusters.length) {
          kbnUrl.changePath('/home');
          return Promise.reject();
        }
        chrome.setTabs([]);
        return Promise.resolve();
      });
    }
  }
})
.otherwise({ redirectTo: '/home' });

mod.controller('noData', (kbnUrl, $scope, $executor, marvelClusters, timefilter, $timeout) => {
  timefilter.enabled = true;

  timefilter.on('update', () => {
    // re-fetch if they change the time filter
    $executor.run();
  });

  // Register the marvelClusters service.
  $executor.register({
    execute: function () {
      return marvelClusters();
    },
    handleResponse: function (clusters) {
      if (clusters.length) {
        kbnUrl.changePath('/home');
      }
    }
  });

  // Start the executor
  $executor.start();

  // Destory the executor
  $scope.$on('$destroy', $executor.destroy);
});

