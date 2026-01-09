# syntax = docker/dockerfile:1
#
# Production image for the React frontend.
#   Stage 1 (build) — Node + Vite produce /web/dist
#   Stage 2 (runtime) — nginx:alpine serves /web/dist + reverse-proxies
#                       /api, /up, /cable to the Rails service through kamal-proxy.
#
# Build context: this directory (web/). The Rails image is a separate kamal
# service; nginx talks to it across the kamal Docker network.

ARG NODE_VERSION=22

# === Stage 1: build ===
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /web

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Empty VITE_API_URL — axios falls through to relative URLs at runtime,
# which means the browser hits the same origin (portal.scaleforte.com)
# and nginx routes /api, /up, /cable to the Rails service internally.
ENV VITE_API_URL=""
RUN npm run build  # outputs /web/dist


# === Stage 2: runtime ===
FROM nginx:1.27-alpine AS runtime

# Replace the default site with our reverse-proxy + SPA-fallback config.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets.
COPY --from=build /web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
