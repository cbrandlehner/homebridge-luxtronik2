'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const packageFile = require('../package.json');
const {Luxtronik2Accessory} = require('../lib/accessory.js');

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

function createMockAccessory() {
  return {
    displayName: 'Initial Name',
    context: {},
    services: new Map(),
    getService(name) {
      return this.services.get(name) ?? null;
    },
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
    },
  };
}

function createMockPlatform() {
  return {
    ip: '192.168.1.10',
    port: 8888,
    Service,
    Characteristic,
    log: {info() {}, debug() {}, warn() {}},
    client: {
      getTemperature(_channel, callback) {
        callback(null, 20);
      },
    },
  };
}

describe('Luxtronik2Accessory', () => {
  it('configures AccessoryInformation and TemperatureSensor services', () => {
    const platform = createMockPlatform();
    const accessory = createMockAccessory();
    const sensor = {name: 'Outdoor Temperature', channel: 5};

    new Luxtronik2Accessory(platform, accessory, sensor);

    assert.equal(accessory.displayName, 'Outdoor Temperature');
    assert.deepEqual(accessory.context.sensor, sensor);

    const informationService = accessory.getService(Service.AccessoryInformation);
    assert.equal(informationService.getCharacteristic(Characteristic.Manufacturer).value, 'Luxtronik');
    assert.equal(informationService.getCharacteristic(Characteristic.Model).value, 'Luxtronik2');
    assert.equal(
      informationService.getCharacteristic(Characteristic.FirmwareRevision).value,
      packageFile.version,
    );
    assert.equal(
      informationService.getCharacteristic(Characteristic.SerialNumber).value,
      '192.168.1.10:5',
    );

    const temperatureService = accessory.getService(Service.TemperatureSensor);
    const currentTemperature = temperatureService.getCharacteristic(Characteristic.CurrentTemperature);
    const statusActive = temperatureService.getCharacteristic(Characteristic.StatusActive);

    assert.deepEqual(currentTemperature.props, {minValue: -50, maxValue: 100});
    assert.equal(typeof currentTemperature.handlers.get('get'), 'function');
    assert.equal(typeof statusActive.handlers.get('get'), 'function');
  });
});