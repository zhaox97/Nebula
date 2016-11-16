const mod = require('ui/modules').get('marvel/directives', []);

function setupGoogleTagManager(window, id) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event:'gtm.js' });
  const document = window.document;
  const firstScriptTag = document.getElementsByTagName('script')[0];
  const scriptTag = document.createElement('script');
  scriptTag.async = true;
  scriptTag.src = '//www.googletagmanager.com/gtm.js?id=' + id;
  firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);
}

mod.directive('googleAnalytics', (Private, googleTagManagerId, reportStats, features, $window) => {
  return {
    restrict: 'E',
    scope: {},
    link(scope) {

      const phoneHome = Private(require('plugins/marvel/lib/phone_home'));
      let loaded = false;

      scope.$watch(() => features.isEnabled('report', true), (featureToggled) => {
        if (phoneHome.isNewUser()) {
          // User has not had a chance to opt-out of tracking / phone home yet
          // Do nothing this time, try again next time
          return;
        }

        if (!loaded && reportStats && featureToggled) {
          setupGoogleTagManager($window, googleTagManagerId);
          loaded = true;
        }
      });

    }
  };
});
