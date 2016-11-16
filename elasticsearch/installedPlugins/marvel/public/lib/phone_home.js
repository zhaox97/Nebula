/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */

var _ = require('lodash');
module.exports = function phoneHomeProvider(Promise, es, $http, statsReportUrl, reportStats, features) {

  const defaults = {
    report: true,
    status: 'trial'
  };

  class PhoneHome {

    constructor() {
      this.attributes = {};
      try {
        var marvelData = localStorage.getItem('marvel_data');
        let attributes = marvelData && JSON.parse(marvelData) || {};
        _.defaults(this.attributes, attributes, defaults);
      } catch (e) {
        _.defaults(this.attributes, defaults);
      }
    }

    set(key, value) {
      var self = this;
      var previous;
      if (typeof key === 'object') {
        previous = _.pick(this.attributes, _.keys(key));
        this.attributes = _.assign(this.attributes, key);
      } else {
        previous = this.attributes[key];
        this.attributes[key] = value;
      }
    }

    get(key) {
      if (_.isUndefined(key)) {
        return this.attributes;
      } else {
        return this.attributes[key];
      }
    }

    saveToBrowser() {
      localStorage.setItem('marvel_data', JSON.stringify(this.attributes));
    }

    checkReportStatus() {
      var reportInterval = 86400000; // 1 day
      var sendReport     = false;

      // check if opt-in for phone home is enabled in config (reportStats) and browser setting (features)
      if (reportStats && features.isEnabled('report', true)) {
        // If the last report is empty it means user is first-time visiting
        // Marvel app and has not had an opportunity to opt out.
        if (!this.get('lastReport')) {
          // Initialize the browser data for phone home
          // if they remain opted in, report interval will trigger 1 minute from now
          this.set('lastReport', new Date().getTime() - (86400000 - 60000));
          this.set('isNewUser', true);

          this.saveToBrowser();
        }
        // If it's been a day since we last sent an report, send one.
        if (new Date().getTime() - parseInt(this.get('lastReport'), 10) > reportInterval) {
          // GA beacon will load for this page, because it's in the footer and loaded last
          // and it will load on subsequent pages as long as user doesn't opt-out
          this.set('isNewUser', false);
          sendReport = true;
        }
      }

      return sendReport;
    }

    // Helper method for GA
    // Since consumers shouldn't directly call phoneHome.get() and phoneHome.set()
    isNewUser() {
      return this.get('isNewUser') === true || _.isUndefined(this.get('lastReport'));
    }

    getClusterInfo(clusterUUID) {
      let url = `../api/marvel/v1/clusters/${clusterUUID}/info`;
      return $http.get(url)
      .then((resp) => {
        return resp.data;
      })
      .catch((err) => {
        return {};
      });
    }

    sendIfDue(clusters) {
      var self = this;
      if (!this.checkReportStatus()) return Promise.resolve();
      return Promise.all(clusters.map((cluster) => {
        return this.getClusterInfo(cluster.cluster_uuid).then((info) => {
          const req = {
            method: 'POST',
            url: statsReportUrl,
            data: info
          };
          // if passing data externally to Infra, suppress kbnXsrfToken
          if (statsReportUrl.match(/^https/)) req.kbnXsrfToken = false;
          return $http(req);
        });
      })).then(() => {
        // we sent a report, so we need to record and store the current time stamp
        this.set('lastReport', Date.now());
        this.saveToBrowser();
      })
      .catch((err) => {
        // no ajaxErrorHandlers for phone home
        return Promise.resolve();
      });
    }

  }; // end class

  return (new PhoneHome());

};
