# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY eslint.config.mjs ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to run node for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]
