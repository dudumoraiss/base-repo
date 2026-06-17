# syntax=docker/dockerfile:1
#
# Single image that runs BOTH locally and on AWS Lambda:
#   - Locally / in docker-compose it is a normal Express server on :8080.
#   - On Lambda (container image + Function URL) the AWS Lambda Web Adapter
#     translates the Function URL request into an HTTP call to that same server.
# The adapter is inert unless AWS_LAMBDA_RUNTIME_API is present, so one artifact
# covers every environment.

# ---------- build ----------
FROM node:20-slim AS build
WORKDIR /workspace

# Install with the full workspace context (npm workspaces needs every package.json).
COPY . .
RUN npm ci

# Build the API (bundles @org/observability) and prune to a self-contained dist
# (dist/package.json + dist/package-lock.json with only runtime deps).
RUN npx nx build @org/api --configuration=production \
 && npx nx prune @org/api

# ---------- runtime ----------
FROM node:20-slim AS runtime

# AWS Lambda Web Adapter (https://github.com/awslabs/aws-lambda-web-adapter)
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.0 /lambda-adapter /opt/extensions/lambda-adapter

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    AWS_LWA_PORT=8080

COPY --from=build /workspace/apps/api/dist ./
RUN npm ci --omit=dev

EXPOSE 8080
CMD ["node", "main.js"]
