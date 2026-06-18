'use strict';

let Service;
let Characteristic;

const packageFile = require('./package.json');
const {Luxtronik2Client} = require('./lib/luxtronik2-client.js');

/**
 * Initialize a Luxtronik2 Homebridge accessory and prepare its temperature service.
 *
 * Validates configuration keys and applies defaults for missing fields, initializes internal state
 * (CurrentTemperature, counter, temperatureDisplayUnits, firmwareRevision), logs device info,
 * and creates a TemperatureSensor service instance.
 *
 * @param {object} log - Logger object with methods like info, debug, and error.
 * @param {object} config - Accessory configuration.
 * @param {string} [config.IP='127.0.0.1'] - Device IP address.
 * @param {number} [config.Port=8888] - Device TCP port.
 * @param {string} [config.name='Unnamed Luxtronik2'] - Accessory display name.
 * @param {number} [config.Channel=5] - Channel index to read temperature from.
 */
function Luxtronik2(log, config) {
  this.log = log;

  if (config.IP === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "IP"');
    this.IP = '127.0.0.1';
  } else {
    this.IP = config.IP;
  }

  if (config.Port === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "Port"');
    this.Port = 8888;
  } else {
    this.Port = config.Port;
  }

  if (config.name === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "name"');
    this.name = 'Unnamed Luxtronik2';
  } else {
    this.name = config.name;
  }

  if (config.Channel === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "Channel"');
    this.Channel = 5;
  } else {
    this.Channel = config.Channel;
  }

  this.log.debug('Config: IP is %s', this.IP);
  this.log.debug('Config: Port is %s', this.Port);
  this.log.debug('Config: name is %s', this.name);
  this.log.debug('Config: Channel is %s', this.Channel);

  this.CurrentTemperature = 0;
  this.statusActive = false;
  this.hasValidReading = false;
  this.counter = 1;
  this.client = Luxtronik2Client.getClient(this.IP, this.Port, this.log);

  this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
  this.firmwareRevision = packageFile.version;
  this.log.info('Luxtronik2 IP is %s', this.IP);
  this.log.info('Luxtronik2 Port is %s', this.Port);
  this.log.info('Luxtronik2 Name is %s', this.name);
  this.log.debug('Homebridge debug enabled');
  this.temperatureService = new Service.TemperatureSensor(this.name);
}

Luxtronik2.prototype = {

  getTemperature(callback) {
    this.log.debug('getTemperature was called');
    this.client.getTemperature(this.Channel, callback);
  },

  getCurrentTemperature(callback) {
    const counter = ++this.counter;
    this.log.debug(
      'getCurrentTemperature: early callback with cached CurrentTemperature: %s (%d).',
      this.CurrentTemperature,
      counter,
    );
    callback(null, this.CurrentTemperature);

    this.getTemperature((error, temperature) => {
      if (error) {
        this.statusActive = false;
        this.temperatureService.getCharacteristic(Characteristic.StatusActive).updateValue(false);
        this.log.warn('getCurrentTemperature: failed to update (%d): %s', counter, error.message);
        return;
      }

      this.hasValidReading = true;
      this.statusActive = true;
      this.CurrentTemperature = temperature;
      this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(temperature);
      this.temperatureService.getCharacteristic(Characteristic.StatusActive).updateValue(true);
      this.log.debug('getCurrentTemperature: update CurrentTemperature: %s (%d).', temperature, counter);
    });
  },

  getStatusActive(callback) {
    callback(null, this.statusActive);
  },

  identify(callback) {
    this.log.info('Currently there is no way to help identify the Luxtronik2 device!');
    callback();
  },

  getServices() {
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'homebridge-luxtronik2')
      .setCharacteristic(Characteristic.Model, 'Luxtronik2')
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmwareRevision)
      .setCharacteristic(Characteristic.SerialNumber, this.name);
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: Number.parseFloat('-50'),
        maxValue: Number.parseFloat('100'),
      })
      .on('get', this.getCurrentTemperature.bind(this));
    this.temperatureService
      .getCharacteristic(Characteristic.StatusActive)
      .on('get', this.getStatusActive.bind(this));

    return [informationService, this.temperatureService];
  },
};

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-luxtronik2', 'temperature', Luxtronik2);
};
