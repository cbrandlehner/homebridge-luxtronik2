'use strict';

const packageFile = require('../package.json');
const {Luxtronik2Client} = require('./luxtronik2-client.js');
const {normalizeLegacyAccessoryConfig} = require('./config.js');
const {getChannelLabel} = require('./channels.js');
const {TemperatureSensorHandler} = require('./sensor-handler.js');
const {LEGACY_ACCESSORY_ALIAS} = require('./constants.js');

let Service;
let Characteristic;

/**
 * Legacy Homebridge accessory plugin (1.x config format).
 *
 * @param {object} log
 * @param {object} config
 */
function Luxtronik2LegacyAccessory(log, config) {
  this.log = log;
  const normalized = normalizeLegacyAccessoryConfig(config, log);

  this.name = normalized.name;
  this.IP = normalized.ip;
  this.Port = normalized.port;
  this.Channel = normalized.channel;
  this.client = Luxtronik2Client.getClient(this.IP, this.Port, log);

  this.log.warn(
    'The accessory plugin format (%s) is deprecated. Migrate to the platform config — see README or run: node scripts/migrate-config.js <path-to-config.json>',
    LEGACY_ACCESSORY_ALIAS,
  );
  this.log.info(
    'Legacy accessory "%s" on %s (%s:%s)',
    this.name,
    getChannelLabel(this.Channel),
    this.IP,
    this.Port,
  );

  this.temperatureService = new Service.TemperatureSensor(this.name);
  this.handler = new TemperatureSensorHandler({
    log: this.log,
    client: this.client,
    sensor: {name: this.name, channel: this.Channel},
    Service,
    Characteristic,
    temperatureService: this.temperatureService,
  });
}

Luxtronik2LegacyAccessory.prototype = {
  getCurrentTemperature(callback) {
    this.handler.getCurrentTemperature(callback);
  },

  getStatusActive(callback) {
    this.handler.getStatusActive(callback);
  },

  identify(callback) {
    this.log.info('Currently there is no way to help identify the Luxtronik2 device!');
    callback();
  },

  getServices() {
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Luxtronik')
      .setCharacteristic(Characteristic.Model, 'Luxtronik2')
      .setCharacteristic(Characteristic.FirmwareRevision, packageFile.version)
      .setCharacteristic(Characteristic.SerialNumber, `${this.IP}:${this.Channel}`);

    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -50,
        maxValue: 100,
      })
      .on('get', this.getCurrentTemperature.bind(this));

    this.temperatureService
      .getCharacteristic(Characteristic.StatusActive)
      .on('get', this.getStatusActive.bind(this));

    return [informationService, this.temperatureService];
  },
};

/**
 * Register the legacy accessory plugin type.
 *
 * @param {object} api
 */
function registerLegacyAccessory(api) {
  Service = api.hap.Service;
  Characteristic = api.hap.Characteristic;
  api.registerAccessory('homebridge-luxtronik2', 'temperature', Luxtronik2LegacyAccessory);
}

module.exports = {
  Luxtronik2LegacyAccessory,
  registerLegacyAccessory,
};