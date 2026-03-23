#!/usr/bin/env node
/**
 * collect-dashboard-data.js
 * Thin reshaper: reads enriched workflow-state.json + computes API coverage.
 *
 * Usage:
 *   node .claude/scripts/collect-dashboard-data.js --format=json   # For generate-dashboard-html.js
 *   node .claude/scripts/collect-dashboard-data.js --format=text   # For /status terminal display
 */

const fs = require('fs');
const helpers = require('./lib/workflow-helpers');

const MANIFEST_PATH = 'generated-docs/context/intake-manifest.json';
const FRS_PATH = 'generated-docs/specs/feature-requirements.md';
const API_SPEC_PATH = 'generated-docs/specs/api-spec.yaml';
const HANDLERS_PATH = 'web/src/mocks/handlers.ts';
const SNAPSHOT_PATH = 'generated-docs/context/mock-spec-snapshot.yaml';

function countStoryFilesOnDisk(epicNum) {
  const storiesDir = 'generated-docs/stories';
  const entries = fs.existsSync(storiesDir) ? fs.readdirSync(storiesDir) : [];
  const epicDir = entries.find(e => e.match(new RegExp(`^epic-${epicNum}\\b`)));
  if (!epicDir) return 0;
  const epicPath = require('path').join(storiesDir, epicDir);
  return fs.readdirSync(epicPath).filter(f => f.startsWith('story-') && f.endsWith('.md')).length;
}

// =============================================================================
// PARSE CLI
// =============================================================================

const args = process.argv.slice(2);
let formatArg = 'json';
for (const arg of args) {
  if (arg.startsWith('--format=')) {
    formatArg = arg.split('=')[1];
  }
}

// =============================================================================
// READ STATE
// =============================================================================

function readState() {
  return helpers.readWorkflowState();
}

function readManifest() {
  return helpers.readIntakeManifest();
}

// =============================================================================
// DATA COLLECTION
// =============================================================================

function collectData() {
  const state = readState();

  if (!state) {
    return { status: 'no_state', message: 'No workflow state found. Run /start to begin.' };
  }

  const manifest = readManifest();
  const data = { status: 'ok' };

  // --- Workflow section (always present) ---
  data.workflow = {
    currentPhase: state.currentPhase || 'NONE',
    currentEpic: state.currentEpic || null,
    currentStory: state.currentStory || null,
    phaseStatus: state.phaseStatus || 'ready',
    featureComplete: state.featureComplete || false,
    featureName: state.featureName || (manifest && manifest.featureName) || null,
    lastUpdated: state.lastUpdated || null
  };

  // --- Intake section (from INTAKE onward) ---
  if (state.intake) {
    data.intake = {
      manifestExists: state.intake.manifestExists,
      frsExists: state.intake.frsExists,
      requirementCount: state.intake.requirementCount,
      businessRuleCount: state.intake.businessRuleCount
    };
  } else if (state.currentPhase === 'INTAKE' || fs.existsSync(MANIFEST_PATH) || fs.existsSync(FRS_PATH)) {
    // Mid-INTAKE fallback: live existence checks, counts as null
    data.intake = {
      manifestExists: fs.existsSync(MANIFEST_PATH),
      frsExists: fs.existsSync(FRS_PATH),
      requirementCount: null,
      businessRuleCount: null
    };
  }

  // --- Design agents section (from DESIGN onward) ---
  if (state.design) {
    const agents = [];
    for (const name of (state.design.agentsExpected || [])) {
      const status = (state.design.agentsCompleted || []).includes(name) ? 'complete' : 'pending';
      agents.push({ name, status });
    }
    const autonomous = [];
    for (const name of (state.design.autonomousExpected || [])) {
      const status = (state.design.autonomousCompleted || []).includes(name) ? 'complete' : 'pending';
      autonomous.push({ name, status });
    }
    data.design = { agents, autonomous };
  }

  // --- Epics section (from SCOPE onward) ---
  if (state.epics && Object.keys(state.epics).length > 0) {
    const epics = [];
    for (const [num, epic] of Object.entries(state.epics)) {
      const stories = [];
      if (epic.stories) {
        for (const [sNum, story] of Object.entries(epic.stories)) {
          stories.push({
            number: parseInt(sNum),
            name: story.name || null,
            phase: story.phase || 'PENDING',
            acceptance: story.acceptance || null,
            testFiles: story.testFiles || 0
          });
        }
      }
      stories.sort((a, b) => a.number - b.number);

      epics.push({
        number: parseInt(num),
        name: epic.name || null,
        phase: epic.phase || 'PENDING',
        totalStories: epic.totalStories || countStoryFilesOnDisk(parseInt(num)) || stories.length,
        stories
      });
    }
    epics.sort((a, b) => a.number - b.number);
    data.epics = epics;
  }

  // --- Design artifacts (baseline from state + live existence checks) ---
  const hasDesignArtifacts = state.designArtifacts ||
    fs.existsSync(API_SPEC_PATH) ||
    fs.existsSync('generated-docs/specs/design-tokens.css');

  if (hasDesignArtifacts) {
    data.designArtifacts = {
      frs: fs.existsSync(FRS_PATH),
      apiSpec: fs.existsSync(API_SPEC_PATH),
      designTokens: fs.existsSync('generated-docs/specs/design-tokens.css'),
      wireframes: state.designArtifacts?.wireframes ?? helpers.countWireframes(),
      mocks: fs.existsSync(HANDLERS_PATH)
    };
  }

  // --- API coverage (computed on-the-fly) ---
  if (fs.existsSync(API_SPEC_PATH)) {
    data.api = computeApiCoverage();
  }

  return data;
}

