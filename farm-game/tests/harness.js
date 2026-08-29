// ============ ฟาร์มมินิ — Harness สำหรับเทสต์ logic (plain Node, ไม่มี dependency) ============
// โหลดไฟล์ JS ของเกมเข้า context เดียวกัน + ฟังก์ชัน assert สั้นๆ
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GAME_DIR = path.join(__dirname, '..', 'js');

function harness(extra = {}) {
  const ctx = {
    window: {},
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    isFinite,
    parseFloat,
    parseInt,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['data.js', 'state.js', 'weather.js', 'market.js', 'quests.js']) {
    const p = harness.loaded[f];
    if (!p) continue;
    vm.runInContext(fs.readFileSync(path.join(GAME_DIR, f), 'utf8'), ctx, { filename: f });
   }
  // ให้เทสต์แก้ D (DATA) ได้ตรงๆ
  ctx.D = ctx.window.Farm.DATA;
  Object.assign(ctx, extra);
  return ctx;
}

harness.loaded = {
  'data.js': true,
  'state.js': true,
  'weather.js': true,
  'market.js': true,
  'quests.js': true,
};

// --- mini assert ---
let passed = 0, failed = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { passed++; }
  else { failed++; failures.push(msg); console.log('  ✗ ' + msg); }
}
function eq(a, b, msg) { ok(Object.is(a, b), msg + ` (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }
function section(name) { console.log('▸ ' + name); }
function summary() {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

module.exports = { harness, ok, eq, section, summary };