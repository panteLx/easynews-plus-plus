FROM node:22-alpine AS builder

WORKDIR /build

# Copy LICENSE file.
COPY LICENSE ./

# Copy the custom-titles.json file.
COPY custom-titles.json ./

# Copy the relevant package.json and package-lock.json files.
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/addon/package*.json ./packages/addon/

# Install dependencies.
RUN npm install

# Copy source files.
COPY tsconfig.*json ./
COPY packages/api ./packages/api
COPY packages/addon ./packages/addon

# Build the project.
RUN npm run build

# Remove development dependencies.
RUN npm --workspaces prune --omit=dev

FROM node:22-alpine AS final

WORKDIR /app

# Copy the built files from the builder.
# The package.json files must be copied as well for NPM workspace symlinks between local packages to work.
COPY --from=builder /build/package*.json /build/LICENSE ./
COPY --from=builder /build/packages/addon/package.*json ./packages/addon/
COPY --from=builder /build/packages/api/package.*json ./packages/api/
COPY --from=builder /build/packages/addon/dist ./packages/addon/dist
COPY --from=builder /build/packages/api/dist ./packages/api/dist

# Copy the custom-titles.json file.
COPY --from=builder /build/custom-titles.json ./custom-titles.json

COPY --from=builder /build/node_modules ./node_modules

EXPOSE 1337

ENTRYPOINT ["npm", "run", "start"]