// =============================================================================
// API COVERAGE COMPUTATION
// =============================================================================

function computeApiCoverage() {
  const result = {
    totalEndpoints: 0,
    mockCoverage: 0,
    drifted: 0,
    endpoints: []
  };

  try {
    const specContent = fs.readFileSync(API_SPEC_PATH, 'utf-8');

    // Simple YAML path extraction (look for path + method patterns)
    const paths = new Map();

    let currentPath = null;
    for (const line of specContent.split('\n')) {
      const pathMatch = line.match(/^\s{2}(\/[^\s:]+):\s*$/);
      if (pathMatch) {
        currentPath = pathMatch[1];
        paths.set(currentPath, []);
        continue;
      }
      const methodMatch = line.match(/^\s{4}(get|post|put|patch|delete|head|options):\s*$/);
      if (methodMatch && currentPath) {
        paths.get(currentPath).push(methodMatch[1].toUpperCase());
      }
    }

    // Build endpoint list
    const endpoints = [];
    for (const [p, methods] of paths) {
      for (const m of methods) {
        endpoints.push({ path: p, method: m, hasMock: false, drifted: false });
      }
    }
    result.totalEndpoints = endpoints.length;

    // Check mock coverage
    if (fs.existsSync(HANDLERS_PATH)) {
      try {
        const handlersContent = fs.readFileSync(HANDLERS_PATH, 'utf-8');
        for (const ep of endpoints) {
          // Look for handler patterns like http.get('/v1/users')
          const methodLower = ep.method.toLowerCase();
          if (handlersContent.includes(`http.${methodLower}(`) &&
              handlersContent.includes(ep.path)) {
            ep.hasMock = true;
            result.mockCoverage++;
          }
        }
      } catch { /* ignore */ }
    }

    // Check for drift (compare snapshot to current spec)
    if (fs.existsSync(SNAPSHOT_PATH)) {
      try {
        const snapshotContent = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
        const specNormalized = specContent.replace(/\s+/g, ' ').trim();
        const snapNormalized = snapshotContent.replace(/\s+/g, ' ').trim();
        if (specNormalized !== snapNormalized) {
          result.drifted = 1; // Simplified drift detection
        }
      } catch { /* ignore */ }
    }

    result.endpoints = endpoints;
  } catch { /* ignore parse errors */ }

  return result;
}

// =============================================================================
// TEXT FORMATTER
// =============================================================================

