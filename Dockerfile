# Production build for Global Media
FROM node:20-alpine
WORKDIR /app
# Copy server deps first for layer caching
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production
# Copy rest of app (frontend + server)
COPY . .
# Ensure data dir exists
RUN mkdir -p server/data
# Environment
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server/server.js"]
