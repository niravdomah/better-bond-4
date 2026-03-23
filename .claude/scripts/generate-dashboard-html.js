#!/usr/bin/env node
/**
 * generate-dashboard-html.js
 *
 * Reads JSON from collect-dashboard-data.js and produces a self-contained HTML
 * dashboard file. The HTML includes a <meta http-equiv="refresh"> tag so the
 * browser auto-reloads from disk, picking up new data each time the file is
 * regenerated.
 *
 * Usage:
 *   node .claude/scripts/collect-dashboard-data.js --format=json | node .claude/scripts/generate-dashboard-html.js
 *   node .claude/scripts/generate-dashboard-html.js < data.json
 *   node .claude/scripts/generate-dashboard-html.js --output generated-docs/dashboard.html < data.json
 *
 * Or combined:
 *   node .claude/scripts/generate-dashboard-html.js --collect
 *   (runs collect-dashboard-data.js internally)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- CLI args ---
const args = process.argv.slice(2);
const collectFlag = args.includes('--collect');
let outputPath = 'generated-docs/dashboard.html';
const outputIdx = args.indexOf('--output');
if (outputIdx !== -1 && args[outputIdx + 1]) {
  outputPath = args[outputIdx + 1];
}

// --- Get data ---
let data;
if (collectFlag) {
  try {
    const raw = execSync('node .claude/scripts/collect-dashboard-data.js --format=json', {
      encoding: 'utf-8',
      cwd: process.cwd()
    });
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to collect dashboard data:', e.message);
    process.exit(1);
  }
} else {
  let input = '';
  const fd = fs.openSync('/dev/stdin', 'r');
  const buf = Buffer.alloc(65536);
  let n;
  while ((n = fs.readSync(fd, buf)) > 0) {
    input += buf.toString('utf-8', 0, n);
  }
  fs.closeSync(fd);
  if (!input.trim()) {
    console.error('No input. Use --collect or pipe JSON from collect-dashboard-data.js');
    process.exit(1);
  }
  data = JSON.parse(input.trim());
}

// --- Helpers ---
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timestamp() {
  const d = new Date();
  return d.toISOString().replace('T', ' ').slice(0, 16);
}

function phaseTagClass(phase) {
  const map = {
    'COMPLETE': 'tag-green', 'QA': 'tag-teal', 'IMPLEMENT': 'tag-blue',
    'WRITE-TESTS': 'tag-yellow', 'TEST-DESIGN': 'tag-lavender', 'STORIES': 'tag-mauve', 'REALIGN': 'tag-peach',
    'PENDING': 'tag-gray', 'DESIGN': 'tag-blue', 'INTAKE': 'tag-mauve',
    'SCOPE': 'tag-teal'
  };
  return map[phase] || 'tag-gray';
}

// --- Build sections ---
const w = data.workflow || {};
const currentPhase = w.currentPhase || 'NONE';
const featureName = w.featureName || 'Untitled Feature';

// Pipeline phases
const pipelinePhases = ['INTAKE', 'DESIGN', 'SCOPE', 'STORIES', 'IMPLEMENT', 'QA'];
const phaseOrder = ['INTAKE', 'DESIGN', 'SCOPE', 'STORIES', 'REALIGN', 'TEST-DESIGN', 'WRITE-TESTS', 'IMPLEMENT', 'QA'];
const currentIdx = phaseOrder.indexOf(currentPhase);

function pipelineHTML() {
  return pipelinePhases.map((p, i) => {
    const pIdx = phaseOrder.indexOf(p);
    let cls = 'step';
    if (w.featureComplete) {
      cls += ' done';
    } else if (p === currentPhase || (currentPhase === 'REALIGN' && p === 'STORIES') || (currentPhase === 'TEST-DESIGN' && p === 'STORIES') || (currentPhase === 'WRITE-TESTS' && p === 'IMPLEMENT')) {
      cls += ' active';
    } else if (pIdx < currentIdx) {
      cls += ' done';
    }
    const arrow = i < pipelinePhases.length - 1 ? '<span class="arrow">&#8250;</span>' : '';
    return `<div class="${cls}">${esc(p)}</div>${arrow}`;
  }).join('\n          ');
}

// Artifacts section
function artifactsHTML() {
  if (!data.designArtifacts) return '';
  const da = data.designArtifacts;
  const items = [
    { name: 'Feature Spec (FRS)', ok: da.frs },
    { name: 'API Spec (OpenAPI)', ok: da.apiSpec },
    { name: 'Design Tokens (CSS)', ok: da.designTokens },
    { name: 'Mock Handlers (MSW)', ok: da.mocks },
    { name: `Wireframes (${da.wireframes || 0})`, ok: (da.wireframes || 0) > 0 },
  ];
  const count = items.filter(i => i.ok).length;
  const rows = items.map(i =>
    `<div class="artifact"><span class="dot ${i.ok ? 'yes' : 'no'}"></span> ${esc(i.name)}</div>`
  ).join('\n          ');
  return `
      <div class="card">
        <h2>Design Artifacts</h2>
        <div class="artifacts">${rows}</div>
        <div style="margin-top:12px">
          <div class="progress-bar"><div class="fill green" style="width:${Math.round(count / items.length * 100)}%"></div></div>
          <span class="label-sub" style="float:right;margin-top:2px">${count}/${items.length}</span>
        </div>
      </div>`;
}

// Design agents section
function agentsHTML() {
  if (!data.design) return '';
  const all = [...(data.design.agents || []), ...(data.design.autonomous || [])];
  if (all.length === 0) return '';
  const names = {
    'design-api-agent': 'API Spec Agent',
    'design-style-agent': 'Style Agent',
    'design-wireframe-agent': 'Wireframe Agent',
    'mock-setup-agent': 'Mock Setup',
    'type-generator-agent': 'Type Generator'
  };
  const icons = { complete: '&#10003;', in_progress: '&#8987;', pending: '&#183;' };
  const iconCls = { complete: 'complete', in_progress: 'in_progress', pending: 'pending' };
  const rows = all.map(a => `
        <div class="agent-row">
          <div class="agent-icon ${iconCls[a.status] || 'pending'}">${icons[a.status] || '&#183;'}</div>
          <span class="agent-name">${esc(names[a.name] || a.name)}</span>
          <span class="agent-status">${esc(a.status)}</span>
        </div>`
  ).join('');
  return `
      <div class="card">
        <h2>Design Agents</h2>
        ${rows}
      </div>`;
}

// Epics section
function epicsHTML() {
  if (!data.epics || data.epics.length === 0) return '';
  const epicRows = data.epics.map(epic => {
    const completedStories = (epic.stories || []).filter(s => s.phase === 'COMPLETE').length;
    const total = epic.totalStories || epic.stories.length || 0;
    const pct = total > 0 ? Math.round(completedStories / total * 100) : 0;

    // AC aggregation
    let totalAC = 0, checkedAC = 0, hasAC = false;
    for (const s of (epic.stories || [])) {
      if (s.acceptance) { hasAC = true; totalAC += s.acceptance.total; checkedAC += s.acceptance.checked; }
    }
    const acStr = hasAC ? `${checkedAC}/${totalAC}` : '&mdash;';
    const testTotal = (epic.stories || []).reduce((sum, s) => sum + (s.testFiles || 0), 0);
    const testStr = testTotal > 0 ? testTotal : '&mdash;';

    // Story sub-rows
    const storyRows = (epic.stories || []).map(s => {
      let marker = '&#9675;'; // empty circle
      let markerStyle = '';
      if (s.phase === 'COMPLETE') { marker = '&#10003;'; }
      else if (s.phase === currentPhase || s.phase === 'IMPLEMENT' || s.phase === 'WRITE-TESTS') {
        // Check if this is the current story
        if (w.currentStory === s.number && w.currentEpic === epic.number) {
          marker = '&#9654;'; markerStyle = ' style="color:var(--blue)"';
        }
      }
      const sAC = s.acceptance ? `${s.acceptance.checked}/${s.acceptance.total}` : '&mdash;';
      const sTest = s.testFiles ? s.testFiles : '&mdash;';
      const phaseTag = s.phase !== 'PENDING' && s.phase !== 'COMPLETE' ?
        `<span class="phase-tag ${phaseTagClass(s.phase)}">${esc(s.phase)}</span>` : '';
      return `
          <tr class="story-row">
            <td><span class="story-marker"${markerStyle}>${marker}</span>${esc(s.name || `Story ${epic.number}.${s.number}`)}</td>
            <td>${s.phase === 'COMPLETE' ? `<span class="phase-tag tag-green">COMPLETE</span>` : phaseTag}</td>
            <td></td>
            <td>${sAC}</td>
            <td>${sTest}</td>
          </tr>`;
    }).join('');

    return `
          <tr>
            <td style="font-weight:600">${esc(epic.name || `Epic ${epic.number}`)}</td>
            <td><span class="phase-tag ${phaseTagClass(epic.phase)}">${esc(epic.phase)}</span></td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="progress-bar"><div class="fill ${epic.phase === 'COMPLETE' ? 'green' : 'blue'}" style="width:${pct}%"></div></div>
                <span class="label-sub">${completedStories}/${total}</span>
              </div>
            </td>
            <td>${acStr}</td>
            <td>${testStr}</td>
          </tr>${storyRows}`;
  }).join('');

  return `
    <div class="grid full">
      <div class="card">
        <h2>Epic Progress</h2>
        <table class="epic-table">
          <thead>
            <tr><th>Epic</th><th>Phase</th><th style="width:180px">Stories</th><th>ACs</th><th>Tests</th></tr>
          </thead>
          <tbody>${epicRows}
          </tbody>
        </table>
      </div>
    </div>`;
}

// API coverage section
function apiHTML() {
  if (!data.api) return '';
  const api = data.api;
  const unmocked = api.totalEndpoints - api.mockCoverage;

  const endpointRows = (api.endpoints || []).map(ep => {
    const methodCls = (ep.method || 'GET').toUpperCase();
    return `
          <div class="endpoint">
            <span class="method-badge ${methodCls}">${esc(methodCls)}</span>
            <span>${esc(ep.path)}</span>
            <span class="mock-dot ${ep.hasMock ? 'yes' : 'no'}"></span>
          </div>`;
  }).join('');

  return `
    <div class="grid full">
      <div class="card">
        <h2>API Coverage</h2>
        <div class="api-section">
          <div class="api-summary">
            <div class="api-stat"><div class="num">${api.totalEndpoints}</div><div class="label-sub">Endpoints</div></div>
            <div class="api-stat"><div class="num" style="color:var(--green)">${api.mockCoverage}</div><div class="label-sub">Mocked</div></div>
            <div class="api-stat"><div class="num" style="color:var(--red)">${unmocked}</div><div class="label-sub">Unmocked</div></div>
            <div class="api-stat"><div class="num" style="color:var(--yellow)">${api.drifted || 0}</div><div class="label-sub">Drifted</div></div>
          </div>
          <div class="endpoint-list">${endpointRows}
          </div>
        </div>
      </div>
    </div>`;
}

// Requirements section
function requirementsHTML() {
  if (!data.intake) return '';
  const i = data.intake;
  const mCheck = i.manifestExists ? 'yes' : 'no';
  const fCheck = i.frsExists ? 'yes' : 'no';
  const counts = i.requirementCount != null
    ? `<div style="margin-top:8px;font-size:13px;color:var(--text)">${i.requirementCount} requirements, ${i.businessRuleCount || 0} business rules</div>`
    : '';
  return `
      <div class="card">
        <h2>Requirements</h2>
        <div class="artifact"><span class="dot ${mCheck}"></span> Intake Manifest</div>
        <div class="artifact" style="margin-top:6px"><span class="dot ${fCheck}"></span> Feature Requirements Spec</div>
        ${counts}
      </div>`;
}

// Footer
function footerHTML() {
  const parts = [];
  if (w.currentEpic) {
    const epicName = data.epics?.find(e => e.number === w.currentEpic)?.name || `Epic ${w.currentEpic}`;
    let resume = `Resume: <strong>${esc(epicName)}`;
    if (w.currentStory) {
      const storyName = data.epics?.find(e => e.number === w.currentEpic)
        ?.stories?.find(s => s.number === w.currentStory)?.name || `Story ${w.currentStory}`;
      resume += `, ${esc(storyName)}`;
    }
    resume += '</strong>';
    parts.push(`<span>${resume}</span>`);
  }
  parts.push('<span><code>/continue</code> to resume</span>');
  parts.push('<span><code>/quality-check</code> before PR</span>');
  return parts.join('\n    ');
}

// --- Assemble HTML ---
const noStateMessage = data.status === 'no_state'
  ? '<div class="card" style="text-align:center;padding:40px"><h2 style="color:var(--text);font-size:16px">No workflow state found</h2><p style="color:var(--sub);margin-top:8px">Run <code>/start</code> to begin the TDD workflow.</p></div>'
  : '';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="10">
<title>${esc(featureName)} - Dashboard</title>
<style>
  :root {
    --bg: #1e1e2e;
    --surface: #262637;
    --surface2: #2e2e42;
    --border: #3a3a52;
    --text: #cdd6f4;
    --sub: #8990b3;
    --green: #a6e3a1;
    --yellow: #f9e2af;
    --red: #f38ba8;
    --blue: #89b4fa;
    --mauve: #cba6f7;
    --teal: #94e2d5;
    --peach: #fab387;
    --lavender: #b4befe;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: var(--bg); color: var(--text); padding: 24px; line-height: 1.5;
  }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  .header h1 { font-size: 20px; font-weight: 600; }
  .phase-badge { background: var(--mauve); color: var(--bg); padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
  .timestamp { margin-left: auto; font-size: 12px; color: var(--sub); }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .grid.full { grid-template-columns: 1fr; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
  .card h2 { font-size: 13px; font-weight: 600; color: var(--sub); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }
  .pipeline { display: flex; gap: 4px; align-items: center; }
  .step { flex: 1; text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 11px; font-weight: 600; background: var(--surface2); color: var(--sub); }
  .step.done { background: rgba(166,227,161,0.15); color: var(--green); }
  .step.active { background: rgba(137,180,250,0.2); color: var(--blue); box-shadow: 0 0 0 1px var(--blue); }
  .arrow { color: var(--border); font-size: 14px; flex-shrink: 0; }
  .artifacts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .artifact { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
  .dot.yes { background: var(--green); }
  .dot.no { background: var(--border); }
  .agent-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--surface2); }
  .agent-row:last-child { border-bottom: none; }
  .agent-icon { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
  .agent-icon.complete { background: rgba(166,227,161,0.2); color: var(--green); }
  .agent-icon.pending { background: var(--surface2); color: var(--sub); }
  .agent-icon.in_progress { background: rgba(249,226,175,0.2); color: var(--yellow); }
  .agent-name { flex: 1; }
  .agent-status { font-size: 11px; color: var(--sub); }
  .epic-table { width: 100%; border-collapse: collapse; }
  .epic-table th { text-align: left; font-size: 11px; font-weight: 600; color: var(--sub); padding: 6px 8px; border-bottom: 1px solid var(--border); }
  .epic-table td { padding: 8px; font-size: 13px; border-bottom: 1px solid var(--surface2); }
  .epic-table tr:last-child td { border-bottom: none; }
  .story-row td { padding-left: 28px; font-size: 12px; color: var(--sub); }
  .story-marker { margin-right: 6px; }
  .progress-bar { width: 100%; height: 6px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
  .fill { height: 100%; border-radius: 3px; }
  .fill.green { background: var(--green); }
  .fill.blue { background: var(--blue); }
  .fill.yellow { background: var(--yellow); }
  .phase-tag { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .tag-green { background: rgba(166,227,161,0.15); color: var(--green); }
  .tag-blue { background: rgba(137,180,250,0.15); color: var(--blue); }
  .tag-yellow { background: rgba(249,226,175,0.15); color: var(--yellow); }
  .tag-teal { background: rgba(148,226,213,0.15); color: var(--teal); }
  .tag-mauve { background: rgba(203,166,247,0.15); color: var(--mauve); }
  .tag-peach { background: rgba(250,179,135,0.15); color: var(--peach); }
  .tag-lavender { background: rgba(180,190,254,0.15); color: var(--lavender); }
  .tag-gray { background: var(--surface2); color: var(--sub); }
  .api-section { display: flex; gap: 32px; }
  .api-summary { display: flex; flex-direction: column; gap: 12px; min-width: 120px; }
  .api-stat { text-align: center; }
  .api-stat .num { font-size: 22px; font-weight: 700; }
  .api-stat .label-sub { font-size: 11px; color: var(--sub); }
  .endpoint-list { flex: 1; max-height: 200px; overflow-y: auto; font-size: 12px; }
  .endpoint { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  .method-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 3px; min-width: 42px; text-align: center; }
  .method-badge.GET { background: rgba(137,180,250,0.2); color: var(--blue); }
  .method-badge.POST { background: rgba(166,227,161,0.2); color: var(--green); }
  .method-badge.PUT { background: rgba(249,226,175,0.2); color: var(--yellow); }
  .method-badge.DELETE { background: rgba(243,139,168,0.2); color: var(--red); }
  .method-badge.PATCH { background: rgba(250,179,135,0.2); color: var(--peach); }
  .mock-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-left: auto; }
  .mock-dot.yes { background: var(--green); }
  .mock-dot.no { background: var(--red); }
  .label-sub { font-size: 11px; color: var(--sub); }
  .footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 12px; color: var(--sub); display: flex; gap: 24px; }
  .footer code { background: var(--surface2); padding: 1px 6px; border-radius: 4px; font-size: 11px; }
  .auto-refresh { font-size: 10px; color: var(--sub); opacity: 0.5; margin-top: 8px; text-align: right; }
</style>
</head>
<body>

${noStateMessage || `<div class="header">
  <h1>${esc(featureName)}</h1>
  <span class="phase-badge">${esc(currentPhase)}</span>
  <span class="timestamp">Updated ${timestamp()}</span>
</div>

<div class="grid full">
  <div class="card">
    <h2>Workflow Progress</h2>
    <div class="pipeline">
      ${pipelineHTML()}
    </div>
  </div>
</div>

<div class="grid">
  ${requirementsHTML() || artifactsHTML()}
  ${requirementsHTML() ? artifactsHTML() : agentsHTML()}
</div>
${!requirementsHTML() ? '' : `<div class="grid">
  ${agentsHTML()}
  <div></div>
</div>`}

${epicsHTML()}

${apiHTML()}

<div class="footer">
  ${footerHTML()}
</div>`}

<div class="auto-refresh">Auto-refreshes every 10 seconds</div>

</body>
</html>`;

// --- Write output ---
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(outputPath, html, 'utf-8');

const stats = fs.statSync(outputPath);
console.log(JSON.stringify({
  status: 'ok',
  path: outputPath,
  bytes: stats.size,
  timestamp: timestamp()
}));
