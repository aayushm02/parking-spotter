# Stage 1: Build the React application
FROM node:16 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Set up the backend and serve the frontend
FROM node:16-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./
COPY --from=frontend-build /app/frontend/build ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80

# Expose the port
EXPOSE 80

# Start the application
CMD ["node", "server.js"]
