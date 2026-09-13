# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package management files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy all source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the api project using Nx
RUN npx nx build choir-api

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist/choir-api ./dist/choir-api

EXPOSE 3333

# Run migrations and start server
CMD npx prisma migrate deploy && node dist/choir-api/main.js
