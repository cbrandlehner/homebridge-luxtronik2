/* eslint no-bitwise: ["warn", { "allow": ["~"] }] */
exports.int2ip = function (v) {
  const part1 = v & 255;
  const part2 = ((v >> 8) & 255);
  const part3 = ((v >> 16) & 255);
  const part4 = ((v >> 24) & 255);
  return part4 + '.' + part3 + '.' + part2 + '.' + part1;
  };

exports.isset = function (v) {
  return (typeof v) !== 'undefined';
};