function formatText(data) {
  if (data.status === 'no_state') {
    return `=== Workflow Status ===\n\nNo workflow state found.\nRun /start to begin the TDD workflow.`;
  }

  const lines = [];
  const w = data.workflow;

  // Header
  lines.push('=== Workflow Status ===');
  lines.push('');

  const featureName = w.featureName || 'Unknown';
  if (w.featureComplete) {
    lines.push(`Feature: ${featureName}`);
    lines.push('Feature complete!');
  } else {
    const posStr = w.currentEpic ? `Epic ${w.currentEpic}${w.currentStory ? `, Story ${w.currentStory}` : ''}` : '';
    lines.push(`Feature: ${featureName}`);
    lines.push(`Phase: ${w.currentPhase}${posStr ? '                    ' + posStr : ''}`);
  }

  // Requirements section (from INTAKE onward)
  if (data.intake) {
    lines.push('');
    lines.push('=== Requirements ===');
    lines.push('');
    const mCheck = data.intake.manifestExists ? '✓' : '✗';
    const fCheck = data.intake.frsExists ? '✓' : '✗';
    lines.push(`Intake Manifest: ${mCheck}    FRS: ${fCheck}`);
    if (data.intake.requirementCount != null) {
      lines.push(`${data.intake.requirementCount} requirements, ${data.intake.businessRuleCount || 0} business rules`);
    }
  }

  // Design agents section (from DESIGN onward)
  if (data.design) {
    lines.push('');
    lines.push('=== Design Agents ===');
    lines.push('');

    const allComplete = [...data.design.agents, ...data.design.autonomous].every(a => a.status === 'complete');
    if (allComplete && data.design.agents.length > 0) {
      lines.push(`All ${data.design.agents.length + data.design.autonomous.length} agents complete`);
    } else {
      const agentNames = {
        'design-api-agent': 'API Spec Agent',
        'design-style-agent': 'Style Agent',
        'design-wireframe-agent': 'Wireframe Agent',
        'mock-setup-agent': 'Mock Setup',
        'type-generator-agent': 'Type Generator'
      };
      const statusIcons = { 'complete': '✓', 'in_progress': '⧖', 'pending': '·' };

      for (const a of [...data.design.agents, ...data.design.autonomous]) {
        const name = (agentNames[a.name] || a.name).padEnd(20);
        const icon = statusIcons[a.status] || '?';
        lines.push(`${name}${icon} ${a.status}`);
      }
    }
  }

  // Epic progress section (from SCOPE onward)
  if (data.epics && data.epics.length > 0) {
    lines.push('');
    lines.push('=== Epic Progress ===');
    lines.push('');

    const header = 'Epic                  | Phase    | Stories      | ACs       | Tests';
    const divider = '--------------------- | -------- | ------------ | --------- | -----';
    lines.push(header);
    lines.push(divider);

    for (const epic of data.epics) {
      const name = (epic.name || `epic-${epic.number}`).substring(0, 21).padEnd(21);
      const phase = (epic.phase || 'PENDING').padEnd(8);

      const completedStories = epic.stories.filter(s => s.phase === 'COMPLETE').length;
      const storiesStr = `${completedStories}/${epic.totalStories} complete`.padEnd(12);

      // Aggregate ACs
      let totalAC = 0;
      let checkedAC = 0;
      let hasAcData = false;
      for (const story of epic.stories) {
        if (story.acceptance) {
          hasAcData = true;
          totalAC += story.acceptance.total;
          checkedAC += story.acceptance.checked;
        }
      }
      const acStr = hasAcData ? `${checkedAC}/${totalAC}`.padEnd(9) : '—'.padEnd(9);

      // Aggregate test files
      const testTotal = epic.stories.reduce((sum, s) => sum + (s.testFiles || 0), 0);
      const testStr = testTotal > 0 ? String(testTotal) : '—';

      lines.push(`${name} | ${phase} | ${storiesStr} | ${acStr} | ${testStr}`);
    }
  }

  // Design artifacts section
  if (data.designArtifacts) {
    lines.push('');
    lines.push('=== Design Artifacts ===');
    lines.push('');
    const da = data.designArtifacts;
    const parts = [
      `FRS: ${da.frs ? '✓' : '✗'}`,
      `API Spec: ${da.apiSpec ? '✓' : '✗'}`,
      `Design Tokens: ${da.designTokens ? '✓' : '✗'}`,
      `Wireframes: ${da.wireframes || 0}`,
      `Mocks: ${da.mocks ? '✓' : '✗'}`
    ];
    lines.push(parts.join('   '));
  }

  // Current position
  if (!w.featureComplete) {
    lines.push('');
    lines.push('=== Current Position ===');
    lines.push('');

    if (w.currentEpic) {
      const epicName = data.epics?.find(e => e.number === w.currentEpic)?.name || `epic-${w.currentEpic}`;
      let resumeLine = `Resume: Epic ${w.currentEpic} (${epicName})`;
      if (w.currentStory) {
        const storyName = data.epics?.find(e => e.number === w.currentEpic)
          ?.stories?.find(s => s.number === w.currentStory)?.name || `story-${w.currentStory}`;
        resumeLine += `, Story ${w.currentStory} (${storyName})`;
      }
      lines.push(resumeLine);
    }

    if (w.phaseStatus === 'in_progress') {
      lines.push(`Current Phase: ${w.currentPhase}`);
    } else if (w.phaseStatus === 'ready') {
      lines.push(`Next Phase: ${w.currentPhase}`);
    }
    lines.push('Action: Run /continue to resume workflow');
  }

  // Commands
  lines.push('');
  lines.push('=== Commands ===');
  lines.push('');
  lines.push('/continue      - Resume workflow from current position');
  lines.push('/dashboard     - Open visual dashboard');
  lines.push('/quality-check - Run all quality gates');

  return lines.join('\n');
}

// =============================================================================
// MAIN
// =============================================================================

const data = collectData();

if (formatArg === 'text') {
  console.log(formatText(data));
} else {
  console.log(JSON.stringify(data, null, 2));
}
