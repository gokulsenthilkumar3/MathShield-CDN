# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built output and static assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Non-root user for security
RUN addgroup -S mathshield && adduser -S mathshield -G mathshield
USER mathshield

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/main"]
