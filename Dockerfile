FROM node:22-alpine AS builder

WORKDIR /build

# Copy LICENSE file.
COPY LICENSE ./

# Copy the custom-titles.json file.
COPY custom-titles.json ./

# Copy the relevant package.json and package-lock.json files.
COPY package*.json ./
COPY packages/addon/package*.json ./packages/addon/
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies.
RUN npm install

# Copy source files.
COPY tsconfig.*json ./

COPY packages/addon ./packages/addon
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared

# Build the project.
RUN npm run build

# Remove development dependencies.
RUN npm --workspaces prune --omit=dev

FROM node:22-alpine AS final

WORKDIR /app

COPY --from=builder /build/package*.json /build/LICENSE ./

# Copy the package.json files.
COPY --from=builder /build/packages/addon/package.*json ./packages/addon/
COPY --from=builder /build/packages/api/package.*json ./packages/api/
COPY --from=builder /build/packages/shared/package.*json ./packages/shared/

# Copy the dist files.
COPY --from=builder /build/packages/addon/dist ./packages/addon/dist
COPY --from=builder /build/packages/api/dist ./packages/api/dist
COPY --from=builder /build/packages/shared/dist ./packages/shared/dist

# Copy the custom-titles.json file.
COPY --from=builder /build/custom-titles.json ./custom-titles.json

COPY --from=builder /build/node_modules ./node_modules

EXPOSE 1337

ENTRYPOINT ["npm", "run", "start"]