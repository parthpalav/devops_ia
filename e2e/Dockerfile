# syntax=docker/dockerfile:1

# Official Playwright image: Node.js + Chromium/Firefox/WebKit + all browser system libraries.
# PLAYWRIGHT_VERSION MUST equal the @playwright/test version in package.json (checked below).
ARG PLAYWRIGHT_VERSION=1.64.0
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble

ARG PLAYWRIGHT_VERSION
# Quiet, offline-friendly npm: no update/funding notices in the quality-gate output.
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false
WORKDIR /e2e

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Fail the build early if the npm package and the browser image ever drift apart.
RUN installed="$(npx --no-install playwright --version)" \
 && if [ "$installed" != "Version ${PLAYWRIGHT_VERSION}" ]; then \
      echo "ERROR: @playwright/test is '$installed' but the image is v${PLAYWRIGHT_VERSION}. Update both together." >&2; \
      exit 1; \
    fi \
 && echo "Playwright package/image version match: ${PLAYWRIGHT_VERSION}"

COPY playwright.config.ts tsconfig.json ./
COPY fixtures ./fixtures
COPY helpers ./helpers
COPY scripts ./scripts
COPY tests ./tests

# Exit code 0 = all tests passed, non-zero = quality gate failed.
CMD ["npx", "--no-install", "playwright", "test"]
