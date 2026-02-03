FROM node:18-alpine AS base
WORKDIR /usr/src/app

# Copy package metadata first and install (allow build step)
COPY backend/package*.json ./
RUN npm ci --legacy-peer-deps

FROM base AS build
WORKDIR /usr/src/app
# Copy full backend source and run optional build + prisma generate
COPY backend/ ./
# If a build script exists this runs it; otherwise it will likely be a no-op or fail fast
RUN if npm run | grep -q ' build'; then npm run build; fi
RUN npx prisma generate || true

FROM node:18-alpine AS runtime
WORKDIR /usr/src/app

# create non-root user
RUN addgroup -S app && adduser -S -G app app

# Copy the entire app from build stage (includes dist or src as present)
COPY --from=build /usr/src/app /usr/src/app

ENV NODE_ENV=production
ENV PORT=4000

USER app
EXPOSE 4000

# Run migrations then start the server (ensure package.json has a start script)
CMD ["sh", "-c", "npx prisma migrate deploy || true && npm run start"]