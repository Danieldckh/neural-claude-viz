# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server/ ./server/
COPY tsconfig.node.json ./

ENV NODE_ENV=production
ENV DEPLOY_MODE=remote
ENV PORT=4800

EXPOSE 4800

CMD ["npx", "tsx", "server/index.ts"]
