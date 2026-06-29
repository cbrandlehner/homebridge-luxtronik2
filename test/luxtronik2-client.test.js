'use strict';

const assert = require('node:assert/strict');
const net = require('node:net');
const {Buffer} = require('node:buffer');
const {describe, it, before, after} = require('node:test');
const {parseResponse, translate, Luxtronik2Client} = require('../lib/luxtronik2-client.js');
const {buildLuxtronikResponse, rawValuesWithOutdoorTemperature} = require('./helpers.js');

const IP_192_168_1_100 = 3_232_235_876;

function zeros(length) {
  return Array.from({length}, () => 0);
}

describe('translate', () => {
  it('omits ignored channels from the compacted result', () => {
    const rawValues = zeros(11);
    rawValues[10] = 123;

    const items = translate(rawValues);

    assert.equal(items.length, 1);
    assert.equal(items[0], 12.3);
  });

  it('maps Temperatur_TA to compacted channel 5', () => {
    const items = translate(rawValuesWithOutdoorTemperature(289));

    assert.equal(items[5], 28.9);
  });

  it('converts ip channels', () => {
    const rawValues = zeros(92);
    rawValues[91] = IP_192_168_1_100;

    const items = translate(rawValues);

    assert.equal(items[81], '192.168.1.100');
  });

  it('converts enum channels', () => {
    const rawValues = zeros(120);
    rawValues[119] = 0;

    const items = translate(rawValues);

    assert.equal(items[109], 'Heizbetrieb');
  });
});

describe('parseResponse', () => {
  it('parses a valid controller response', () => {
    const buffer = buildLuxtronikResponse(rawValuesWithOutdoorTemperature(155));
    const items = parseResponse(buffer);

    assert.equal(items[5], 15.5);
  });

  it('throws when the buffer is too short', () => {
    assert.throws(
      () => parseResponse(Buffer.alloc(8)),
      error => error.message.includes('too short'),
    );
  });

  it('throws when the controller does not confirm the command', () => {
    const buffer = buildLuxtronikResponse([0]);
    buffer.writeUInt32BE(9999, 0);

    assert.throws(
      () => parseResponse(buffer),
      error => error.message.includes('did not confirm command'),
    );
  });

  it('throws when the payload length does not match the header', () => {
    const buffer = buildLuxtronikResponse([0, 0, 0]);
    buffer.writeUInt32BE(1, 8);

    assert.throws(
      () => parseResponse(buffer),
      error => error.message.includes('Unexpected response length'),
    );
  });
});

describe('Luxtronik2Client', () => {
  const noopLog = {
    debug: Function.prototype,
    warn: Function.prototype,
    error: Function.prototype,
  };

  /**
   * @param {Buffer} response
   * @returns {Promise<{server: import('node:net').Server, port: number}>}
   */
  function startMockServer(response) {
    return new Promise((resolve, reject) => {
      const server = net.createServer(socket => {
        socket.on('data', () => {
          socket.write(response);
        });
      });

      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const {port} = server.address();
        resolve({server, port});
      });
    });
  }

  /**
   * @param {import('node:net').Server} server
   * @returns {Promise<void>}
   */
  function closeMockServer(server) {
    return new Promise((resolve, reject) => {
      server.close(error => {
        if (error)
          reject(error);
        else
          resolve();
      });
    });
  }

  /**
   * @param {number} port
   * @param {number} channel
   * @returns {Promise<number>}
   */
  function readTemperature(port, channel) {
    return new Promise((resolve, reject) => {
      const client = Luxtronik2Client.getClient('127.0.0.1', port, noopLog);
      client.timeoutMs = 2000;
      client.getTemperature(channel, (error, temperature) => {
        if (error)
          reject(error);
        else
          resolve(temperature);
      });
    });
  }

  let mockServer;
  let mockPort;

  before(async () => {
    const response = buildLuxtronikResponse(rawValuesWithOutdoorTemperature(289));
    const started = await startMockServer(response);
    mockServer = started.server;
    mockPort = started.port;
  });

  after(async () => {
    await closeMockServer(mockServer);
  });

  it('reads a temperature channel over TCP', async () => {
    const temperature = await readTemperature(mockPort, 5);
    assert.equal(temperature, 28.9);
  });

  it('returns an error for an out-of-range channel', async () => {
    await assert.rejects(
      readTemperature(mockPort, 999),
      error => error.message.includes('out of range'),
    );
  });

  it('serializes concurrent requests for the same endpoint', async () => {
    let activeConnections = 0;
    let maxActiveConnections = 0;

    const response = buildLuxtronikResponse(rawValuesWithOutdoorTemperature(200));
    const queuedServer = net.createServer(socket => {
      activeConnections++;
      maxActiveConnections = Math.max(maxActiveConnections, activeConnections);

      socket.on('data', () => {
        setTimeout(() => {
          socket.write(response);
          activeConnections--;
          socket.end();
        }, 50);
      });
    });

    await new Promise((resolve, reject) => {
      queuedServer.on('error', reject);
      queuedServer.listen(0, '127.0.0.1', resolve);
    });

    const {port} = queuedServer.address();

    try {
      const [first, second] = await Promise.all([
        readTemperature(port, 5),
        readTemperature(port, 5),
      ]);

      assert.equal(first, 20);
      assert.equal(second, 20);
      assert.equal(maxActiveConnections, 1);
    } finally {
      await closeMockServer(queuedServer);
    }
  });

  it('returns an error when the connection times out', async () => {
    const silentServer = net.createServer(socket => {
      socket.on('data', () => undefined);
    });

    await new Promise((resolve, reject) => {
      silentServer.on('error', reject);
      silentServer.listen(0, '127.0.0.1', resolve);
    });

    const {port} = silentServer.address();

    try {
      await assert.rejects(
        () => new Promise((resolve, reject) => {
          const client = Luxtronik2Client.getClient('127.0.0.1', port, noopLog);
          client.timeoutMs = 100;
          client.getTemperature(5, (error, temperature) => {
            if (error)
              reject(error);
            else
              resolve(temperature);
          });
        }),
        error => error.message.includes('Connection timeout'),
      );
    } finally {
      await closeMockServer(silentServer);
    }
  });
});
