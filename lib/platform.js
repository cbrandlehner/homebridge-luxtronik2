'use strict';

const {Luxtronik2Client} = require('./luxtronik2-client.js');
const {Luxtronik2Accessory} = require('./accessory.js');
const {normalizePlatformConfig} = require('./config.js');
const {PLUGIN_NAME, PLATFORM_NAME} = require('./constants.js');

class Luxtronik2Platform {
  /**
   * @param {object} log - Homebridge logger.
   * @param {object} config - Homebridge platform config block.
   * @param {object} api - Homebridge API.
   */
  constructor(log, config, api) {
    this.log = log;
    this.api = api;
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.accessories = new Map();
    this.discoveredCacheUUIDs = [];

    const normalized = normalizePlatformConfig(config, log);
    this.ip = normalized.ip;
    this.port = normalized.port;
    this.platformName = normalized.platformName;
    this.sensors = normalized.sensors;
    this.client = Luxtronik2Client.getClient(this.ip, this.port, log);

    this.log.info(
      'Luxtronik2 platform "%s" configured for %s:%s with %s sensor(s)',
      this.platformName,
      this.ip,
      this.port,
      this.sensors.length,
    );

    this.api.on('didFinishLaunching', () => {
      this.discoverDevices();
    });
  }

  /**
   * Restore cached accessories from disk.
   *
   * @param {object} accessory - Homebridge PlatformAccessory instance.
   */
  configureAccessory(accessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  discoverDevices() {
    for (const sensor of this.sensors) {
      const uuid = this.api.hap.uuid.generate(`${this.ip}:${this.port}:${sensor.channel}`);
      const existingAccessory = this.accessories.get(uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        existingAccessory.context.sensor = sensor;
        existingAccessory.displayName = sensor.name;
        new Luxtronik2Accessory(this, existingAccessory, sensor);
      } else {
        this.log.info('Adding new accessory:', sensor.name);
        const accessory = new this.api.platformAccessory(sensor.name, uuid);
        accessory.context.sensor = sensor;
        new Luxtronik2Accessory(this, accessory, sensor);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }

      this.discoveredCacheUUIDs.push(uuid);
    }

    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.log.info('Removing accessory no longer configured:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}

module.exports = {
  Luxtronik2Platform,
};