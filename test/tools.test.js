'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const tools = require('../lib/tools.js');

const IP_192_168_1_100 = 3_232_235_876;

describe('tools', () => {
  it('converts integers to dotted IP addresses', () => {
    assert.equal(tools.int2ip(IP_192_168_1_100), '192.168.1.100');
  });

  it('detects defined values with isset', () => {
    assert.equal(tools.isset(0), true);
    assert.equal(tools.isset(undefined), false);
  });
});
