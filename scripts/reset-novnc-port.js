#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./build-novnc-port');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'scripts', 'novnc-plugin-entry.js');
const defaultTarget = 'tcp://127.0.0.1:5900';
const source = fs.readFileSync(entry, 'utf8');
const targetPattern = /openVncBridge\(\{ target: '(?:tcp|tls):\/\/[^']+' \}\)/;
if (!targetPattern.test(source)) {
  throw new Error('noVNC entry does not contain a resettable strict target');
}
const targetUpdated = source.replace(
  targetPattern,
  `openVncBridge({ target: '${defaultTarget}' })`,
);
const compatibilityPattern = /const forceRfb33 = (?:true|false);/;
if (!compatibilityPattern.test(targetUpdated)) {
  throw new Error('noVNC entry does not contain a resettable RFB compatibility mode');
}
const updated = targetUpdated.replace(compatibilityPattern, 'const forceRfb33 = false;');
if (updated !== source) fs.writeFileSync(entry, updated);
build();
console.log(`${updated === source ? 'kept' : 'reset'} noVNC verification port to ${defaultTarget}`);
