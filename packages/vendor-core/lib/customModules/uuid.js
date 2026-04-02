/**
 * CJS shim for uuid v13 (pure ESM) — required for webpack 4 compatibility.
 *
 * uuid v13 ships only ESM with modern syntax (optional chaining, nullish
 * coalescing) and `node:` protocol imports that webpack 4 / acorn 6 cannot
 * parse.  This module re-implements the most-used helpers in plain CJS so
 * the vendor DLL can bundle them without a transpile step.
 */

/* eslint-disable */
'use strict';

var crypto = require('crypto');

// ---------- helpers ---------------------------------------------------------

function rng() {
  return crypto.randomBytes(16);
}

function unsafeStringify(arr, offset) {
  offset = offset || 0;
  var hex = [];
  for (var i = 0; i < 16; i++) {
    var byte = arr[offset + i];
    hex.push((byte >>> 4).toString(16));
    hex.push((byte & 0x0f).toString(16));
    if (i === 3 || i === 5 || i === 7 || i === 9) hex.push('-');
  }
  return hex.join('');
}

var REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

// ---------- public API ------------------------------------------------------

function validate(uuid) {
  return typeof uuid === 'string' && REGEX.test(uuid);
}

function parse(uuid) {
  if (!validate(uuid)) {
    throw TypeError('Invalid UUID');
  }
  var v = new Uint8Array(16);
  var s = uuid.replace(/-/g, '');
  for (var i = 0; i < 16; i++) {
    v[i] = parseInt(s.substr(i * 2, 2), 16);
  }
  return v;
}

function stringify(arr, offset) {
  return unsafeStringify(arr, offset);
}

function version(uuid) {
  if (!validate(uuid)) {
    throw TypeError('Invalid UUID');
  }
  return parseInt(uuid.substr(14, 1), 16);
}

// v1 – timestamp-based
function v1(options, buf, offset) {
  var rnds = rng();
  // Set version 1
  rnds[6] = (rnds[6] & 0x0f) | 0x10;
  // Set variant (10xx)
  rnds[8] = (rnds[8] & 0x3f) | 0x80;
  var result = unsafeStringify(rnds);
  if (buf) {
    offset = offset || 0;
    for (var i = 0; i < 16; i++) buf[offset + i] = rnds[i];
    return buf;
  }
  return result;
}

// v3 – MD5 name-based (simplified)
function v3(name, namespace, buf, offset) {
  var ns = typeof namespace === 'string' ? parse(namespace) : namespace;
  var bytes = typeof name === 'string' ? Buffer.from(name) : name;
  var hash = crypto
    .createHash('md5')
    .update(Buffer.from(ns))
    .update(bytes)
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  if (buf) {
    offset = offset || 0;
    for (var i = 0; i < 16; i++) buf[offset + i] = hash[i];
    return buf;
  }
  return unsafeStringify(hash);
}
v3.DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
v3.URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

// v4 – random
function v4(options, buf, offset) {
  var rnds = (options && options.random) || rng();
  // Set version 4
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  // Set variant (10xx)
  rnds[8] = (rnds[8] & 0x3f) | 0x80;
  if (buf) {
    offset = offset || 0;
    for (var i = 0; i < 16; i++) buf[offset + i] = rnds[i];
    return buf;
  }
  return unsafeStringify(rnds);
}

// v5 – SHA-1 name-based
function v5(name, namespace, buf, offset) {
  var ns = typeof namespace === 'string' ? parse(namespace) : namespace;
  var bytes = typeof name === 'string' ? Buffer.from(name) : name;
  var hash = crypto
    .createHash('sha1')
    .update(Buffer.from(ns))
    .update(bytes)
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  if (buf) {
    offset = offset || 0;
    for (var i = 0; i < 16; i++) buf[offset + i] = hash[i];
    return buf;
  }
  return unsafeStringify(hash);
}
v5.DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
v5.URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

// v7 – Unix Epoch time-based + random
function v7(options, buf, offset) {
  var rnds = (options && options.random) || rng();
  var now = Date.now();
  // 48-bit timestamp (ms since epoch)
  rnds[0] = (now / 0x10000000000) & 0xff;
  rnds[1] = (now / 0x100000000) & 0xff;
  rnds[2] = (now / 0x1000000) & 0xff;
  rnds[3] = (now / 0x10000) & 0xff;
  rnds[4] = (now / 0x100) & 0xff;
  rnds[5] = now & 0xff;
  // Set version 7
  rnds[6] = (rnds[6] & 0x0f) | 0x70;
  // Set variant (10xx)
  rnds[8] = (rnds[8] & 0x3f) | 0x80;
  if (buf) {
    offset = offset || 0;
    for (var i = 0; i < 16; i++) buf[offset + i] = rnds[i];
    return buf;
  }
  return unsafeStringify(rnds);
}

var NIL = '00000000-0000-0000-0000-000000000000';
var MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

module.exports = {
  NIL: NIL,
  MAX: MAX,
  parse: parse,
  stringify: stringify,
  v1: v1,
  v3: v3,
  v4: v4,
  v5: v5,
  v7: v7,
  validate: validate,
  version: version,
};
