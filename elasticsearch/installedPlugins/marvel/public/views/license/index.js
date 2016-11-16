const _ = require('lodash');
const chrome = require('ui/chrome');
const tabs = require('../../lib/tabs');
const mod = require('ui/modules').get('marvel', [
  'marvel/directives'
]);

require('ui/routes')
.when('/license', {
  template: require('plugins/marvel/views/license/index.html'),
  resolve: {
    marvel(Private) {
      var routeInit = Private(require('plugins/marvel/lib/route_init'));
      return routeInit();
    }
  }
});

mod.controller('licenseView', ($route, globalState, Private, timefilter, $scope, $window) => {

  function setClusters(clusters) {
    $scope.clusters = clusters;
    $scope.cluster = _.find($scope.clusters, { cluster_uuid: globalState.cluster });
  }
  setClusters($route.current.locals.marvel.clusters);

  const docTitle = Private(require('ui/doc_title'));
  docTitle.change('Marvel - License', true);

  $scope.isExpired = (new Date()).getTime() > _.get($scope, 'cluster.license.expiry_date_in_millis');

  $scope.goBack = function () {
    $window.history.back();
  };

  timefilter.enabled = false;

  if ($scope.isExpired) {
    chrome.setTabs([_.find(tabs, {id: 'home'})]);
  }

});
