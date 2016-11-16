import requirefrom from 'requirefrom';
import expect from 'expect.js';
import _ from 'lodash';

const lib = requirefrom('server/lib');
const nodeAggVals = lib('node_agg_vals');

describe('Grabbing Values from Node Aggregations', () => {
  it('Gets the key from the aggregation with the latest timestamp', () => {
    const buckets = [
      { key: 'Node 2', max_timestamp: { value: 20 } },
      { key: 'Node 1', max_timestamp: { value: 10 } }
    ];
    expect(nodeAggVals.getLatestAggKey(buckets)).to.be.eql('Node 2');
  });

  it('Gets the last attributes for the node', () => {
    const buckets = [
      undefined,
      { key_as_string: 'false' }
    ];
    expect(nodeAggVals.getNodeAttribute(buckets)).to.be.eql('false');
  });

  it('Gets the undefined as last attributes for the node if no attributes set', () => {
    const buckets = [];
    expect(nodeAggVals.getNodeAttribute(buckets)).to.be.undefined;
  });
});
