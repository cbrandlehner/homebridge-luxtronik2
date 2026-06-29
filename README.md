[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[![node-current](https://img.shields.io/node/v/homebridge-luxtronik2)](https://github.com/cbrandlehner/homebridge-luxtronik2)
[![npm](https://img.shields.io/npm/dt/homebridge-luxtronik2.svg)](https://www.npmjs.com/package/homebridge-luxtronik2)
[![npm](https://img.shields.io/npm/l/homebridge-luxtronik2.svg)](https://github.com/cbrandlehner/homebridge-luxtronik2/blob/master/LICENSE)

![Node CI](https://github.com/cbrandlehner/homebridge-luxtronik2/workflows/Node%20CI/badge.svg)
![CodeQL](https://github.com/cbrandlehner/homebridge-luxtronik2/workflows/CodeQL/badge.svg)


# homebridge-luxtronik2

This plugin for [Homebridge](https://github.com/nfarina/homebridge) adds temperature sensors for Luxtronik2-based heat pump controllers (Siemens, Novelan, Wolf, Alpha Innotec).

The plugin reads data over the Luxtronik2 TCP API on port 8888.

Newer Luxtronik devices use a different API and are not supported. For those devices, use [this plugin](https://github.com/Bouni/luxtronik).

## Install

Install and configure [Homebridge](https://github.com/nfarina/homebridge) and [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x#readme).

Open the configuration UI, search for "Luxtronik2", and install the plugin.

Restart Homebridge after configuration changes.

## Usage

Each configured sensor appears as a separate **Temperature Sensor** accessory in the Home app.

The plugin exposes:

- `CurrentTemperature` — updated when HomeKit polls the accessory
- `StatusActive` — `false` until the first successful controller read, then `false` again after connection failures

All sensors on the same controller share one TCP client. Requests are serialized so multiple sensors do not open overlapping connections.

## Configuration

Version 2.0.0 is a **platform plugin**. Add one entry under `"platforms"` in `config.json`.

Examples:

- [sample-config.json](sample-config.json) — multi-sensor platform
- [sample-config.single-sensor.json](sample-config.single-sensor.json) — single sensor

### Example

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

For one sensor, use a `sensors` array with a single entry. See [sample-config.single-sensor.json](sample-config.single-sensor.json).

### Configuration reference

| Field | Required | Type | Default | Description |
|-------|----------|------|---------|-------------|
| `platform` | yes | string | — | Must be `homebridge-luxtronik2` |
| `name` | yes | string | `Luxtronik2` | Platform label in Homebridge |
| `IP` | yes | string | — | Controller IP address |
| `Port` | yes | integer | `8888` | Controller TCP port |
| `sensors` | yes | array | — | One or more sensors to expose |
| `sensors[].name` | yes | string | — | HomeKit accessory name |
| `sensors[].channel` | yes | integer | — | Compacted temperature channel index |

### Channel numbers

`channel` values are **compacted indices** produced by the plugin decoder. They are **not** the raw keys from `lib/channellist.json`.

The config UI and schema list the most common temperature channels:

| Channel | Sensor name |
|---------|-------------|
| 0 | Temperatur_TVL |
| 1 | Temperatur_TRL |
| 2 | Sollwert_TRL_HZ |
| 3 | Temperatur_TRL_ext |
| 4 | Temperatur_THG |
| 5 | Temperatur_TA |
| 6 | Mitteltemperatur |
| 7 | Temperatur_TBW |
| 8 | Einst_BWS_akt |
| 9 | Temperatur_TWE |
| 10 | Temperatur_TWA |
| 11 | Temperatur_TFB1 |
| 12 | Sollwert_TVL_MK |
| 13 | Temperatur_RFV |
| 14 | Temperatur_TFB2 |
| 15 | Sollwert_TVL_MK2 |
| 16 | Temperatur_TSK |
| 17 | Temperatur_TSS |
| 18 | Temperatur_TEE |

Additional temperature channels from `channellist.json` can be used manually in `config.json` if needed.

## Migrating from 1.x

Version 2.x is a **platform-only** plugin. It does not load `"accessory": "homebridge-luxtronik2.temperature"` entries.

If your `config.json` still shows the old accessory block, that is expected until you migrate it. The plugin will not update `config.json` automatically.

### Migrate with the included script

Run this once against your Homebridge config:

```bash
npm run migrate-config -- /path/to/homebridge/config.json
```

Or:

```bash
node scripts/migrate-config.js /path/to/homebridge/config.json
```

For Docker/Portainer setups, the path is often `/homebridge/config.json` inside the container, or `~/docker/homebridge/config.json` on the host.

The script:

- Finds `"accessory": "homebridge-luxtronik2.temperature"` entries
- Creates equivalent `"platform": "homebridge-luxtronik2"` blocks
- Groups multiple old accessories on the same IP/port into one platform with a `sensors` array
- Removes the migrated accessory entries
- Leaves unrelated accessories untouched

Restart Homebridge after migrating.

### Manual migration

#### Before (1.x)

```json
{
  "accessories": [
    {
      "accessory": "homebridge-luxtronik2.temperature",
      "name": "Luxtronik2",
      "IP": "192.168.1.10",
      "Port": 8888,
      "Channel": 5
    }
  ]
}
```

### After (2.x)

```json
{
  "platforms": [
    {
      "platform": "homebridge-luxtronik2",
      "name": "Luxtronik2",
      "IP": "192.168.1.10",
      "Port": 8888,
      "sensors": [
        { "name": "Luxtronik2", "channel": 5 }
      ]
    }
  ]
}
```

Manual migration steps:

1. Remove the old `"accessories"` entry with `"accessory": "homebridge-luxtronik2.temperature"`.
2. Add the equivalent `"platforms"` entry shown above.
3. Restart Homebridge.
4. Remove stale accessories from the Home app if Homebridge shows duplicates.

To expose multiple temperatures from one controller, add more entries to `sensors`.

## Homebridge Config UI still shows the old accessory?

The UI reads the **installed plugin files**, not just `config.json`.

If you still see `homebridge-luxtronik2.temperature` as an accessory option, one of these is usually the cause:

1. **Stale plugin code in `node_modules`** — an older build that still registered the legacy accessory type
2. **Old version pin** — `~/docker/homebridge/package.json` still listing `"homebridge-luxtronik2": "1.6.1"`
3. **Cached UI metadata** — restart Homebridge after updating the plugin

After upgrading, confirm the installed plugin contains:

- `config.schema.json` with `"pluginType": "platform"`
- `index.js` that only calls `registerPlatform(...)`

Then restart Homebridge (and refresh the Config UI).

## Troubleshooting

- Confirm the controller is reachable on port 8888.
- Enable Homebridge debug logging with `homebridge -D`.
- Check that `StatusActive` becomes `true` after the first successful read.
- Verify `IP`, `Port`, and `channel` values. `Port` and `channel` must be numbers, not strings.

## Development

```bash
npm test
```

Tests run JSON validation and Node.js unit tests for protocol parsing, config normalization, and the TCP client.