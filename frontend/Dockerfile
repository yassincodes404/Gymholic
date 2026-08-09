# ================================================
# Gymholic Frontend — Multi-stage Docker Build
# ================================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source and build
COPY . .
RUN npm run build

# ---- Stage 2: Serve (Production) ----
FROM nginx:alpine AS prod

# Copy built assets to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Note: We will mount the custom nginx.conf via docker-compose
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ---- Stage 3: Development Server ----
FROM node:20-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
