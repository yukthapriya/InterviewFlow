# backend/Dockerfile (production)
FROM node:18-alpine AS deps
WORKDIR /usr/src/app
# copy package manifests
COPY backend/package*.json ./ 
# install production deps
RUN npm ci --production --legacy-peer-deps

# Build stage (if you have TS build step)
FROM node:18-alpine AS build
WORKDIR /usr/src/app
COPY backend/ ./
# If using TypeScript / build step, uncomment:
# RUN npm ci --legacy-peer-deps && npm run build
# Ensure Prisma client is generated for runtime
RUN npm ci --legacy-peer-deps && npx prisma generate

# Final runtime image
FROM node:18-alpine AS runtime
WORKDIR /usr/src/app

# Create non-root user for safer runtime
RUN addgroup -S app && adduser -S -G app app
# Copy only necessary files
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package*.json ./
# If your app runs directly from src (no build), copy src instead:
# COPY --from=build /usr/src/app/src ./src

# Ensure we have a start script in package.json that runs the server
ENV NODE_ENV=production
ENV PORT=4000

USER app
EXPOSE 4000

# Run migrations on startup then start the server.
# Adjust `npm run start` to your actual production start script.
CMD ["sh", "-lc", "npx prisma migrate deploy && npm run start"]