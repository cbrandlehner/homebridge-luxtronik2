'use strict';

const packageFile = require('../package.json');
const {getChannelLabel} = require('./channels.js');

class Luxtronik2Accessory {
  /**
   * @param {import('./platform.js').Luxtronik2Platform} platform
   * @param {object} accessory - Homebridge PlatformAccessory instance.
   * @param {{name: string, channel: number}} sensor
   */
  constructor(platform, accessory, sensor) {
    this.platform = platform;
    this.accessory = accessory;
    this.sensor = sensor;
    this.log = platform.log;
    this.client = platform.client;

    this.currentTemperature = 0;
    this.statusActive = false;
    this.counter = 1;

    accessory.context.sensor = sensor;
    accessory.displayName = sensor.name;

    this.log.info(
      'Configured sensor "%s" on %s (%s:%s)',
      sensor.name,
      getChannelLabel(sensor.channel),
      platform.ip,
      platform.port,
    );

    this._configureServices();
  }

  _configureServices() {
    const {Service, Characteristic} = this.platform;

    const informationService = this.accessory.getService(Service.AccessoryInformation)
      ?? this.accessory.addService(Service.AccessoryInformation);

    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Luxtronik')
      .setCharacteristic(Characteristic.Model, 'Luxtronik2')
      .setCharacteristic(Characteristic.FirmwareRevision, packageFile.version)
      .setCharacteristic(Characteristic.SerialNumber, `${this.platform.ip}:${this.sensor.channel}`);

    const temperatureService = this.accessory.getService(Service.TemperatureSensor)
      ?? this.accessory.addService(Service.TemperatureSensor);

    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -50,
        maxValue: 100,
      })
      .on('get', this.getCurrentTemperature.bind(this));

    temperatureService
      .getCharacteristic(Characteristic.StatusActive)
      .on('get', this.getStatusActive.bind(this));

    this.temperatureService = temperatureService;
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
        this.temperatureService.getCharacteristic(this.platform.Characteristic.StatusActive).updateValue(false);
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
      this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature).updateValue(temperature);
      this.temperatureService.getCharacteristic(this.platform.Characteristic.StatusActive).updateValue(true);
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
  Luxtronik2Accessory,
};