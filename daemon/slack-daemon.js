#!/usr/bin/env node
/**
 * AgentFlow Slack Socket Mode Daemon
 * 零依赖：Node 22 原生 WebSocket。
 * 功能：常连 Slack Socket Mode，监听线程回复 → 按 slack_ts 反查 PR → agent launch 唤醒协调者。
 * 配置：~/.agentflow/.env 中 SLACK_APP_TOKEN=xapp-...（Socket Mode）、
 *       SLACK_USER_TOKEN=xoxp-...、SLACK_CHANNEL_ID=C0...（可选，用于排除自己/识别频道）
 * 日志：~/.agentflow/daemon/daemon.log（launchd 也写同目录 stderr）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const WS = (() => {
  try { return require('node:websocket').WebSocket; } catch { return globalThis.WebSocket; }
})();

const HOME = process.env.HOME || '/Users/mac';
const AF = path.join(HOME, '.agentflow');
const ENV_FILE = path.join(AF, '.env');
const STATE_FILE = path.join(AF, '.sentinel-state.json');
const LOG = path.join(AF, 'daemon', 'daemon.log');

// ---------- env ----------
function loadEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch {}
  return { ...out, ...pick(process.env, ['SLACK_APP_TOKEN', 'SLACK_USER_TOKEN', 'SLACK_CHANNEL_ID']) };
}
const pick = (o, ks) => Object.fromEntries(ks.filter(k => o[k]).map(k => [k, o[k]]));
const CFG = loadEnv();
const APP_TOKEN = CFG.SLACK_APP_TOKEN;

// ---------- log ----------
function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  try { fs.appendFileSync(LOG, line + '\n'); } catch {}
  console.log(line);
}

// ---------- state ----------
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function writeState(s) {
  try {
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
    fs.renameSync(tmp, STATE_FILE);
  } catch (e) { log('state write fail:', e.message); }
}

// ---------- who am I (for self-exclusion) ----------
let myUserId = null;
async function fetchMe() {
  if (!CFG.SLACK_USER_TOKEN) return;
  try {
    const r = await fetch('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${CFG.SLACK_USER_TOKEN}` } });
    const j = await r.json();
    if (j.ok) { myUserId = j.user_id; log('my user_id:', myUserId); }
  } catch (e) { log('auth.test fail:', e.message); }
}

// ---------- wake coordinator ----------
function wakeCoordinator(prNum, event) {
  const state = readState();
  const coord = state.coordinator;
  const detail = `哨兵事件 [实时] PR ${prNum} SLACK_ACTIVITY
- 用户 <@${event.user}> 回复了 Slack 线程（thread_ts=${event.thread_ts}）
- 动作：gh pr view ${prNum} --json comments 读新 comments → S9 分类 → S10 处理
- 处理完发 Slack updated 时用 thread_ts=${event.thread_ts} 回复原线程`;
  if (!coord || !fs.existsSync(coord)) {
    log('coordinator missing → 失联，仅记录（哨兵定时兜底会升级 Slack）');
    return;
  }
  const p = spawn('orca', ['agent', 'launch', '--agent', 'pi',
    '--worktree', `path:${coord}`, '--surface', 'chat',
    '--prompt', detail], { stdio: 'pipe' });
  let out = '';
  p.stdout.on('data', d => out += d);
  p.on('close', code => log(`wake PR ${prNum}: orca exit=${code} ${out.slice(0, 120)}`));
  p.on('error', e => log('wake spawn fail:', e.message));
}

// ---------- slack message event ----------
function onMessage(event) {
  try {
    if (event.type !== 'message' || event.subtype) return;   // 只看原生消息
    if (CFG.SLACK_CHANNEL_ID && event.channel !== CFG.SLACK_CHANNEL_ID) return;
    if (!event.thread_ts || event.thread_ts === event.ts) return;  // 只看线程回复
    if (myUserId && event.user === myUserId) return;               // 排除自己
    const state = readState();
    const prs = state.prs || {};
    const prNum = Object.keys(prs).find(n => prs[n] && prs[n].slack_ts === event.thread_ts);
    if (!prNum) return;   // 非 AgentFlow 线程
    log(`PR ${prNum} slack thread reply by ${event.user}`);
    // 防抖：60s 内同 PR 只唤醒一次
    const key = 'last_wake_' + prNum;
    const now = Date.now();
    if (state[key] && now - state[key] < 60_000) { log('debounced'); return; }
    state[key] = now; writeState(state);
    wakeCoordinator(prNum, event);
  } catch (e) { log('onMessage error:', e.message); }
}

// ---------- socket mode ----------
async function connect() {
  if (!APP_TOKEN) { log('缺 SLACK_APP_TOKEN（xapp-），daemon 空转等待配置…'); return false; }
  await fetchMe();
  // 1. RTM connect via apps.connections.open
  const r = await fetch('https://slack.com/api/apps.connections.open', {
    headers: { Authorization: `Bearer ${APP_TOKEN}` } });
  const j = await r.json();
  if (!j.ok) { log('apps.connections.open fail:', j.error); return false; }
  const ws = new WS(j.url);
  let lastPing = 0;

  ws.onopen = () => log('socket mode: connected');
  ws.onclose = () => { log('socket closed → 5s 后重连'); setTimeout(main, 5000); };
  ws.onerror = e => log('ws error:', e.message || e);

  ws.onmessage = (ev) => {
    let d;
    try { d = JSON.parse(ev.data.toString()); } catch { return; }
    // envelope ack
    if (d.type === 'hello') { log('hello: bot_id', d?.connection_info?.app_id); return; }
    if (d.type === 'disconnect') { log('server ask reconnect (', d.reason, ')'); ws.close(); return; }
    if (d.type === 'events_api' && d.payload) {
      const evt = d.payload.event;
      if (evt) onMessage(evt);
    }
  };
  // Slack 要求回 ping envelope（type=='ping'）保持连接
  setInterval(() => {
    if (ws.readyState === 1 && Date.now() - lastPing > 20_000) {
      lastPing = Date.now();
      try { ws.ping(); } catch {}
    }
  }, 20_000);
  return true;
}

async function main() {
  log('=== agentflow slack daemon starting ===');
  const ok = await connect().catch(e => { log('connect fail:', e.message); return false; });
  if (!ok) setTimeout(main, 60_000);   // 配置缺失/失败：60s 后重试
}
main();
