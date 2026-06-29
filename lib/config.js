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
 * Supports a single-channel `Channel` field when `sensors` is omitted.
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

  if (!Array.isArray(config?.sensors) || config.sensors.length === 0)
    throw new Error('Platform config must include a non-empty "sensors" array');

  const sensors = config.sensors.map(sensor => normalizeSensor(sensor, DEFAULT_CHANNEL, platformName));

  return {
    ip,
    port,
    platformName,
    sensors,
  };
}

module.exports = {
  normalizePlatformConfig,
  normalizeSensor,
};