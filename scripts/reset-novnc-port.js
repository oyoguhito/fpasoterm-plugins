#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./build-novnc-port');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'scripts', 'novnc-plugin-entry.js');
const defaultTarget = 'tcp://127.0.0.1:59999';
const source = fs.readFileSync(entry, 'utf8');
const updated = source.replace(
  /openVncBridge\(\{ target: '(?:tcp|tls):\/\/[^']+' \}\)/,
  `openVncBridge({ target: '${defaultTarget}' })`,
);
if (updated === source) throw new Error('noVNC entry does not contain a resettable strict target');
fs.writeFileSync(entry, updated);
build();
console.log(`reset noVNC verification port to ${defaultTarget}`);
