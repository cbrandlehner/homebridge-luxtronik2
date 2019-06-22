[![node](https://img.shields.io/node/v/gh-badges.svg)](https://img.shields.io/npm/dm/homebridge-luxtronik2.svg?style=flat)
[![npm](https://img.shields.io/npm/dt/homebridge-luxtronik2.svg)](https://www.npmjs.com/package/homebridge-luxtronik2)
[![npm](https://img.shields.io/npm/l/homebridge-luxtronik2.svg)](https://www.npmjs.com/package/homebridge-luxtronik2)
[![Build Status](https://travis-ci.com/cbrandlehner/homebridge-luxtronik2.svg?branch=master)](https://travis-ci.com/cbrandlehner/homebridge-luxtronik2)

# homebridge-luxtronik2

This plugin for Homebridge adds a temperature sensor. The temperature is the outside temperature measured by a Luxtronik2 based heat pump controller (Siemens, Novelan, Wolf, Alpha Innotec).

## Install guide
First follow the instructions to install [Homebridge](https://github.com/nfarina/homebridge)

This plugin can be installed using [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x#readme) or manually by following these steps:

```bash
npm install -g homebridge-luxtronik2
```

Now you will have to setup your config.json for homebridge. An example is included in this repo.
If you are using [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x#readme) you can edit the configuration on the CONFIG tab.

## USAGE
A temperature sensor should appear on your iOS device as accessory in the "HOME" app.

## Change-log
2019.18.1:

Added config.schema.json to allow configuration using [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x#readme)

Simplified configuration by removing the service type

Disabled Debug output

Updated versions of dependencies in package.json

2019.18.2:

Updated README.md

2019.18.3:

Fixed issue with negative temperatures showing as 0°C

2019.25.1:

Rewrote some code to improve stability and security.
