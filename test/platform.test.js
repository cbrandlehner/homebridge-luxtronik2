'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const {Luxtronik2Platform} = require('../lib/platform.js');
const {PLUGIN_NAME, PLATFORM_NAME} = require('../lib/constants.js');

const Service = {
  AccessoryInformation: 'AccessoryInformation',
  TemperatureSensor: 'TemperatureSensor',
};

const Characteristic = {
  Manufacturer: 'Manufacturer',
  Model: 'Model',
  FirmwareRevision: 'FirmwareRevision',
  SerialNumber: 'SerialNumber',
  CurrentTemperature: 'CurrentTemperature',
  StatusActive: 'StatusActive',
};

/**
 * @param {object} [options]
 * @param {Array<{name: string, channel: number}>} [options.sensors]
 * @param {Map<string, object>} [options.cachedAccessories]
 */
function createMockApi(options = {}) {
  const sensors = options.sensors ?? [{name: 'Outdoor', channel: 5}];
  const cachedAccessories = options.cachedAccessories ?? new Map();
  const registered = [];
  const unregistered = [];
  const launchHandlers = [];

  return {
    sensors,
    registered,
    unregistered,
    hap: {
      Service,
      Characteristic,
      uuid: {
        generate(key) {
          return `uuid:${key}`;
        },
      },
    },
    platformAccessory: class MockPlatformAccessory {
      constructor(displayName, uuid) {
        this.displayName = displayName;
        this.UUID = uuid;
        this.context = {};
        this.services = new Map();
      }

      getService(name) {
        return this.services.get(name) ?? null;
      }

      addService(name) {
        const service = {
          name,
          characteristics: new Map(),
          getCharacteristic(characteristicName) {
            if (!this.characteristics.has(characteristicName)) {
              this.characteristics.set(characteristicName, {
                props: {},
                handlers: new Map(),
                setProps(props) {
                  this.props = props;
                  return this;
                },
                on(event, handler) {
                  this.handlers.set(event, handler);
                  return this;
                },
                updateValue() {},
              });
            }

            return this.characteristics.get(characteristicName);
          },
          setCharacteristic(characteristicName, value) {
            const characteristic = this.getCharacteristic(characteristicName);
            characteristic.value = value;
            return this;
          },
        };
        this.services.set(name, service);
        return service;
      }
    },
    registerPlatformAccessories(pluginName, platformName, accessories) {
      registered.push({pluginName, platformName, accessories});
    },
    unregisterPlatformAccessories(pluginName, platformName, accessories) {
      unregistered.push({pluginName, platformName, accessories});
    },
    on(event, handler) {
      if (event === 'didFinishLaunching')
        launchHandlers.push(handler);
    },
    triggerLaunch() {
      for (const handler of launchHandlers)
        handler();
    },
    cachedAccessories,
  };
}

function createPlatformConfig(sensors) {
  return {
    name: 'Heat Pump',
    IP: '192.168.1.10',
    Port: 8888,
    sensors,
  };
}

describe('Luxtronik2Platform', () => {
  it('loads cached accessories via configureAccessory', () => {
    const log = {info() {}, error() {}};
    const api = createMockApi();
    const platform = new Luxtronik2Platform(log, createPlatformConfig(api.sensors), api);
    const cached = new api.platformAccessory('Cached Sensor', 'uuid:cached');

    platform.configureAccessory(cached);

    assert.equal(platform.accessories.get('uuid:cached'), cached);
  });

  it('registers new accessories on discoverDevices', () => {
    const log = {info() {}, error() {}};
    const api = createMockApi({
      sensors: [
        {name: 'Outdoor', channel: 5},
        {name: 'Flow', channel: 0},
      ],
    });
    const platform = new Luxtronik2Platform(log, createPlatformConfig(api.sensors), api);

    platform.discoverDevices();

    assert.equal(api.registered.length, 2);
    assert.equal(api.registered[0].pluginName, PLUGIN_NAME);
    assert.equal(api.registered[0].platformName, PLATFORM_NAME);
    assert.equal(api.registered[0].accessories[0].displayName, 'Outdoor');
    assert.equal(api.registered[1].accessories[0].displayName, 'Flow');
    assert.equal(api.unregistered.length, 0);
  });

  it('restores cached accessories and updates their config', () => {
    const log = {info() {}, error() {}};
    const sensors = [{name: 'Outdoor Renamed', channel: 5}];
    const api = createMockApi({sensors});
    const platform = new Luxtronik2Platform(log, createPlatformConfig(sensors), api);
    const uuid = api.hap.uuid.generate('192.168.1.10:8888:5');
    const cached = new api.platformAccessory('Old Name', uuid);
    cached.context.sensor = {name: 'Old Name', channel: 5};

    platform.configureAccessory(cached);
    platform.discoverDevices();

    assert.equal(api.registered.length, 0);
    assert.equal(cached.displayName, 'Outdoor Renamed');
    assert.deepEqual(cached.context.sensor, sensors[0]);
  });

  it('unregisters accessories no longer configured', () => {
    const log = {info() {}, error() {}};
    const api = createMockApi({sensors: [{name: 'Outdoor', channel: 5}]});
    const platform = new Luxtronik2Platform(log, createPlatformConfig(api.sensors), api);
    const staleUuid = 'uuid:stale';
    const staleAccessory = new api.platformAccessory('Stale Sensor', staleUuid);

    platform.configureAccessory(staleAccessory);
    platform.discoverDevices();

    assert.equal(api.unregistered.length, 1);
    assert.equal(api.unregistered[0].accessories[0], staleAccessory);
  });
});