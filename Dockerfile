# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────
# Community Hero – Cloud Run backend
# Node 22 LTS (Alpine), npm workspaces, server + shared only
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies ────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copy all workspace manifests so npm can resolve the full graph.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# npm workspaces resolves @community-hero/shared as a symlink
# (lockfileVersion 3, "link": true in package-lock.json).
# The symlink points to ../../shared, so the shared/ DIRECTORY
# must exist on disk before npm ci runs — otherwise npm cannot
# create the symlink target and the install fails.
# We copy the full shared source here, not just package.json.
COPY shared/ ./shared/

# Install production deps for server + shared only.
# The client workspace is never referenced.
RUN npm ci --omit=dev --workspace=server --workspace=shared

# ── Stage 2: production runtime ───────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Non-root user – Cloud Run security best practice
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 appuser

# The @community-hero/shared symlink lives at the ROOT node_modules,
# not inside server/node_modules (confirmed in package-lock.json:
# node_modules/@community-hero/shared → resolved: "shared", link: true).
# Copying only root node_modules is sufficient.
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY server/ ./server/
COPY shared/ ./shared/

# Root package.json + package-lock.json are both required:
# - package.json  → npm needs the "workspaces" field to know
#                   that shared/ is a local workspace package
# - package-lock.json → ensures workspace symlink resolution
#                       is consistent with the install that ran
#                       in the deps stage
COPY package.json package-lock.json ./

# Cloud Run injects PORT at runtime (always 8080 on Cloud Run).
# EXPOSE is documentation only; the env var controls the actual port.
EXPOSE 8080

USER appuser

# --experimental-strip-types is required because
# shared/constants/departments.js imports deployment.ts directly
# (a TypeScript file imported from plain JS).
# This flag was added in Node 22.6.0 and handles type-only stripping
# with zero transpilation overhead.
CMD ["node", "--experimental-strip-types", "server/app.js"]
