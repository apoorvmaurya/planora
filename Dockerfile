# Stage 1: Dependencies & Base
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 3: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Mock environment variables for Next.js build validation
ENV NEXT_PUBLIC_SUPABASE_URL="https://mock-project-ref.supabase.co"
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY="mock-anon-key"
ENV LOCATIONIQ_KEY="mock-locationiq-key"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY="mock-vapid-public-key"
ENV VAPID_PRIVATE_KEY="mock-vapid-private-key"
ENV SUPABASE_SERVICE_ROLE_KEY="mock-service-role-key"

RUN pnpm run build

# Stage 4: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
