'use strict';

const packageFile = require('../package.json');
const {getChannelLabel} = require('./channels.js');
const {TemperatureSensorHandler} = require('./sensor-handler.js');

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

    this.handler = new TemperatureSensorHandler({
      log: this.log,
      client: this.platform.client,
      sensor: this.sensor,
      Service,
      Characteristic,
      temperatureService,
    });
  }

  getCurrentTemperature(callback) {
    this.handler.getCurrentTemperature(callback);
  }

  getStatusActive(callback) {
    this.handler.getStatusActive(callback);
  }
}

module.exports = {
  Luxtronik2Accessory,
};