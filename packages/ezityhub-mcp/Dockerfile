# Multi-stage Dockerfile for ezityhub-mcp
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Create non-root user
USER node

# Default environment variables
ENV EZITYHUB_API_URL=http://ezityhub:3000
ENV EZITYHUB_TIMEOUT_MS=15000

# Run MCP server on stdio (Hermes agent will execute via docker exec or stdio container attachment)
ENTRYPOINT ["node", "dist/index.js"]
