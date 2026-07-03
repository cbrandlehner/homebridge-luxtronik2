'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const {TemperatureSensorHandler} = require('../lib/sensor-handler.js');

const Characteristic = {
  CurrentTemperature: 'CurrentTemperature',
  StatusActive: 'StatusActive',
};

/**
 * @param {number} temperature
 * @param {boolean} [shouldFail]
 */
function createMockClient(temperature, shouldFail = false) {
  return {
    getTemperature(channel, callback) {
      if (shouldFail)
        callback(new Error('connection failed'));
      else
        callback(null, temperature);
    },
  };
}

function createMockTemperatureService() {
  const values = new Map();

  return {
    values,
    getCharacteristic(name) {
      if (!values.has(name))
        values.set(name, {value: undefined, updateValue(value) { this.value = value; }});

      return values.get(name);
    },
  };
}

describe('TemperatureSensorHandler', () => {
  it('returns cached temperature immediately and updates characteristics on success', () => {
    const temperatureService = createMockTemperatureService();
    const handler = new TemperatureSensorHandler({
      log: {debug() {}, warn() {}},
      client: createMockClient(21.5),
      sensor: {name: 'Outdoor', channel: 5},
      Characteristic,
      temperatureService,
    });

    let callbackTemperature;
    let callbackError;
    handler.getCurrentTemperature((error, temperature) => {
      callbackError = error;
      callbackTemperature = temperature;
    });

    assert.equal(callbackError, null);
    assert.equal(callbackTemperature, 0);
    assert.equal(temperatureService.getCharacteristic(Characteristic.CurrentTemperature).value, 21.5);
    assert.equal(temperatureService.getCharacteristic(Characteristic.StatusActive).value, true);
    assert.equal(handler.currentTemperature, 21.5);
    assert.equal(handler.statusActive, true);
  });

  it('keeps cached temperature and clears StatusActive on client error', () => {
    const temperatureService = createMockTemperatureService();
    const handler = new TemperatureSensorHandler({
      log: {debug() {}, warn() {}},
      client: createMockClient(18, true),
      sensor: {name: 'Outdoor', channel: 5},
      Characteristic,
      temperatureService,
    });

    handler.currentTemperature = 18;
    handler.statusActive = true;

    let callbackTemperature;
    handler.getCurrentTemperature((error, temperature) => {
      assert.equal(error, null);
      callbackTemperature = temperature;
    });

    assert.equal(callbackTemperature, 18);
    assert.equal(temperatureService.getCharacteristic(Characteristic.StatusActive).value, false);
    assert.equal(handler.currentTemperature, 18);
    assert.equal(handler.statusActive, false);
  });

  it('reports StatusActive from the last read outcome', () => {
    const handler = new TemperatureSensorHandler({
      log: {debug() {}, warn() {}},
      client: createMockClient(10),
      sensor: {name: 'Outdoor', channel: 5},
      Characteristic,
      temperatureService: createMockTemperatureService(),
    });

    handler.statusActive = true;
    handler.getStatusActive((error, active) => {
      assert.equal(error, null);
      assert.equal(active, true);
    });

    handler.statusActive = false;
    handler.getStatusActive((error, active) => {
      assert.equal(error, null);
      assert.equal(active, false);
    });
  });
});