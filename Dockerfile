# syntax=docker/dockerfile:1

# ============================================================
# Dependencies
# ============================================================
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack prepare yarn@4.17.0 --activate \
    && yarn --version \
    && yarn install --immutable


# ============================================================
# Builder
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack prepare yarn@4.17.0 --activate

COPY --from=deps /app/node_modules ./node_modules

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma Client
RUN yarn prisma generate

# Build NestJS application
RUN yarn build


# ============================================================
# Production Dependencies
# ============================================================
FROM node:22-alpine AS prod-deps

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack prepare yarn@4.17.0 --activate \
    && yarn --version \
    && yarn install --immutable --production


# ============================================================
# Production
# ============================================================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S nodejs \
    && adduser -S nestjs -G nodejs

# Production dependencies
COPY --from=prod-deps --chown=nestjs:nodejs \
    /app/node_modules ./node_modules

# Compiled application
COPY --from=builder --chown=nestjs:nodejs \
    /app/dist ./dist

# Prisma generated client
COPY --from=builder --chown=nestjs:nodejs \
    /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder --chown=nestjs:nodejs \
    /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY --from=builder --chown=nestjs:nodejs \
    /app/node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg

# Prisma schema + migrations
COPY --from=builder --chown=nestjs:nodejs \
    /app/prisma ./prisma

COPY --chown=nestjs:nodejs \
    package.json ./

# Upload directory
RUN mkdir -p /app/uploads \
    && chown -R nestjs:nodejs /app/uploads

USER nestjs

EXPOSE 3000

CMD ["node", "dist/src/main.js"]