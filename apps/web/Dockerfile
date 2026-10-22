# Alfa Maps website (with the app demo at /demo/): build with Node, serve the static files with nginx.
# Build from the repo root:  docker build -f apps/web/Dockerfile -t alfa-maps-web .
FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/web/package.json apps/web/
COPY apps/app/package.json apps/app/
RUN npm ci --no-audit --no-fund
COPY eslint.config.js ./
COPY packages/engine packages/engine
COPY apps/web apps/web
COPY apps/app apps/app
# The website plus the browser-only demo of the app at /demo/
RUN npx eslint apps/web apps/app packages/engine && npm run build:site

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
