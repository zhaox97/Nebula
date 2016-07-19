var expect = require('expect.js');
var root = require('requirefrom')('');
var stripDefaults = root('server/lib/strip_defaults');
var settingSchemas = root('server/lib/setting_schemas');

describe('stripDefaults()', function () {
  it('should strip defaults', function () {
    var schema = settingSchemas['metric-thresholds'];
    var body = {
      'cluster_index_request_rate.warning': '>1000',
      'cluster_index_request_rate.critical': '>2000'
    };
    expect(stripDefaults(body, schema)).to.eql({
      'cluster_index_request_rate.critical': '>2000'
    });
  });
});
