# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [2.1.3] - 2026-07-03

### Added

- **Auto-migration on plugin load** ([#264](https://github.com/cbrandlehner/homebridge-luxtronik2/issues/264)) — Legacy `homebridge-luxtronik2.temperature` accessory entries in `config.json` are migrated to platform config automatically when the plugin starts. A legacy accessory shim prevents the recurring startup error until Homebridge is restarted.
- **`lib/auto-migrate-config.js`** — Reads and writes `config.json` via `api.user.configPath()`, reusing `migrateHomebridgeConfig()`.
- **`lib/legacy-accessory.js`** — No-op shim for deprecated v1.x accessory entries still present in the in-memory config on the first boot after upgrade.
- **`test/auto-migrate-config.test.js`**, **`test/legacy-accessory.test.js`** — Coverage for file-based migration and the legacy shim.

## [2.1.2] - 2026-07-03

### Changed

Behavior-preserving internal refactor. No user-visible changes to HomeKit characteristics, config validation, migration output, or TCP protocol handling.

#### Accessory and sensor handler

- **`lib/accessory.js`** — HomeKit `get` handlers bind directly to `TemperatureSensorHandler` methods instead of passing through wrapper methods on `Luxtronik2Accessory`.
- **`lib/sensor-handler.js`** — Removed unused `Service` constructor parameter.

#### Configuration and constants

- **`lib/config.js`** — JSDoc updated to state that a non-empty `sensors` array is required (matching `config.schema.json` and runtime validation). Behavior unchanged.
- **`lib/constants.js`** — Luxtronik2 protocol constants `COMMAND_CONFIRM` and `HEADER_SIZE` moved here from `lib/luxtronik2-client.js` and `test/helpers.js`.

#### Channel metadata

- **`lib/channels.js`** — Compacted channel list, temperature channel list, and channel-by-index lookup are computed once at module load instead of on every call to `getChannelLabel()` or `getTemperatureChannels()`.

#### Platform discovery

- **`lib/platform.js`** — `discoverDevices()` builds a fresh `Set` of discovered UUIDs on each run and uses it for stale-accessory removal instead of appending to a persistent array and scanning with `includes()`.

#### TCP client

- **`lib/luxtronik2-client.js`** — Socket completion logic consolidated into a single `finalize()` helper that guards against double callbacks and destroys the socket in one place.

#### Utilities

- **`lib/tools.js`** — Export style aligned with the rest of the codebase (`module.exports = { ... }`).

### Added

- **`test/accessory.test.js`** — Verifies AccessoryInformation and TemperatureSensor service wiring (manufacturer, serial number, temperature range, handler registration).
- **`test/platform.test.js`** — Verifies accessory registration, cache restore, config updates, and removal of accessories no longer in config.
- **`test/sensor-handler.test.js`** — Verifies cache-then-update temperature reads, `StatusActive` on success/failure, and status reporting.

### Test coverage

`npm test` now runs **35** tests across **11** suites (previously 28 tests across 8 suites).