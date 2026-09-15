#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./build-novnc-port');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'scripts', 'novnc-plugin-entry.js');
const defaultTarget = 'tcp://127.0.0.1:59999';
const source = fs.readFileSync(entry, 'utf8');
const targetPattern = /openVncBridge\(\{ target: '(?:tcp|tls):\/\/[^']+' \}\)/;
if (!targetPattern.test(source)) {
  throw new Error('noVNC entry does not contain a resettable strict target');
}
const updated = source.replace(
  targetPattern,
  `openVncBridge({ target: '${defaultTarget}' })`,
);
if (updated !== source) fs.writeFileSync(entry, updated);
build();
console.log(`${updated === source ? 'kept' : 'reset'} noVNC verification port to ${defaultTarget}`);
