# Base image
FROM node:20-alpine AS base

# 1. Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
# packageManager in package.json pins yarn@4.4.0; corepack fetches and
# activates that exact version instead of falling back to Alpine's yarn 1.
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ===== NEXT_PUBLIC build-time args =====
# Only vars actually read by this codebase (see libs/api.ts,
# app/verifyPhone/PinOTP.tsx, app/api/otp/verify/route.ts) — NEXT_PUBLIC_*
# values get inlined into the client bundle at build time, so anything
# unused here would just be dead weight.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SKIP_OTP_VERIFICATION=false
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SKIP_OTP_VERIFICATION=$NEXT_PUBLIC_SKIP_OTP_VERIFICATION
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
# =======================================

RUN yarn build

# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
# MERCHANT_BACKEND is read server-side per request (app/api/otp/*), not at
# build time — pass it at `docker run -e MERCHANT_BACKEND=...`, it's not a
# build ARG here.
CMD ["node", "server.js"]
