FROM node:20-alpine

WORKDIR /app

# Copy dependency files first for better caching
COPY op/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY op/. /app

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]

