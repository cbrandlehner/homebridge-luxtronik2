'use strict';

const {PLUGIN_NAME, PLATFORM_NAME, LEGACY_ACCESSORY_ALIAS} = require('./constants.js');

/**
 * Check whether a Homebridge accessory entry belongs to this plugin.
 *
 * @param {object} accessory
 * @returns {boolean}
 */
function isLegacyLuxtronikAccessory(accessory) {
  return accessory?.accessory === LEGACY_ACCESSORY_ALIAS
    || accessory?.accessory === `${PLUGIN_NAME}.temperature`;
}

/**
 * Extract sensor definitions from a legacy accessory entry.
 *
 * @param {object} accessory
 * @returns {Array<{name: string, channel: number}>}
 */
function extractSensorsFromAccessory(accessory) {
  if (Array.isArray(accessory.sensors) && accessory.sensors.length > 0) {
    return accessory.sensors.map(sensor => ({
      name: sensor.name ?? accessory.name ?? 'Luxtronik2',
      channel: Number(sensor.channel ?? sensor.Channel ?? 5),
    }));
  }

  return [{
    name: accessory.name ?? 'Luxtronik2',
    channel: Number(accessory.Channel ?? 5),
  }];
}

/**
 * Convert a legacy accessory entry to a platform config block.
 *
 * @param {object} accessory
 * @returns {object}
 */
function accessoryToPlatform(accessory) {
  const sensors = extractSensorsFromAccessory(accessory);
  const platform = {
    platform: PLATFORM_NAME,
    name: accessory.name ?? 'Luxtronik2',
    IP: accessory.IP,
    Port: Number(accessory.Port ?? 8888),
    sensors,
  };

  if (sensors.length === 1 && accessory.Channel !== undefined && !accessory.sensors)
    platform.Channel = sensors[0].channel;

  return platform;
}

/**
 * Merge legacy accessories into platform entries grouped by controller endpoint.
 *
 * @param {object} config - Parsed Homebridge config.json.
 * @returns {{config: object, migrated: number, changed: boolean}}
 */
function migrateHomebridgeConfig(config) {
  const nextConfig = structuredClone(config);
  nextConfig.platforms = Array.isArray(nextConfig.platforms) ? nextConfig.platforms : [];
  nextConfig.accessories = Array.isArray(nextConfig.accessories) ? nextConfig.accessories : [];

  const legacyAccessories = nextConfig.accessories.filter(isLegacyLuxtronikAccessory);
  if (legacyAccessories.length === 0)
    return {config: nextConfig, migrated: 0, changed: false};

  const remainingAccessories = nextConfig.accessories.filter(accessory => !isLegacyLuxtronikAccessory(accessory));
  const groupedPlatforms = new Map();

  for (const accessory of legacyAccessories) {
    const ip = accessory.IP;
    const port = Number(accessory.Port ?? 8888);
    const key = `${ip}:${port}`;
    const sensors = extractSensorsFromAccessory(accessory);

    if (!groupedPlatforms.has(key)) {
      groupedPlatforms.set(key, {
        platform: PLATFORM_NAME,
        name: accessory.name ?? 'Luxtronik2',
        IP: ip,
        Port: port,
        sensors: [...sensors],
      });
      continue;
    }

    const platform = groupedPlatforms.get(key);
    for (const sensor of sensors) {
      const duplicateSensor = platform.sensors.some(
        existing => existing.name === sensor.name && existing.channel === sensor.channel,
      );
      if (!duplicateSensor)
        platform.sensors.push(sensor);
    }
  }

  const migratedPlatforms = [...groupedPlatforms.values()];
  const existingPlatformKeys = new Set(
    nextConfig.platforms
      .filter(platform => platform.platform === PLATFORM_NAME)
      .map(platform => `${platform.IP}:${Number(platform.Port ?? 8888)}`),
  );

  for (const platform of migratedPlatforms) {
    const key = `${platform.IP}:${platform.Port}`;
    if (existingPlatformKeys.has(key))
      continue;

    nextConfig.platforms.push(platform);
    existingPlatformKeys.add(key);
  }

  nextConfig.accessories = remainingAccessories;

  return {
    config: nextConfig,
    migrated: legacyAccessories.length,
    changed: true,
  };
}

module.exports = {
  accessoryToPlatform,
  extractSensorsFromAccessory,
  isLegacyLuxtronikAccessory,
  migrateHomebridgeConfig,
};