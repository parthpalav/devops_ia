#!/usr/bin/env node
/**
 * Reads a Playwright JSON report and prints a presentation-friendly summary.
 * Runs inside the Playwright container, so the host needs no Node.js.
 *
 * Usage:
 *   node scripts/summarize-results.mjs <results.json> [--expect-failure <test-id>]
 *
 * Exit codes:
 *   0  expectation met (default expectation: every test passed;
 *      with --expect-failure E2E-04: that test failed, i.e. the regression was detected)
 *   1  expectation NOT met
 *   2  report missing or unreadable
 */
import { readFileSync } from 'node:fs';

const [, , reportPath, flag, expectedFailureId] = process.argv;
if (!reportPath || (flag && (flag !== '--expect-failure' || !expectedFailureId))) {
  console.error('Usage: summarize-results.mjs <results.json> [--expect-failure <test-id>]');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (error) {
  console.error(`[ERROR] Cannot read Playwright report ${reportPath}: ${error.message}`);
  process.exit(2);
}

/** Converts container paths (/artifacts/...) into paths relative to the repository root. */
const hostPath = (path) => path.replace(/^\/artifacts\//, 'artifacts/');

const tests = [];
const visit = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const last = test.results?.at(-1);
      tests.push({
        title: spec.title,
        project: test.projectName,
        passed: test.status === 'expected' || test.status === 'flaky',
        skipped: test.status === 'skipped',
        error: last?.error?.message?.split('\n').find((line) => line.trim()) ?? '',
        attachments: (last?.attachments ?? []).filter((a) => a.path).map((a) => ({ name: a.name, path: hostPath(a.path) })),
      });
    }
  }
  (suite.suites ?? []).forEach(visit);
};
(report.suites ?? []).forEach(visit);

const strip = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');
for (const test of tests) {
  const label = test.skipped ? 'SKIP' : test.passed ? 'PASS' : 'FAIL';
  console.log(`  [${label}] ${test.title} (${test.project})`);
  if (!test.passed && !test.skipped) {
    if (test.error) console.log(`         reason: ${strip(test.error).trim()}`);
    for (const attachment of test.attachments) console.log(`         ${attachment.name.padEnd(13)} ${attachment.path}`);
  }
}

const failed = tests.filter((t) => !t.passed && !t.skipped);
const passed = tests.filter((t) => t.passed);
const globalErrors = report.errors ?? [];
console.log(`\n  Total: ${tests.length}   Passed: ${passed.length}   Failed: ${failed.length}`);
for (const error of globalErrors) console.log(`  [ERROR] ${strip(error.message ?? String(error)).split('\n')[0]}`);

if (tests.length === 0) {
  console.log('  [ERROR] The report contains no tests.');
  process.exit(1);
}

if (expectedFailureId) {
  const target = tests.filter((t) => t.title.startsWith(expectedFailureId));
  if (target.length === 0) {
    console.log(`  [ERROR] No test named ${expectedFailureId}* found in the report.`);
    process.exit(1);
  }
  const detected = target.every((t) => !t.passed && !t.skipped);
  const unexpected = failed.filter((t) => !t.title.startsWith(expectedFailureId));
  for (const t of unexpected) console.log(`  [WARN] Additional failure not caused by the injected fault: ${t.title}`);
  process.exit(detected && unexpected.length === 0 ? 0 : 1);
}

process.exit(failed.length === 0 && globalErrors.length === 0 ? 0 : 1);
