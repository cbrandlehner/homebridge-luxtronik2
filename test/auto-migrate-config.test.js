'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it} = require('node:test');
const {maybeAutoMigrateConfig} = require('../lib/auto-migrate-config.js');

const log = {
  info() {},
  warn() {},
  error() {},
};

describe('maybeAutoMigrateConfig', () => {
  it('returns unchanged when config.json is missing', () => {
    const result = maybeAutoMigrateConfig(path.join(os.tmpdir(), 'missing-config.json'), log);
    assert.deepEqual(result, {changed: false, migrated: 0});
  });

  it('migrates legacy accessories and writes config.json', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'luxtronik2-migrate-'));
    const configPath = path.join(dir, 'config.json');

    fs.writeFileSync(configPath, `${JSON.stringify({
      bridge: {name: 'Homebridge', username: 'AA:AA:AA:AA:AA:AA', pin: '111-11-111'},
      accessories: [
        {
          accessory: 'homebridge-luxtronik2.temperature',
          name: 'Outdoor',
          IP: '192.168.1.10',
          Port: 8888,
          Channel: 5,
        },
      ],
      platforms: [],
    }, null, 2)}\n`);

    const result = maybeAutoMigrateConfig(configPath, log);

    assert.equal(result.changed, true);
    assert.equal(result.migrated, 1);
    assert.equal(result.configPath, configPath);

    const written = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(written.accessories.length, 0);
    assert.equal(written.platforms.length, 1);
    assert.equal(written.platforms[0].platform, 'homebridge-luxtronik2');
    assert.deepEqual(written.platforms[0].sensors, [{name: 'Outdoor', channel: 5}]);
  });

  it('is idempotent on a second run', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'luxtronik2-migrate-'));
    const configPath = path.join(dir, 'config.json');

    fs.writeFileSync(configPath, `${JSON.stringify({
      bridge: {name: 'Homebridge', username: 'AA:AA:AA:AA:AA:AA', pin: '111-11-111'},
      accessories: [
        {
          accessory: 'homebridge-luxtronik2.temperature',
          name: 'Outdoor',
          IP: '192.168.1.10',
          Port: 8888,
          Channel: 5,
        },
      ],
      platforms: [],
    }, null, 2)}\n`);

    maybeAutoMigrateConfig(configPath, log);
    const result = maybeAutoMigrateConfig(configPath, log);

    assert.deepEqual(result, {changed: false, migrated: 0});
  });

  it('removes legacy entries without creating duplicate platforms', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'luxtronik2-migrate-'));
    const configPath = path.join(dir, 'config.json');

    fs.writeFileSync(configPath, `${JSON.stringify({
      bridge: {name: 'Homebridge', username: 'AA:AA:AA:AA:AA:AA', pin: '111-11-111'},
      accessories: [
        {
          accessory: 'homebridge-luxtronik2.temperature',
          name: 'Outdoor',
          IP: '192.168.71.100',
          Port: 8888,
          sensors: [{name: 'Outdoor', channel: 5}],
        },
      ],
      platforms: [
        {
          platform: 'homebridge-luxtronik2',
          name: 'Luxtronik2',
          IP: '192.168.71.100',
          Port: 8888,
          sensors: [{name: 'Outdoor', channel: 5}],
        },
      ],
    }, null, 2)}\n`);

    const result = maybeAutoMigrateConfig(configPath, log);

    assert.equal(result.changed, true);
    assert.equal(result.migrated, 1);

    const written = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(written.accessories.length, 0);
    assert.equal(written.platforms.length, 1);
    assert.deepEqual(written.platforms[0].sensors, [{name: 'Outdoor', channel: 5}]);
  });
});