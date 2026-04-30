#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Load config ──
const CONFIG_PATH = process.env.TRACKER_CONFIG || path.join(__dirname, 'tracker.config.json');
if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`Config not found: ${CONFIG_PATH}`);
  console.error('Copy tracker.config.example.json → tracker.config.json and edit it.');
  process.exit(1);
}
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const PORT = CONFIG.port || 3170;
const BK_DIR = path.resolve(__dirname, CONFIG.buildkitDir || '../');
const WIKI_DIR = CONFIG.obsidianDir ? path.resolve(CONFIG.obsidianDir) : null;
const PREFIXES = CONFIG.prefixes || {};
const DEPS = CONFIG.deps || {};
const PROJECTS = CONFIG.projects || {};
const SNAPSHOT_FILE = path.join(__dirname, 'snapshots.json');
const SUGGEST_CACHE = path.join(__dirname, 'suggestions-cache.json');

// ── Helpers ──
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('ko-KR') : ''; }
function safeRead(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

function countCheckboxes(filePath) {
  const txt = safeRead(filePath);
  if (!txt) return null;
  const done = (txt.match(/\[x\]/gi) || []).length;
  const todo = (txt.match(/\[ \]/g) || []).length;
  const total = done + todo;
  return total > 0 ? { done, todo, total, pct: Math.round((done / total) * 100) } : null;
}

function findLatestScore(pattern) {
  const dir = path.join(BK_DIR, 'output');
  try {
    const re = new RegExp(pattern);
    const files = fs.readdirSync(dir)
      .filter(f => re.test(f))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    return files.length ? path.join(dir, files[0].name) : null;
  } catch { return null; }
}

function extractScore(filePath) {
  if (!filePath) return null;
  const txt = safeRead(filePath);
  const m = txt.match(/(?:전체.*?점수|overall.*?score)[:\s]*(\d+\.?\d*)\s*\/\s*(\d+)/i);
  if (m) return { score: parseFloat(m[1]), max: parseFloat(m[2]), pct: Math.round((parseFloat(m[1]) / parseFloat(m[2])) * 100), file: path.basename(filePath) };
  return null;
}

function parsePRStatus(filePath) {
  const txt = safeRead(filePath);
  const lines = txt.split('\n').filter(l => /^-\s*(✅|🔄|⏸|❌)/.test(l.trim()));
  const done = lines.filter(l => l.includes('✅')).length;
  const wip = lines.filter(l => l.includes('🔄')).length;
  const blocked = lines.filter(l => l.includes('⏸')).length;
  const total = lines.length;
  return total > 0 ? { done, wip, blocked, total, pct: Math.round(((done + wip * 0.5) / total) * 100) } : null;
}

function extractPendingItems(filePath, limit = 8) {
  const txt = safeRead(filePath);
  if (!txt) return [];
  const lines = txt.split('\n');
  const items = [];
  let currentSection = '';
  for (const l of lines) {
    const hm = l.match(/^#{1,4}\s+(.+)/);
    if (hm) { currentSection = hm[1].replace(/[*_`]/g, '').trim(); continue; }
    if (/^\s*-\s*\[ \]/.test(l)) {
      const text = l.replace(/^\s*-\s*\[ \]\s*/, '').replace(/\*\*/g, '').trim();
      if (text.length > 0 && text.length < 120) items.push({ text, section: currentSection });
    }
  }
  return items.slice(0, limit);
}

function getGitInfo(repoPath) {
  if (!repoPath || !fs.existsSync(repoPath)) return null;
  try {
    const log = execSync(`git -C "${repoPath}" log --oneline -1 --format="%ar|%s" 2>/dev/null`).toString().trim();
    const [ago, ...msg] = log.split('|');
    const branch = execSync(`git -C "${repoPath}" branch --show-current 2>/dev/null`).toString().trim();
    return { ago, msg: msg.join('|'), branch };
  } catch { return null; }
}

// ── Snapshots ──
function loadSnapshots() { try { return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')); } catch { return {}; } }
function saveSnapshot(data) {
  const today = new Date().toISOString().slice(0, 10);
  const snaps = loadSnapshots();
  snaps[today] = data;
  const keys = Object.keys(snaps).sort().slice(-30);
  const trimmed = {};
  for (const k of keys) trimmed[k] = snaps[k];
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(trimmed, null, 2));
}
function getYesterdayDiff(todayData) {
  const snaps = loadSnapshots();
  const today = new Date().toISOString().slice(0, 10);
  const prev = Object.keys(snaps).sort().filter(d => d < today).pop();
  if (!prev) return null;
  const yesterday = snaps[prev];
  const diffs = {};
  for (const [id, pct] of Object.entries(todayData)) {
    const old = yesterday[id] ?? pct;
    if (pct !== old) diffs[id] = { from: old, to: pct, delta: pct - old };
  }
  return { date: prev, diffs };
}

// ── Suggestion cache ──
function loadSuggestCache() { try { return JSON.parse(fs.readFileSync(SUGGEST_CACHE, 'utf8')); } catch { return {}; } }
function saveSuggestCache(data) { fs.writeFileSync(SUGGEST_CACHE, JSON.stringify(data, null, 2)); }

// ── Pipelines ──
function scanPipelines() {
  let files;
  try {
    files = fs.readdirSync(BK_DIR).filter(f => f.endsWith('.json') && !f.includes('package') && !f.includes('tsconfig'));
  } catch { return { byProject: {}, all: [], uncategorized: [] }; }
  const all = files.map(f => ({ name: f, mtime: fs.statSync(path.join(BK_DIR, f)).mtime })).sort((a, b) => b.mtime - a.mtime);
  const byProject = {};
  const uncategorized = [];
  const sorted = Object.keys(PREFIXES).sort((a, b) => b.length - a.length);
  for (const f of all) {
    const base = f.name.replace('.json', '');
    let matched = false;
    for (const prefix of sorted) {
      if (base.startsWith(prefix)) { (byProject[PREFIXES[prefix]] = byProject[PREFIXES[prefix]] || []).push(f); matched = true; break; }
    }
    if (!matched) uncategorized.push(f);
  }
  return { byProject, all, uncategorized };
}

function computeProgress(proj) {
  const src = proj.progressSource;
  if (!src) return null;
  if (src.type === 'checkbox') {
    const r = countCheckboxes(src.file);
    if (r) return { pct: r.pct, label: `${r.done}/${r.total} tasks`, type: 'checkbox' };
  }
  if (src.type === 'score-auto') {
    const f = findLatestScore(src.pattern);
    const r = extractScore(f);
    if (r) return { pct: r.pct, label: `${r.score}/${r.max} UX (${r.file})`, type: 'score' };
  }
  if (src.type === 'score') {
    const r = extractScore(src.file);
    if (r) return { pct: r.pct, label: `${r.score}/${r.max} UX score`, type: 'score' };
  }
  if (src.type === 'pr-status') {
    const r = parsePRStatus(src.file);
    if (r) return { pct: r.pct, label: `${r.done}done ${r.wip}wip ${r.blocked}blocked`, type: 'pr' };
  }
  if (src.type === 'phase') {
    const pct = Math.round((src.doneCount / src.totalCount) * 100);
    return { pct, label: `${src.doneCount}/${src.totalCount} phases`, type: 'phase' };
  }
  return null;
}

function scanObsidian() {
  if (!WIKI_DIR) return [];
  try {
    return fs.readdirSync(WIKI_DIR).filter(f => f.endsWith('.md') && !f.startsWith('.'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(WIKI_DIR, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime).slice(0, 8);
  } catch { return []; }
}

function scanWikiDocs(projectName) {
  if (!WIKI_DIR) return [];
  const keywords = projectName.toLowerCase().split(/[\s/()-]+/).filter(w => w.length > 2);
  const found = [];
  const scanDir = (dir) => {
    try {
      for (const f of fs.readdirSync(dir)) {
        const fp = path.join(dir, f);
        const stat = fs.statSync(fp);
        if (stat.isDirectory() && !f.startsWith('.')) { scanDir(fp); continue; }
        if (!f.endsWith('.md')) continue;
        if (keywords.some(k => f.toLowerCase().includes(k))) found.push({ name: f, mtime: stat.mtime, path: fp });
      }
    } catch {}
  };
  scanDir(WIKI_DIR);
  try {
    for (const f of fs.readdirSync(path.join(BK_DIR, 'output'))) {
      if (!f.endsWith('.md')) continue;
      if (keywords.some(k => f.toLowerCase().includes(k))) {
        found.push({ name: f, mtime: fs.statSync(path.join(BK_DIR, 'output', f)).mtime });
      }
    }
  } catch {}
  return found.sort((a, b) => b.mtime - a.mtime).slice(0, 6);
}

// ── Rule-based suggestion engine ──
function generateSuggestion(id, card) {
  const tips = [];
  const pct = card.progress?.pct ?? 0;
  const phases = card.phases || [];
  const blockedPhases = phases.filter(p => p.status === 'blocked');
  const wipPhases = phases.filter(p => p.status === 'wip');
  const todoPhases = phases.filter(p => p.status === 'todo');
  const donePhases = phases.filter(p => p.status === 'done');
  const nextActions = card.nextActions || [];
  const deadline = card.deadline;
  const daysLeft = deadline ? Math.ceil((new Date(deadline) - new Date()) / 86400000) : null;
  const git = card.git;
  const pipelines = card.pipelines || [];
  const lastPipelineDaysAgo = pipelines.length ? Math.ceil((new Date() - new Date(pipelines[0].mtime)) / 86400000) : null;

  if (daysLeft !== null && daysLeft <= 1) tips.push(`D-Day! QA + deploy only. No new features.`);
  else if (daysLeft !== null && daysLeft <= 3) tips.push(`D-${daysLeft}. ${todoPhases.length} todo remaining — ${Math.ceil(todoPhases.length / daysLeft)}/day to hit deadline.`);

  if (blockedPhases.length > 0) tips.push(`Blockers (${blockedPhases.length}): ${blockedPhases.map(p => p.name).join(', ')}. Work on unblocked todos while waiting.`);
  if (wipPhases.length > 0) tips.push(`WIP: ${wipPhases.map(p => p.name).join(', ')}. Finish before starting new work.`);
  if (nextActions.length > 0) tips.push(`Next: "${nextActions[0].text}". Run via BuildKit pipeline.`);
  if (pct >= 90 && todoPhases.length > 0) tips.push(`${pct}% almost done. Remaining: ${todoPhases.map(p => p.name).join(', ')}.`);
  else if (pct < 20 && phases.length > 0) tips.push(`${pct}% early stage. Start with "${todoPhases[0]?.name || wipPhases[0]?.name}".`);
  if (lastPipelineDaysAgo !== null && lastPipelineDaysAgo > 7) tips.push(`Last pipeline ${lastPipelineDaysAgo}d ago. Stale? Review priority.`);
  if (git?.ago?.includes('week')) tips.push(`No git commits in 1+ week. Resume or put on hold.`);

  const deps = DEPS[id] || [];
  if (deps.length > 0) {
    const lowDeps = deps.map(d => {
      const dp = PROJECTS[d];
      if (!dp) return null;
      const pr = computeProgress(dp);
      return { name: dp.name, pct: pr?.pct ?? 0 };
    }).filter(d => d && d.pct < 50);
    if (lowDeps.length > 0) tips.push(`Dependency ${lowDeps.map(d => `${d.name}(${d.pct}%)`).join(', ')} still low.`);
  }

  return { text: tips.join(' '), generated: new Date().toISOString(), auto: true };
}

// ── Data builder ──
function buildData() {
  const { byProject, all: allPipelines, uncategorized } = scanPipelines();
  const obsNotes = scanObsidian();

  const cards = Object.entries(PROJECTS).map(([id, p]) => {
    const pipelines = byProject[id] || [];
    const git = getGitInfo(p.repoPath);
    const progress = computeProgress(p);
    const nextActions = p.todoSource ? extractPendingItems(p.todoSource) : [];
    const deps = DEPS[id] || [];
    const feedsInto = Object.entries(DEPS).filter(([, v]) => v.includes(id)).map(([k]) => k);
    const autoDocs = scanWikiDocs(p.name);
    const manualDocNames = new Set((p.docs || []).map(d => d.file));
    const mergedDocs = [...(p.docs || [])];
    for (const ad of autoDocs) {
      if (!manualDocNames.has(ad.name)) mergedDocs.push({ name: ad.name, file: ad.name, auto: true });
    }
    return { id, ...p, docs: mergedDocs, pipelines, git, progress, nextActions, deps, feedsInto };
  });

  const sugCache = loadSuggestCache();
  for (const c of cards) { if (sugCache[c.id]) c.suggestion = sugCache[c.id]; }

  const snap = {};
  for (const c of cards) snap[c.id] = c.progress?.pct ?? 0;
  saveSnapshot(snap);
  const diff = getYesterdayDiff(snap);

  cards.sort((a, b) => {
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
    return (a.progress?.pct || 0) - (b.progress?.pct || 0);
  });

  return { cards, allPipelines, obsNotes, diff, uncategorized };
}

function buildJSON() {
  const { cards, allPipelines, diff } = buildData();
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    projects: cards.map(c => ({
      id: c.id, name: c.name, progress: c.progress?.pct ?? 0, progressLabel: c.progress?.label,
      deadline: c.deadline || null, hypothesis: c.hypothesis, bizmodel: c.bizmodel,
      phases: c.phases, nextActions: c.nextActions, suggestion: c.suggestion || null,
      pipelines: c.pipelines.length, lastPipeline: c.pipelines[0]?.name,
      git: c.git, deps: c.deps, feedsInto: c.feedsInto,
    })),
    diff, totalPipelines: allPipelines.length,
  }, null, 2);
}

// ── HTML generator ──
function generateHTML() {
  const { cards, allPipelines, obsNotes, diff, uncategorized } = buildData();
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const catColors = { saas: '#6366f1', crypto: '#8b5cf6', health: '#10b981', finance: '#3b82f6', automation: '#ef4444', infra: '#6b7280' };
  const catLabels = { saas: 'SaaS', crypto: 'Crypto', health: 'Health', finance: 'Finance', automation: 'Auto', infra: 'Infra' };
  const sIcon = { done: '<span class="si si-done">&#10003;</span>', wip: '<span class="si si-wip">&#9654;</span>', blocked: '<span class="si si-blocked">&#9632;</span>', todo: '<span class="si si-todo">&#9675;</span>' };
  const daysUntil = d => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
  const totalPl = allPipelines.length;
  const avgPct = cards.length ? Math.round(cards.reduce((s, c) => s + (c.progress?.pct || 0), 0) / cards.length) : 0;

  let diffBanner = '';
  if (diff) {
    if (Object.keys(diff.diffs).length > 0) {
      const items = Object.entries(diff.diffs).map(([id, d]) => {
        const name = PROJECTS[id]?.name || id;
        const arrow = d.delta > 0 ? `<span style="color:#4ade80">+${d.delta}%</span>` : `<span style="color:#f87171">${d.delta}%</span>`;
        return `${esc(name)} ${d.from}%→${d.to}% (${arrow})`;
      }).join(' &middot; ');
      diffBanner = `<div class="diff-banner">vs ${diff.date}: ${items}</div>`;
    } else {
      diffBanner = `<div class="diff-banner diff-none">vs ${diff.date}: no changes</div>`;
    }
  }

  // Dep graph
  const depEdges = [];
  for (const [from, tos] of Object.entries(DEPS)) { for (const to of tos) depEdges.push({ from, to }); }
  let depGraphHTML = '';
  if (depEdges.length) {
    const depNodeIds = new Set();
    for (const e of depEdges) { depNodeIds.add(e.from); depNodeIds.add(e.to); }
    const depNodes = cards.filter(c => depNodeIds.has(c.id)).map(c => ({ id: c.id, name: c.name, pct: c.progress?.pct ?? 0, w: Math.max(90, c.name.length * 9 + 20) }));
    const nodeH = 34, gapX = 24, gapY = 56;
    const levels = {}, placed = new Set();
    for (const n of depNodes) { if (!DEPS[n.id]?.length) { levels[n.id] = 0; placed.add(n.id); } }
    for (const n of depNodes) { if (!placed.has(n.id)) { levels[n.id] = 1; } }
    const byLevel = {};
    for (const [id, lv] of Object.entries(levels)) (byLevel[lv] = byLevel[lv] || []).push(id);
    const nodeMap = {}; depNodes.forEach(n => nodeMap[n.id] = n);
    const levelWidths = {};
    for (const [lv, ids] of Object.entries(byLevel)) levelWidths[lv] = ids.reduce((s, id) => s + (nodeMap[id]?.w || 90) + gapX, -gapX);
    const svgW = Math.max(...Object.values(levelWidths), 300) + 40;
    const svgH = Object.keys(byLevel).length * (nodeH + gapY) + 20;
    const nodePos = {};
    for (const [lv, ids] of Object.entries(byLevel)) {
      let x = (svgW - levelWidths[lv]) / 2;
      const y = 10 + parseInt(lv) * (nodeH + gapY);
      for (const id of ids) { const w = nodeMap[id]?.w || 90; nodePos[id] = { x, y, w }; x += w + gapX; }
    }
    const eSvg = depEdges.map(e => { const f = nodePos[e.from], t = nodePos[e.to]; return f && t ? `<line x1="${f.x+f.w/2}" y1="${f.y+nodeH}" x2="${t.x+t.w/2}" y2="${t.y}" stroke="rgba(255,255,255,.15)" stroke-width="1.5" marker-end="url(#ah)"/>` : ''; }).join('');
    const nSvg = depNodes.map(n => { const p = nodePos[n.id]; if (!p) return ''; const rc = n.pct >= 80 ? '#4ade80' : n.pct >= 50 ? '#fbbf24' : n.pct >= 20 ? '#f97316' : '#ef4444'; return `<g><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${nodeH}" rx="7" fill="var(--card)" stroke="${rc}" stroke-width="1.5"/><text x="${p.x+p.w/2}" y="${p.y+15}" text-anchor="middle" fill="var(--text)" font-size="10" font-weight="600">${esc(n.name)}</text><text x="${p.x+p.w/2}" y="${p.y+27}" text-anchor="middle" fill="${rc}" font-size="9" font-weight="700">${n.pct}%</text></g>`; }).join('');
    depGraphHTML = `<div class="stitle">Dependency Graph</div><div class="dep-graph-wrap"><svg class="dep-graph" viewBox="0 0 ${svgW} ${svgH}"><defs><marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,.3)"/></marker></defs>${eSvg}${nSvg}</svg></div>`;
  }

  const cardHTML = cards.map(p => {
    const color = catColors[p.category] || '#6b7280';
    const days = daysUntil(p.deadline);
    const dlBadge = days !== null ? `<span class="dl ${days <= 3 ? 'dl-urgent' : ''}">${days <= 0 ? 'D-Day' : `D-${days}`}</span>` : '';
    const pct = p.progress?.pct ?? 0;
    const C = 2 * Math.PI * 36, off = C - (pct / 100) * C;
    const rc = pct >= 80 ? '#4ade80' : pct >= 50 ? '#fbbf24' : pct >= 20 ? '#f97316' : '#ef4444';
    const deltaInfo = diff?.diffs[p.id] ? ` (${diff.diffs[p.id].delta > 0 ? '+' : ''}${diff.diffs[p.id].delta}%)` : '';

    const ring = `<svg class="ring" viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="6"/><circle cx="40" cy="40" r="36" fill="none" stroke="${rc}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 40 40)"/><text x="40" y="36" text-anchor="middle" fill="${rc}" font-size="16" font-weight="700">${pct}%</text><text x="40" y="48" text-anchor="middle" fill="var(--muted)" font-size="6.5">${esc(p.progress?.label || '')}${deltaInfo}</text></svg>`;
    const gitLine = p.git ? `<div class="git">${esc(p.git.branch)} &middot; ${esc(p.git.ago)} &middot; ${esc(p.git.msg)}</div>` : '';

    let depHTML = '';
    if (p.deps.length || p.feedsInto.length) {
      const tags = [];
      for (const d of p.deps) tags.push(`<span class="dep-tag dep-to">→ ${esc(PROJECTS[d]?.name || d)}</span>`);
      for (const d of p.feedsInto) tags.push(`<span class="dep-tag dep-from">← ${esc(PROJECTS[d]?.name || d)}</span>`);
      depHTML = `<div class="dep-row">${tags.join('')}</div>`;
    }

    let nextHTML = '';
    if (p.nextActions.length) {
      const items = p.nextActions.map((a, i) => {
        const pri = i === 0 ? '<span class="na-pri na-p1">1st</span>' : i < 3 ? `<span class="na-pri na-p2">${i+1}</span>` : `<span class="na-pri na-p3">${i+1}</span>`;
        const sec = a.section ? `<span class="na-sec">${esc(a.section)}</span>` : '';
        return `<div class="na-item">${pri}${esc(a.text)}${sec}</div>`;
      }).join('');
      nextHTML = `<details class="na-details" ${p.deadline ? 'open' : ''}><summary class="na-summary">Next Actions (${p.nextActions.length})</summary>${items}</details>`;
    }

    const phaseHTML = p.phases.map(ph => `<div class="ph">${sIcon[ph.status]}<span class="ph-name">${esc(ph.name)}</span></div>`).join('');
    const plCount = p.pipelines.length;
    const firstPl = plCount ? fmtDate(p.pipelines[plCount - 1].mtime) : '-';
    const lastPl = plCount ? fmtDate(p.pipelines[0].mtime) : '-';
    const docsHTML = (p.docs || []).map(d => `<span class="chip${d.auto ? ' chip-auto' : ''}">${esc(d.name)}</span>`).join('');

    return `
    <div class="card">
      <div class="card-top"><div class="card-info">
        <div class="card-title-row"><span class="cat" style="background:${color}">${catLabels[p.category] || p.category}</span><h3>${esc(p.name)}</h3>${dlBadge}</div>
        <p class="desc">${esc(p.desc)}</p>${gitLine}${depHTML}
      </div>${ring}</div>
      <div class="hypo"><div class="lbl">HYPOTHESIS</div><div class="lbl-text">${esc(p.hypothesis || '')}</div></div>
      <div class="biz"><div class="lbl">BIZ MODEL</div><div class="lbl-text">${esc(p.bizmodel || '')}</div></div>
      <div class="sug" id="sug-${p.id}">
        <div class="sug-header"><span class="lbl">SUGGESTION</span><button class="sug-btn" onclick="analyze('${p.id}')">Analyze</button></div>
        ${p.suggestion ? `<div class="sug-text">${esc(p.suggestion.text)}</div><div class="sug-time">${new Date(p.suggestion.generated).toLocaleString('ko-KR')}</div>` : '<div class="sug-empty">Click Analyze to generate suggestions from current state</div>'}
      </div>
      <div class="phases"><div class="lbl">ROADMAP</div>${phaseHTML}</div>
      ${nextHTML}
      <div class="card-footer">
        <div class="pl-bar"><span class="pl-n">${plCount} pipelines</span><span class="pl-range">${firstPl} ~ ${lastPl}</span></div>
        <div class="doc-row">${docsHTML}</div>
      </div>
    </div>`;
  }).join('');

  const recentHTML = allPipelines.slice(0, 15).map(f => `<div class="feed-item"><span class="feed-name">${f.name.replace('.json','')}</span><span class="feed-time">${fmtDate(f.mtime)}</span></div>`).join('');
  const obsHTML = obsNotes.map(f => `<div class="feed-item"><span class="feed-name">${esc(f.name)}</span><span class="feed-time">${fmtDate(f.mtime)}</span></div>`).join('');

  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BuildKit Tracker</title>
<style>
:root{--bg:#0c0c10;--card:#15151f;--border:#252535;--text:#e4e4ec;--muted:#777;--accent:#6366f1}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);padding:20px 24px;line-height:1.55}
.hdr{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;flex-wrap:wrap;gap:12px}
.hdr h1{font-size:22px;font-weight:700;letter-spacing:-.5px}
.hdr .sub{font-size:11px;color:var(--muted)}
.hdr a{color:var(--accent);text-decoration:none}
.diff-banner{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:8px;padding:8px 14px;margin-bottom:16px;font-size:11px;color:var(--text)}
.diff-none{opacity:.5}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px}
.kpi-box{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.kpi-label{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px}
.kpi-val{font-size:28px;font-weight:700;margin-top:2px}
.kpi-sub{font-size:10px;color:var(--muted)}
.stitle{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;margin:24px 0 12px;padding-bottom:5px;border-bottom:1px solid var(--border)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;transition:border-color .15s}
.card:hover{border-color:var(--accent)}
.card-top{display:flex;gap:16px;align-items:flex-start;margin-bottom:10px}
.card-info{flex:1;min-width:0}
.card-title-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.card-title-row h3{font-size:15px;font-weight:600}
.cat{font-size:9px;padding:2px 6px;border-radius:3px;color:#fff;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
.dl{font-size:10px;padding:2px 7px;border-radius:3px;background:#1a2e4a;color:#60a5fa;font-weight:600}
.dl-urgent{background:#4a1a1a;color:#f87171;animation:pulse 1.4s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
.desc{font-size:11px;color:var(--muted);margin-top:3px}
.git{font-size:9px;color:var(--muted);margin-top:4px;background:rgba(255,255,255,.025);padding:3px 6px;border-radius:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dep-row{display:flex;gap:4px;margin-top:4px;flex-wrap:wrap}
.dep-tag{font-size:9px;padding:1px 5px;border-radius:3px;font-weight:500}
.dep-to{background:rgba(139,92,246,.12);color:#a78bfa}
.dep-from{background:rgba(16,185,129,.12);color:#6ee7b7}
.ring{width:80px;height:80px;flex-shrink:0}
.hypo,.biz{margin-bottom:7px}
.lbl{font-size:9px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px}
.lbl-text{font-size:11px;color:var(--text);line-height:1.45}
.sug{margin-bottom:8px;background:rgba(99,102,241,.05);border:1px solid rgba(99,102,241,.15);border-radius:6px;padding:8px 10px}
.sug-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.sug .lbl{color:#a78bfa;margin-bottom:0}
.sug-btn{font-size:9px;padding:3px 10px;background:rgba(99,102,241,.2);border:1px solid rgba(99,102,241,.4);border-radius:4px;color:#a78bfa;cursor:pointer;font-weight:600;transition:all .15s}
.sug-btn:hover{background:rgba(99,102,241,.35);color:#c4b5fd}
.sug-btn:disabled{opacity:.5;cursor:wait}
.sug-text{font-size:11px;color:var(--text);line-height:1.5}
.sug-time{font-size:9px;color:var(--muted);margin-top:3px}
.sug-empty{font-size:10px;color:var(--muted);font-style:italic}
.phases{margin-bottom:8px}
.ph{display:flex;align-items:center;gap:6px;padding:1.5px 0;font-size:11px}
.si{display:inline-flex;width:14px;justify-content:center;font-size:11px}
.si-done{color:#4ade80}.si-wip{color:#fbbf24}.si-blocked{color:#f87171}.si-todo{color:#555}
.na-details{margin-bottom:8px}
.na-summary{font-size:10px;color:var(--accent);cursor:pointer;font-weight:600;padding:4px 0;letter-spacing:.3px}
.na-summary:hover{color:#818cf8}
.na-item{font-size:10px;color:var(--text);padding:3px 0 3px 6px;margin:2px 0;display:flex;align-items:center;gap:6px}
.na-pri{font-size:8px;padding:1px 4px;border-radius:3px;font-weight:700;flex-shrink:0}
.na-p1{background:rgba(239,68,68,.15);color:#f87171}
.na-p2{background:rgba(251,191,36,.12);color:#fbbf24}
.na-p3{background:rgba(255,255,255,.06);color:var(--muted)}
.na-sec{font-size:8px;color:var(--muted);margin-left:auto;flex-shrink:0;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.card-footer{border-top:1px solid var(--border);padding-top:7px;margin-top:4px}
.pl-bar{display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px}
.pl-n{font-weight:600;color:var(--text)}
.doc-row{display:flex;flex-wrap:wrap;gap:3px}
.chip{font-size:9px;padding:2px 5px;background:rgba(255,255,255,.05);border-radius:3px;color:var(--muted)}
.chip:hover{color:var(--text);background:rgba(255,255,255,.08)}
.chip-auto{border:1px dashed rgba(99,102,241,.3);background:transparent}
.dep-graph-wrap{margin:16px 0;text-align:center}
.dep-graph{max-width:600px;height:auto}
.feed-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
.feed-box{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px}
.feed-box h4{font-size:11px;font-weight:600;margin-bottom:8px}
.feed-item{display:flex;justify-content:space-between;font-size:10px;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.03)}
.feed-name{color:var(--text);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'SF Mono','Fira Code',monospace;font-size:9px}
.feed-time{color:var(--muted);font-size:9px}
.uncat-box{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;display:flex;flex-wrap:wrap;gap:6px}
.uncat-item{font-size:10px;padding:3px 8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:4px;color:#fca5a5;font-family:'SF Mono','Fira Code',monospace}
.api-hint{text-align:center;margin-top:20px;font-size:10px;color:var(--muted)}
.api-hint code{background:rgba(255,255,255,.06);padding:2px 6px;border-radius:3px;font-size:9px}
@media(max-width:960px){.grid{grid-template-columns:1fr}.feed-grid{grid-template-columns:1fr}}
</style></head>
<body>
<div class="hdr">
  <div><h1>BuildKit Tracker</h1><div class="sub">Auto-progress &middot; Hypothesis &middot; Roadmap &middot; Suggestions</div></div>
  <div style="text-align:right"><div style="font-size:11px;color:var(--muted)">${now}</div><a href="/" style="font-size:11px">Refresh</a> &middot; <a href="/api/status" style="font-size:11px">JSON API</a></div>
</div>
${diffBanner}
<div class="kpi">
  <div class="kpi-box"><div class="kpi-label">Products</div><div class="kpi-val">${cards.length}</div></div>
  <div class="kpi-box"><div class="kpi-label">Avg Progress</div><div class="kpi-val">${avgPct}%</div></div>
  <div class="kpi-box"><div class="kpi-label">Pipelines</div><div class="kpi-val">${totalPl}</div></div>
  <div class="kpi-box"><div class="kpi-label">Last Build</div><div class="kpi-val" style="font-size:15px">${fmtDate(allPipelines[0]?.mtime)}</div><div class="kpi-sub">${allPipelines[0]?.name.replace('.json','') || ''}</div></div>
</div>
<div class="stitle">Products</div>
<div class="grid">${cardHTML}</div>
${depGraphHTML}
<div class="stitle">Activity</div>
<div class="feed-grid">
  <div class="feed-box"><h4>Recent Pipelines (${totalPl})</h4>${recentHTML}</div>
  <div class="feed-box"><h4>Obsidian Notes</h4>${obsHTML}</div>
</div>
${uncategorized.length ? `<div class="stitle">Uncategorized Pipelines (${uncategorized.length})</div><div class="uncat-box">${uncategorized.slice(0,10).map(f=>`<span class="uncat-item">${f.name.replace('.json','')} <span class="feed-time">${fmtDate(f.mtime)}</span></span>`).join('')}</div>` : ''}
<div class="api-hint">Claude/Gemini: <code>curl localhost:${PORT}/api/status</code> &middot; Suggest: <code>curl localhost:${PORT}/api/suggest/{id}</code></div>
<script>
setTimeout(()=>location.reload(),60000);
async function analyze(id){
  const box=document.getElementById('sug-'+id);
  const btn=box.querySelector('.sug-btn');
  btn.disabled=true;btn.textContent='Analyzing...';
  try{
    const r=await fetch('/api/suggest/'+encodeURIComponent(id));
    const d=await r.json();
    const time=new Date(d.generated).toLocaleString('ko-KR');
    box.querySelector('.sug-text,.sug-empty')?.remove();
    box.querySelector('.sug-time')?.remove();
    const header=box.querySelector('.sug-header');
    const txt=document.createElement('div');txt.className='sug-text';txt.textContent=d.text;
    header.after(txt);
    const ts=document.createElement('div');ts.className='sug-time';ts.textContent=time;
    txt.after(ts);
  }catch(e){console.error(e)}
  btn.disabled=false;btn.textContent='Analyze';
}
</script>
</body></html>`;
}

// ── Server ──
http.createServer((req, res) => {
  const sugMatch = req.url.match(/^\/api\/suggest\/(.+)$/);
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(buildJSON());
  } else if (sugMatch) {
    const id = decodeURIComponent(sugMatch[1]);
    const proj = PROJECTS[id];
    if (!proj) { res.writeHead(404); res.end('not found'); return; }
    const { byProject } = scanPipelines();
    const pipelines = byProject[id] || [];
    const git = getGitInfo(proj.repoPath);
    const progress = computeProgress(proj);
    const nextActions = proj.todoSource ? extractPendingItems(proj.todoSource) : [];
    const card = { ...proj, pipelines, git, progress, nextActions };
    const suggestion = generateSuggestion(id, card);
    const cache = loadSuggestCache(); cache[id] = suggestion; saveSuggestCache(cache);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(suggestion));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(generateHTML());
  }
}).listen(PORT, () => console.log(`BuildKit Tracker: http://localhost:${PORT}`));
