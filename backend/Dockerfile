# syntax=docker/dockerfile:1

# ---- Build stage: compile TypeScript ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage: production dependencies + compiled JS only ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
# The health check is declared in compose.yml (GET /health, which also checks PostgreSQL).
CMD ["node", "dist/server.js"]
