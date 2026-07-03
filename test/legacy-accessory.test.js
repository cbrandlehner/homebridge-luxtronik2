'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const {LegacyLuxtronikAccessory} = require('../lib/legacy-accessory.js');

describe('LegacyLuxtronikAccessory', () => {
  it('returns no services and logs a migration warning', () => {
    const warnings = [];
    const accessory = new LegacyLuxtronikAccessory({
      warn(message) {
        warnings.push(message);
      },
    }, {}, {});

    assert.deepEqual(accessory.getServices(), []);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /Legacy accessory config/);
    assert.match(warnings[0], /restart Homebridge/i);
  });
});