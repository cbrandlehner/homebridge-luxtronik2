/* eslint no-bitwise: ["warn", { "allow": [">>","&"] }] */

// Convert an integer into IP address
exports.int2ip = function (int) {
  const part1 = int & 255;
  const part2 = ((int >> 8) & 255);
  const part3 = ((int >> 16) & 255);
  const part4 = ((int >> 24) & 255);
  return part4 + '.' + part3 + '.' + part2 + '.' + part1;
  };

exports.isset = function (v) {
  //
  return v !== undefined;
};
