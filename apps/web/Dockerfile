# syntax=docker/dockerfile:1
#
# Builds the Angular app and serves the static output with nginx. The ephemeral
# PR environment deploys these same static files to S3 instead, but this image
# satisfies "build and serve it" and powers the local docker-compose stack.

# ---------- build ----------
FROM node:20-slim AS build
WORKDIR /workspace
COPY . .
RUN npm ci
RUN npx nx build web --configuration=production

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/apps/web/browser /usr/share/nginx/html
EXPOSE 80
