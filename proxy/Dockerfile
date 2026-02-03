# proxy/Dockerfile - builds frontend and serves it with nginx; proxies API/socket to backend
# Place this file under /proxy (or adjust build context in compose)
FROM node:18-alpine AS build
WORKDIR /usr/src/app
# Copy frontend manifests and install
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
# Build the frontend (Vite/React)
RUN npm run build

FROM nginx:alpine AS runtime
# Copy built frontend into nginx html
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
# Copy reverse-proxy nginx config
COPY proxy/nginx.conf /etc/nginx/conf.d/default.conf

# Expose web ports
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]