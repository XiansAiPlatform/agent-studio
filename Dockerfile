# syntax=docker/dockerfile:1

# Agent Studio Dockerfile
# Multi-stage build for Next.js application following best practices

FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build).
# The cache mount only survives on a long-lived builder (local builds); on CI
# the registry/GHA layer cache is what skips this step.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --fund=false

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for build-time environment variables
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Set build-time environment variables that may be needed
ENV SKIP_ENV_VALIDATION=true

# Required build-time environment variables (placeholder values for build)
# These will be replaced with real values at container runtime
ENV NEXTAUTH_SECRET=build-time-placeholder-secret-min-32-chars-required
ENV NEXTAUTH_URL=http://localhost:3000
ENV XIANS_SERVER_URL=http://localhost:5005
ENV XIANS_APIKEY=build-time-placeholder-api-key
ENV GOOGLE_CLIENT_ID=build-time-placeholder
ENV GOOGLE_CLIENT_SECRET=build-time-placeholder
ENV AZURE_AD_CLIENT_ID=build-time-placeholder
ENV AZURE_AD_CLIENT_SECRET=build-time-placeholder
ENV AZURE_AD_TENANT_ID=build-time-placeholder

# Build application. Only .next/standalone and .next/static are copied into the
# runner stage, so keeping .next/cache out of the layer costs nothing.
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Production image, copy all files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create nextjs user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone output and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set default port
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]