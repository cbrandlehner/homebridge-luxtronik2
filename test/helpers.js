'use strict';

const {Buffer} = require('node:buffer');

const COMMAND_CONFIRM = 3004;
const HEADER_SIZE = 12;

/**
 * Build a Luxtronik2 protocol response buffer for tests.
 *
 * @param {number[]} rawValues - Raw int32 channel values from the controller.
 * @returns {Buffer}
 */
function buildLuxtronikResponse(rawValues) {
  const count = rawValues.length;
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt32BE(COMMAND_CONFIRM, 0);
  header.writeUInt32BE(0, 4);
  header.writeUInt32BE(count, 8);

  const body = Buffer.alloc(count * 4);
  for (let i = 0; i < count; i++)
    body.writeInt32BE(rawValues[i], i * 4);

  return Buffer.concat([header, body]);
}

/**
 * Create raw values with outdoor temperature (Temperatur_TA) at compacted channel 5.
 *
 * @param {number} rawTaValue - Raw value for Temperatur_TA (e.g. 289 -> 28.9 C).
 * @param {number} [channelCount=200]
 * @returns {number[]}
 */
function rawValuesWithOutdoorTemperature(rawTaValue, channelCount = 200) {
  const rawValues = Array.from({length: channelCount}, () => 0);
  rawValues[15] = rawTaValue;
  return rawValues;
}

module.exports = {
  buildLuxtronikResponse,
  rawValuesWithOutdoorTemperature,
};
