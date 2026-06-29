/**
 * Convert a 32-bit integer to an IPv4 address string.
 *
 * @param {number} int - 32-bit integer representation of an IP address.
 * @returns {string} Dotted-decimal IPv4 address.
 */
exports.int2ip = function (int) {
  const part1 = int & 255;
  const part2 = ((int >> 8) & 255);
  const part3 = ((int >> 16) & 255);
  const part4 = ((int >> 24) & 255);
  return part4 + '.' + part3 + '.' + part2 + '.' + part1;
};

/**
 * Check whether a value is defined.
 *
 * @param {*} value - Value to test.
 * @returns {boolean} True when value is not undefined.
 */
exports.isset = function (value) {
  return value !== undefined;
};