'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const {getChannelLabel, getTemperatureChannels} = require('../lib/channels.js');

describe('channels', () => {
  it('maps compacted channel 5 to Temperatur_TA', () => {
    assert.equal(getChannelLabel(5), 'Temperatur_TA (5)');
  });

  it('exposes temperature channels for config validation', () => {
    const channels = getTemperatureChannels();

    assert.ok(channels.length >= 19);
    assert.equal(channels[5].name, 'Temperatur_TA');
    assert.equal(channels[5].index, 5);
  });
});