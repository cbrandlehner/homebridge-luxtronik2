'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const {normalizePlatformConfig, normalizeSensor} = require('../lib/config.js');

const log = {
  error() {},
};

describe('normalizePlatformConfig', () => {
  it('normalizes a multi-sensor platform config', () => {
    const normalized = normalizePlatformConfig({
      name: 'Heat Pump',
      IP: '192.168.71.100',
      Port: 8888,
      sensors: [
        {name: 'Outdoor', channel: 5},
        {name: 'Flow', channel: 0},
      ],
    }, log);

    assert.equal(normalized.platformName, 'Heat Pump');
    assert.equal(normalized.ip, '192.168.71.100');
    assert.equal(normalized.port, 8888);
    assert.deepEqual(normalized.sensors, [
      {name: 'Outdoor', channel: 5},
      {name: 'Flow', channel: 0},
    ]);
  });

  it('supports single Channel config without sensors array', () => {
    const normalized = normalizePlatformConfig({
      name: 'Luxtronik2',
      IP: '192.168.1.10',
      Port: 8888,
      Channel: 5,
    }, log);

    assert.deepEqual(normalized.sensors, [
      {name: 'Luxtronik2', channel: 5},
    ]);
  });

  it('rejects invalid ports', () => {
    assert.throws(
      () => normalizePlatformConfig({name: 'Luxtronik2', IP: '10.0.0.1', Port: 0}, log),
      /Invalid Port/,
    );
  });

  it('rejects invalid sensor channels', () => {
    assert.throws(
      () => normalizePlatformConfig({
        name: 'Luxtronik2',
        IP: '10.0.0.1',
        Port: 8888,
        sensors: [{name: 'Bad', channel: 99}],
      }, log),
      /Invalid channel/,
    );
  });
});

describe('normalizeSensor', () => {
  it('falls back to platform defaults', () => {
    assert.deepEqual(
      normalizeSensor({}, 5, 'Luxtronik2'),
      {name: 'Luxtronik2', channel: 5},
    );
  });
});