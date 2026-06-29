'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const {
  accessoryToPlatform,
  isLegacyLuxtronikAccessory,
  migrateHomebridgeConfig,
} = require('../lib/migrate-config.js');

describe('migrateHomebridgeConfig', () => {
  it('detects legacy accessory entries', () => {
    assert.equal(
      isLegacyLuxtronikAccessory({accessory: 'homebridge-luxtronik2.temperature'}),
      true,
    );
    assert.equal(
      isLegacyLuxtronikAccessory({platform: 'homebridge-luxtronik2'}),
      false,
    );
  });

  it('converts a legacy accessory to a platform block', () => {
    assert.deepEqual(accessoryToPlatform({
      name: 'Luxtronik2',
      IP: '192.168.1.10',
      Port: 8888,
      Channel: 5,
    }), {
      platform: 'homebridge-luxtronik2',
      name: 'Luxtronik2',
      IP: '192.168.1.10',
      Port: 8888,
      sensors: [{name: 'Luxtronik2', channel: 5}],
      Channel: 5,
    });
  });

  it('preserves sensors array from hybrid accessory entries', () => {
    const {config} = migrateHomebridgeConfig({
      platforms: [],
      accessories: [
        {
          accessory: 'homebridge-luxtronik2.temperature',
          name: 'Luxtronik2',
          IP: '192.168.1.202',
          Port: 8888,
          sensors: [{name: 'Luxtronik2 Temperature', channel: 5}],
        },
      ],
    });

    assert.deepEqual(config.platforms[0].sensors, [
      {name: 'Luxtronik2 Temperature', channel: 5},
    ]);
  });

  it('migrates accessories into platforms and removes legacy entries', () => {
    const {config, migrated, changed} = migrateHomebridgeConfig({
      platforms: [],
      accessories: [
        {
          accessory: 'homebridge-luxtronik2.temperature',
          name: 'Outdoor',
          IP: '192.168.1.10',
          Port: 8888,
          Channel: 5,
        },
        {
          accessory: 'Some-Other-Plugin',
          name: 'Other',
        },
      ],
    });

    assert.equal(migrated, 1);
    assert.equal(changed, true);
    assert.equal(config.accessories.length, 1);
    assert.equal(config.accessories[0].accessory, 'Some-Other-Plugin');
    assert.equal(config.platforms.length, 1);
    assert.equal(config.platforms[0].platform, 'homebridge-luxtronik2');
    assert.deepEqual(config.platforms[0].sensors, [
      {name: 'Outdoor', channel: 5},
    ]);
  });

  it('groups multiple legacy accessories on the same controller', () => {
    const {config} = migrateHomebridgeConfig({
      platforms: [],
      accessories: [
        {
          accessory: 'homebridge-luxtronik2.temperature',
          name: 'Outdoor',
          IP: '192.168.1.10',
          Port: 8888,
          Channel: 5,
        },
        {
          accessory: 'homebridge-luxtronik2.temperature',
          name: 'Flow',
          IP: '192.168.1.10',
          Port: 8888,
          Channel: 0,
        },
      ],
    });

    assert.equal(config.platforms.length, 1);
    assert.deepEqual(config.platforms[0].sensors, [
      {name: 'Outdoor', channel: 5},
      {name: 'Flow', channel: 0},
    ]);
    assert.equal(config.accessories.length, 0);
  });

  it('leaves config unchanged when no legacy accessories exist', () => {
    const input = {
      platforms: [{platform: 'homebridge-luxtronik2', name: 'Already migrated'}],
      accessories: [],
    };
    const {config, migrated, changed} = migrateHomebridgeConfig(input);

    assert.equal(migrated, 0);
    assert.equal(changed, false);
    assert.deepEqual(config, input);
  });
});