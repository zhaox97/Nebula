import requirefrom from 'requirefrom';
import expect from 'expect.js';
import _ from 'lodash';

const lib = requirefrom('server/lib');
const lookups = lib('lookups');

describe('Node Types Lookups', () => {
  it('Has matching classes and labels', () => {
    const classKeys = Object.keys(lookups.nodeTypeClass);
    const labelKeys = Object.keys(lookups.nodeTypeLabel);
    const typeKeys = [ 'client', 'data', 'invalid', 'master', 'master_only', 'node' ];
    classKeys.sort();
    labelKeys.sort();
    expect(classKeys).to.be.eql(typeKeys);
    expect(labelKeys).to.be.eql(typeKeys);
  });

  it('Has usable values', () => {
    _.each(lookups.nodeTypeClass, (value) => {
      expect(value).to.be.a('string');
    });
    _.each(lookups.nodeTypeLabel, (value) => {
      expect(value).to.be.a('string');
    });
  });
});
