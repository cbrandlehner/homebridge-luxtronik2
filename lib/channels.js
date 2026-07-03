'use strict';

const channellist = require('./channellist.json');

/**
 * Build compacted channel metadata in the same order as translate().
 *
 * @returns {Array<{index: number, name: string, dp?: string}>}
 */
function buildCompactedChannels() {
  const channels = [];
  const keys = Object.keys(channellist).map(Number).sort((a, b) => a - b);
  const maxKey = keys.at(-1) ?? 0;

  for (let i = 0; i <= maxKey; i++) {
    const entry = channellist[i];
    if (!entry?.name || entry.type === 'ignore')
      continue;

    channels.push({
      index: channels.length,
      name: entry.name,
      dp: entry.dp,
    });
  }

  return channels;
}

const compactedChannels = buildCompactedChannels();
const temperatureChannels = compactedChannels.filter(channel => channel.dp === 'TEMPERATURE');
const channelByIndex = new Map(compactedChannels.map(channel => [channel.index, channel]));

/**
 * @returns {Array<{index: number, name: string, dp?: string}>}
 */
function getCompactedChannels() {
  return compactedChannels;
}

/**
 * Return temperature channels exposed in the config UI.
 *
 * @returns {Array<{index: number, name: string}>}
 */
function getTemperatureChannels() {
  return temperatureChannels;
}

/**
 * Resolve a channel label for logging.
 *
 * @param {number} channel
 * @returns {string}
 */
function getChannelLabel(channel) {
  const match = channelByIndex.get(channel);
  return match ? `${match.name} (${channel})` : `channel ${channel}`;
}

module.exports = {
  getChannelLabel,
  getCompactedChannels,
  getTemperatureChannels,
};