#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./build-novnc-port');

const target = process.argv[2] || '';
if (!/^(?:tcp|tls):\/\/(?:\[[^\]/?#@\s]+\]|[^\/:?#@\s]+):[1-9]\d{0,4}$/.test(target)) {
  throw new Error('usage: npm run configure:novnc-port -- tcp://host:port (or tls://host:port)');
}
const port = Number(target.slice(target.lastIndexOf(':') + 1));
if (port > 65535) throw new Error('port must be between 1 and 65535');
const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'scripts', 'novnc-plugin-entry.js');
const source = fs.readFileSync(entry, 'utf8');
const targetPattern = /openVncBridge\(\{ target: '(?:tcp|tls):\/\/[^']+' \}\)/;
if (!targetPattern.test(source)) {
  throw new Error('noVNC entry does not contain a configurable strict target');
}
const updated = source.replace(
  targetPattern,
  `openVncBridge({ target: '${target}' })`,
);
if (updated !== source) fs.writeFileSync(entry, updated);
build();
console.log(`${updated === source ? 'kept' : 'configured'} noVNC verification port for ${target}`);
