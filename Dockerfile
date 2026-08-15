# Production image for the Library Management System API.
#
# Built from the Backend/ directory:
#   docker build -t lms-api ./Backend
#
# Deliberately not used for local development — `npm run dev` on the host is
# faster and the compose file in this directory only starts MySQL and Redis.

# ---------------------------------------------------------------- build
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first so a source-only change does not reinstall the world
COPY package*.json ./
RUN npm ci

# The Prisma client is generated from the schema, so it must be copied before
# `npm run build` (which runs `prisma generate` then `tsc`)
COPY prisma ./prisma
COPY tsconfig.json ./
COPY app.ts server.ts ./
COPY src ./src
# express.static serves dist/public, which tsc does not produce — the build
# script copies it across (see scripts/copy-static.js)
COPY public ./public
COPY scripts/copy-static.js ./scripts/
RUN npm run build

# ---------------------------------------------------------------- runtime
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# tini reaps zombies and forwards SIGTERM, which server.ts handles for a
# graceful shutdown; without an init, node runs as PID 1 and ignores it
RUN apk add --no-cache tini

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# The generated client lives in node_modules/.prisma and is not reproduced by
# `npm ci`, so it has to come from the build stage
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
# dist already contains public/ (and its my-uploads scratch dir) via the build
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

# Winston writes to logs/; multer writes uploaded CSVs into dist/public
# beside the templates, so both must belong to the unprivileged user
RUN mkdir -p /app/logs /app/dist/public/my-uploads \
    && chown -R node:node /app/logs /app/dist/public
USER node

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
