import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * OpsDesk Playwright configuration.
 *
 * Inside Docker Compose (the canonical way to run this suite):
 *   PLAYWRIGHT_BASE_URL=http://frontend     - services are reached by Compose service name
 *   PW_ARTIFACT_DIR=/artifacts/<phase>      - bind-mounted to ./artifacts/<phase> on the host
 *   PW_BROWSERS=chromium                    - quality gate; "chromium,firefox,webkit" for extended regression
 */
const isCI = process.env.CI === 'true';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080';
const artifactDir = process.env.PW_ARTIFACT_DIR ?? '../artifacts/local';
const selectedBrowsers = (process.env.PW_BROWSERS ?? 'chromium').split(',').map((name) => name.trim());

const allProjects: Project[] = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
];

export default defineConfig({
  testDir: './tests',

  // Every test resets the shared database, so tests must never run concurrently.
  fullyParallel: false,
  workers: 1,
  // Deterministic demonstration: a failure is reported as a failure, never retried away.
  retries: 0,
  forbidOnly: isCI,

  // A hung suite stops itself and still writes its reports.
  globalTimeout: 10 * 60 * 1000,
  timeout: 30 * 1000,
  expect: { timeout: 7 * 1000 },

  outputDir: `${artifactDir}/test-results`,
  reporter: [
    ['list'],
    ['html', { outputFolder: `${artifactDir}/playwright-report`, open: 'never' }],
    ['json', { outputFile: `${artifactDir}/results.json` }],
  ],

  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
  },

  projects: allProjects.filter((project) => selectedBrowsers.includes(project.name!)),
});
