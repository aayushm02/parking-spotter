# Deployment Guide for Parking Spot Finder

This guide will help you deploy the Parking Spot Finder application to various platforms.

## Prerequisites

- Node.js 14 or higher
- MongoDB Atlas account or other MongoDB hosting service
- Git repository (GitHub, GitLab, or Bitbucket)
- Docker and Docker Compose (optional for container deployment)

## Environment Setup

### Backend Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```
PORT=5000
MONGO_URI=mongodb+srv://<your-username>:<your-password>@<your-cluster-url>/<your-db-name>
JWT_SECRET=<your-secret-key>
NODE_ENV=production
```

### Frontend Environment Variables

The frontend already has `.env` and `.env.production` files set up.

## Deployment Options

### Option 1: Heroku

1. Create a Heroku account if you don't have one
2. Install the Heroku CLI
3. Login to Heroku:
   ```
   heroku login
   ```
4. Create a new Heroku app:
   ```
   heroku create parking-spot-finder-app
   ```
5. Add MongoDB add-on or set environment variables for your MongoDB Atlas connection:
   ```
   heroku config:set MONGO_URI=your_mongodb_connection_string
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set NODE_ENV=production
   ```
6. Push to Heroku:
   ```
   git push heroku main
   ```

### Option 2: Railway or Render

1. Create an account on Railway (https://railway.app/) or Render (https://render.com/)
2. Connect your GitHub repository
3. Set up environment variables in their dashboard
4. Deploy from their UI

### Option 3: Manual Deployment (VPS)

1. SSH into your server
2. Clone the repository:
   ```
   git clone https://github.com/yourusername/parking-spot-finder.git
   cd parking-spot-finder
   ```
3. Install dependencies:
   ```
   npm run install-all
   ```
4. Set up environment variables
5. Build the frontend:
   ```
   npm run build
   ```
6. Use PM2 to keep the server running:
   ```
   npm install -g pm2
   pm2 start backend/server.js --name "parking-app"
   ```

## Monitoring & Maintenance

- Set up Logging with a service like LogRocket or Sentry
- Monitor server health with UptimeRobot
- Set up regular backups of your MongoDB database

## Option 4: Docker Deployment

1. Make sure Docker and Docker Compose are installed on your system
2. Build and run the containers:
   ```
   docker-compose up -d
   ```
3. The application will be available at http://localhost or http://your-server-ip

## Domain & HTTPS

1. Purchase a domain name
2. Configure DNS to point to your deployed app
3. Set up HTTPS with Let's Encrypt or your hosting provider's SSL options
4. If using Docker, consider using Nginx as a reverse proxy with Let's Encrypt for SSL
