# Alfa Maps estate app: one container serves the React app and its small JSON API.
# Build from the repo root:  docker build -f apps/app/Dockerfile -t alfa-maps-app .
# Run:  docker run -p 8080:8080 -e ADMIN_PASSWORD=... -v alfa-maps-data:/data alfa-maps-app
# A client's estate: mount their folder (estate.json + settings.json) and set SEED_DIR, e.g.
#   -v /path/to/client:/seed:ro -e SEED_DIR=/seed
FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/web/package.json apps/web/
COPY apps/app/package.json apps/app/
RUN npm ci --no-audit --no-fund
COPY packages/engine packages/engine
COPY apps/app apps/app
RUN npm run build -w @alfa-maps/app

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data
COPY apps/app/package.json ./
# The server needs only Express; everything else is bundled into dist by Vite.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));delete p.devDependencies;fs.writeFileSync('package.json',JSON.stringify(p,null,2))" \
 && npm install --omit=dev --no-audit --no-fund \
 && mkdir -p /data && chown node:node /data
COPY apps/app/server server
COPY apps/app/seed seed
COPY --from=build /repo/apps/app/dist dist
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
