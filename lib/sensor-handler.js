'use strict';

/**
 * Shared temperature sensor behavior for platform accessories.
 */
class TemperatureSensorHandler {
  /**
   * @param {object} options
   * @param {object} options.log
   * @param {import('./luxtronik2-client.js').Luxtronik2Client} options.client
   * @param {{name: string, channel: number}} options.sensor
   * @param {object} options.Service
   * @param {object} options.Characteristic
   * @param {object} options.temperatureService
   */
  constructor({log, client, sensor, Service, Characteristic, temperatureService}) {
    this.log = log;
    this.client = client;
    this.sensor = sensor;
    this.Service = Service;
    this.Characteristic = Characteristic;
    this.temperatureService = temperatureService;

    this.currentTemperature = 0;
    this.statusActive = false;
    this.counter = 1;
  }

  /**
   * @param {(error: Error|null, temperature?: number) => void} callback
   */
  getTemperature(callback) {
    this.log.debug('getTemperature was called for %s', this.sensor.name);
    this.client.getTemperature(this.sensor.channel, callback);
  }

  /**
   * @param {(error: Error|null, temperature?: number) => void} callback
   */
  getCurrentTemperature(callback) {
    const counter = ++this.counter;
    this.log.debug(
      'getCurrentTemperature (%s): early callback with cached value %s (%d)',
      this.sensor.name,
      this.currentTemperature,
      counter,
    );
    callback(null, this.currentTemperature);

    this.getTemperature((error, temperature) => {
      if (error) {
        this.statusActive = false;
        this.temperatureService.getCharacteristic(this.Characteristic.StatusActive).updateValue(false);
        this.log.warn(
          'getCurrentTemperature (%s): failed to update (%d): %s',
          this.sensor.name,
          counter,
          error.message,
        );
        return;
      }

      this.statusActive = true;
      this.currentTemperature = temperature;
      this.temperatureService.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(temperature);
      this.temperatureService.getCharacteristic(this.Characteristic.StatusActive).updateValue(true);
      this.log.debug(
        'getCurrentTemperature (%s): updated to %s (%d)',
        this.sensor.name,
        temperature,
        counter,
      );
    });
  }

  /**
   * @param {(error: Error|null, active?: boolean) => void} callback
   */
  getStatusActive(callback) {
    callback(null, this.statusActive);
  }
}

module.exports = {
  TemperatureSensorHandler,
};