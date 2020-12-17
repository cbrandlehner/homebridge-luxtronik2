[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[![node](https://img.shields.io/node/v/gh-badges.svg)](https://github.com/cbrandlehner/homebridge-luxtronik2)
[![npm](https://img.shields.io/npm/dt/homebridge-luxtronik2.svg)](https://www.npmjs.com/package/homebridge-luxtronik2)
[![npm](https://img.shields.io/npm/l/homebridge-luxtronik2.svg)](https://github.com/cbrandlehner/homebridge-luxtronik2/blob/master/LICENSE)
[![Build Status](https://travis-ci.com/cbrandlehner/homebridge-luxtronik2.svg?branch=master)](https://travis-ci.com/cbrandlehner/homebridge-luxtronik2)
![Node CI](https://github.com/cbrandlehner/homebridge-luxtronik2/workflows/Node%20CI/badge.svg)
![CodeQL](https://github.com/cbrandlehner/homebridge-luxtronik2/workflows/CodeQL/badge.svg)

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
