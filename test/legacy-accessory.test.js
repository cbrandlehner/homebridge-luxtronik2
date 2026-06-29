'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const {normalizeLegacyAccessoryConfig} = require('../lib/config.js');

const log = {
  error() {},
};

describe('normalizeLegacyAccessoryConfig', () => {
  it('normalizes a legacy accessory config block', () => {
    const normalized = normalizeLegacyAccessoryConfig({
      name: 'Outdoor',
      IP: '192.168.71.100',
      Port: 8888,
      Channel: 5,
    }, log);

    assert.deepEqual(normalized, {
      name: 'Outdoor',
      ip: '192.168.71.100',
      port: 8888,
      channel: 5,
    });
  });
});