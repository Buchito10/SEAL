FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 seal \
    && useradd --system --uid 1001 --gid seal --create-home seal

COPY --from=dependencies --chown=seal:seal /app/node_modules ./node_modules
COPY --chown=seal:seal src ./src
COPY --chown=seal:seal package.json ./package.json

RUN mkdir -p /app/.local-storage /app/secrets \
    && chown -R seal:seal /app/.local-storage /app/secrets

USER seal
EXPOSE 3001
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/server.js"]
