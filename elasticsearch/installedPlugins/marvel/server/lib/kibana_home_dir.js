/*
 * Return an object with strings for the Kibana home path.
 * Dev path used in dev contexts (gulp sync)
 * Test path used in unit tests for require'ing Kibana modules
 */
import { resolve } from 'path';
export default {
  dev: resolve(__dirname, '../../../../../kibana'),
  test: resolve(__dirname, '../../../../../..')
};
