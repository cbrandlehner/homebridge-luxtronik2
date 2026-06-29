[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[![node-current](https://img.shields.io/node/v/homebridge-luxtronik2)](https://github.com/cbrandlehner/homebridge-luxtronik2)
[![npm](https://img.shields.io/npm/dt/homebridge-luxtronik2.svg)](https://www.npmjs.com/package/homebridge-luxtronik2)
[![npm](https://img.shields.io/npm/l/homebridge-luxtronik2.svg)](https://github.com/cbrandlehner/homebridge-luxtronik2/blob/master/LICENSE)

![Node CI](https://github.com/cbrandlehner/homebridge-luxtronik2/workflows/Node%20CI/badge.svg)
![CodeQL](https://github.com/cbrandlehner/homebridge-luxtronik2/workflows/CodeQL/badge.svg)


# homebridge-luxtronik2

This plugin for [HomeBridge](https://github.com/nfarina/homebridge) adds temperature sensors for Luxtronik2-based heat pump controllers (Siemens, Novelan, Wolf, Alpha Innotec).

The plugin reads data over the Luxtronik2 TCP API on port 8888.

Newer Luxtronik devices use a different API and are not supported. For those devices, use [this plugin](https://github.com/Bouni/luxtronik).

## Install

Install and configure [Homebridge](https://github.com/nfarina/homebridge) and [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x#readme).

Open the configuration UI, search for "Luxtronik2", and install the plugin.

Restart Homebridge after configuration changes.

## Configuration

Version 2.0.0 is a **platform plugin**. Configure one controller IP/port and expose one or more temperature sensors from that controller.

```json
{
  "platforms": [
    {
      "platform": "homebridge-luxtronik2",
      "name": "Luxtronik2 Heat Pump",
      "IP": "192.168.1.10",
      "Port": 8888,
      "sensors": [
        {
          "name": "Outdoor Temperature",
          "channel": 5
        },
        {
          "name": "Flow Temperature",
          "channel": 0
        }
      ]
    }
  ]
}
```

### Channel numbers

`channel` values are **compacted indices** produced by the plugin's channel decoder, not raw protocol offsets from `channellist.json`.

Examples:

| Channel | Sensor |
|---------|--------|
| 0 | Temperatur_TVL |
| 5 | Temperatur_TA |
| 10 | Temperatur_TWA |

### Legacy single-sensor config

If you only need one sensor, you can still use the old `Channel` field instead of `sensors`:

```json
{
  "platform": "homebridge-luxtronik2",
  "name": "Luxtronik2",
  "IP": "192.168.1.10",
  "Port": 8888,
  "Channel": 5
}
```

## Migrating from 1.x

1. Remove old accessory entries such as `"accessory": "homebridge-luxtronik2.temperature"`.
2. Add a platform block under `"platforms"` as shown above.
3. Restart Homebridge.

All sensors on the same controller share one TCP client and serialized requests.

## Troubleshooting

- Confirm the controller is reachable on port 8888.
- Enable Homebridge debug logging with `homebridge -D`.
- Check that `StatusActive` becomes `true` after the first successful read.