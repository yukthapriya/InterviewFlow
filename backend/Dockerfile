FROM node:18-alpine AS base
WORKDIR /usr/src/app
COPY backend/package*.json ./
# install deps (both prod+dev to allow build if needed)
RUN npm ci --legacy-peer-deps

# Copy everything and attempt to build (if a build script exists)
FROM base AS build
COPY backend/ ./
# If you have a build script, this will run it; if not, it will just skip (failsafe: many projects require it)
RUN if npm run | grep -q ' build'; then npm run build; fi
# Generate prisma client (no-op if no prisma)
RUN npx prisma generate || true

# Final runtime image
FROM node:18-alpine AS runtime
WORKDIR /usr/src/app
# create non-root user
RUN addgroup -S app && adduser -S -G app app

# copy node_modules & prisma from build
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/prisma ./prisma
# prefer built output if present, otherwise copy sources
# if dist exists in build stage, use it; otherwise copy full backend contents
COPY --from=build /usr/src/app/dist ./dist || true
COPY --from=build /usr/src/app/src ./src || true
COPY --from=build /usr/src/app/package*.json ./

ENV NODE_ENV=production
ENV PORT=4000

USER app
EXPOSE 4000

# Run migrations then start. Ensure package.json has a "start" script.
CMD ["sh", "-c", "npx prisma migrate deploy || true && npm run start"]