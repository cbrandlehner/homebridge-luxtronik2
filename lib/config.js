'use strict';

const {
  DEFAULT_CHANNEL,
  DEFAULT_IP,
  DEFAULT_PORT,
} = require('./constants.js');
const {getTemperatureChannels} = require('./channels.js');

const validTemperatureChannels = new Set(
  getTemperatureChannels().map(channel => channel.index),
);

/**
 * Normalize a single sensor entry from platform config.
 *
 * @param {object} sensor
 * @param {number} fallbackChannel
 * @param {string} fallbackName
 * @returns {{name: string, channel: number}}
 */
function normalizeSensor(sensor, fallbackChannel, fallbackName) {
  const name = typeof sensor?.name === 'string' && sensor.name.trim()
    ? sensor.name.trim()
    : fallbackName;
  const channel = Number(sensor?.channel ?? sensor?.Channel ?? fallbackChannel);

  if (!Number.isInteger(channel) || !validTemperatureChannels.has(channel))
    throw new Error(`Invalid channel ${sensor?.channel ?? sensor?.Channel} for sensor "${name}"`);

  return {name, channel};
}

/**
 * Normalize platform config into connection details and sensor definitions.
 *
 * Supports the legacy single-channel `Channel` field for easier migration.
 *
 * @param {object} config - Homebridge platform config block.
 * @param {object} log - Homebridge logger.
 * @returns {{ip: string, port: number, platformName: string, sensors: Array<{name: string, channel: number}>}}
 */
function normalizePlatformConfig(config, log) {
  const platformName = typeof config?.name === 'string' && config.name.trim()
    ? config.name.trim()
    : 'Luxtronik2';

  const ip = typeof config?.IP === 'string' && config.IP.trim()
    ? config.IP.trim()
    : DEFAULT_IP;

  if (!config?.IP)
    log.error('Platform config is missing "IP"; using %s', ip);

  const port = Number(config?.Port ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`Invalid Port: ${config?.Port}`);

  if (config?.Port === undefined)
    log.error('Platform config is missing "Port"; using %s', port);

  let sensors;
  if (Array.isArray(config?.sensors) && config.sensors.length > 0) {
    sensors = config.sensors.map(sensor => normalizeSensor(sensor, DEFAULT_CHANNEL, platformName));
  } else {
    const legacyChannel = Number(config?.Channel ?? DEFAULT_CHANNEL);
    if (!Number.isInteger(legacyChannel) || !validTemperatureChannels.has(legacyChannel))
      throw new Error(`Invalid Channel: ${config?.Channel}`);

    if (!config?.Channel)
      log.error('Platform config is missing "Channel"; using %s', legacyChannel);

    sensors = [{name: platformName, channel: legacyChannel}];
  }

  return {
    ip,
    port,
    platformName,
    sensors,
  };
}

/**
 * Normalize a legacy accessory config block (1.x format).
 *
 * @param {object} config
 * @param {object} log
 * @returns {{name: string, ip: string, port: number, channel: number}}
 */
function normalizeLegacyAccessoryConfig(config, log) {
  const name = typeof config?.name === 'string' && config.name.trim()
    ? config.name.trim()
    : 'Luxtronik2';

  const ip = typeof config?.IP === 'string' && config.IP.trim()
    ? config.IP.trim()
    : DEFAULT_IP;

  if (!config?.IP)
    log.error('Accessory config is missing "IP"; using %s', ip);

  const port = Number(config?.Port ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`Invalid Port: ${config?.Port}`);

  const channel = Number(config?.Channel ?? DEFAULT_CHANNEL);
  if (!Number.isInteger(channel) || !validTemperatureChannels.has(channel))
    throw new Error(`Invalid Channel: ${config?.Channel}`);

  return {name, ip, port, channel};
}

module.exports = {
  normalizeLegacyAccessoryConfig,
  normalizePlatformConfig,
  normalizeSensor,
};