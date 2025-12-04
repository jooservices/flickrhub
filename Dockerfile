FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production
RUN npm install -g pm2@latest
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .
CMD ["sh", "-c", "pm2-runtime ecosystem.config.js --only ${PM2_TARGET:-api}"]
