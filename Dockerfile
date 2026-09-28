# syntax=docker/dockerfile:1
#
# On-prem ("Formato A") image: the whole app in one container, running the
# GitLab adapter in-process. It reaches your private GitLab directly, so there
# is NO collector and NO tunnel — do not set COLLECTOR_URL / COLLECTOR_HOSTS here.

# ---- builder ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so the
# default repo the app opens on must be passed here (not just at runtime).
ARG NEXT_PUBLIC_DEFAULT_REPO=""
ENV NEXT_PUBLIC_DEFAULT_REPO=$NEXT_PUBLIC_DEFAULT_REPO

# openssl is required by Prisma's query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# --ignore-scripts: the `postinstall` runs `prisma generate`, which needs the
# schema we haven't copied yet — we generate explicitly below instead.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ---- runner ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# git: used only for local-path / non-GitLab repos (the GitLab path is pure API).
# openssl + ca-certificates: Prisma engine and outbound HTTPS to GitLab/Groq.
RUN apt-get update && apt-get install -y --no-install-recommends git openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Writable cache for any local clones (non-GitLab-API repo inputs).
RUN mkdir -p /app/.cache/repos && chown -R node:node /app/.cache
USER node

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
