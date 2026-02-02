# Docker Deployment Guide for Agent Studio

This guide covers how to containerize, build, and deploy the Agent Studio Next.js application using Docker and Docker Hub.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Building the Docker Image](#building-the-docker-image)
- [Running the Application](#running-the-application)
- [Deployment to Different Environments](#deployment-to-different-environments)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🛠️ Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose 2.0+ installed
- DockerHub account (for publishing images)
- Node.js 18+ (for local development)

## 🚀 Quick Start

1. **Clone and setup environment variables:**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your actual values
   ```

2. **Build and run with Docker Compose:**
   ```bash
   # Production
   docker-compose up -d

   # Development
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Access the application:**
   - Production: http://localhost:3000
   - Development: http://localhost:3010

## ⚙️ Environment Configuration

### Required Environment Variables

Copy `.env.example` to `.env.production` and configure:

```bash
# Xians API Configuration
XIANS_APIKEY=your-xians-api-key-here
XIANS_SERVER_URL=https://your-xians-server.com

# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-here

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=your-azure-tenant-id
```

### Environment-Specific Files

- `.env.local` - Local development
- `.env.production` - Production deployment
- `.env.staging` - Staging environment

## 🏗️ Building the Docker Image

### Method 1: Using the Build Script (Recommended)

```bash
# Build latest version
./scripts/docker-build.sh

# Build specific version
./scripts/docker-build.sh v1.0.0

# Build for specific platform
./scripts/docker-build.sh v1.0.0 linux/amd64
```

### Method 2: Manual Docker Build

```bash
# Replace 'your-dockerhub-username' with your actual username
export REGISTRY=your-dockerhub-username
export IMAGE_NAME=agent-studio
export VERSION=latest

# Build multi-platform image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ${REGISTRY}/${IMAGE_NAME}:${VERSION} \
  --tag ${REGISTRY}/${IMAGE_NAME}:latest \
  --push .
```

### Docker Image Features

- 🏔️ **Alpine Linux** - Small base image (~90MB final image)
- 🔒 **Non-root user** - Runs as `nextjs` user for security
- 🏗️ **Multi-stage build** - Optimized for size and speed
- 🎯 **Standalone output** - Self-contained with all dependencies
- 🔍 **Health checks** - Built-in health monitoring
- 🌍 **Multi-platform** - Supports AMD64 and ARM64

## 🚀 Running the Application

### Using Docker Compose (Recommended)

```bash
# Production deployment
docker-compose up -d

# Development with hot reload
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Using Docker Run

```bash
# Create a network
docker network create agent-studio-network

# Run the container
docker run -d \
  --name agent-studio \
  --network agent-studio-network \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  your-dockerhub-username/agent-studio:latest
```

## 🌐 Deployment to Different Environments

### Development Environment

```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up -d

# Or override environment
docker-compose up -d --env-file .env.development
```

### Staging Environment

```bash
# Pull latest image
docker pull your-dockerhub-username/agent-studio:latest

# Deploy with staging config
docker-compose --env-file .env.staging up -d
```

### Production Environment

```bash
# Use specific version for stability
docker pull your-dockerhub-username/agent-studio:v1.0.0

# Deploy with production config
docker-compose up -d
```

### Cloud Deployment Examples

#### AWS ECS
```json
{
  "family": "agent-studio",
  "taskRoleArn": "arn:aws:iam::account:role/task-role",
  "containerDefinitions": [
    {
      "name": "agent-studio",
      "image": "your-dockerhub-username/agent-studio:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "NEXTAUTH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:nextauth-secret"
        }
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-studio
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-studio
  template:
    metadata:
      labels:
        app: agent-studio
    spec:
      containers:
      - name: agent-studio
        image: your-dockerhub-username/agent-studio:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: agent-studio-secrets
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: agent-studio-service
spec:
  selector:
    app: agent-studio
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 📚 Best Practices

### Security

1. **Use secrets management** for sensitive environment variables
2. **Run as non-root** (already configured)
3. **Use specific image tags** in production (not `latest`)
4. **Scan images** for vulnerabilities regularly
5. **Keep base images updated**

### Performance

1. **Use multi-stage builds** (already implemented)
2. **Minimize layers** and combine RUN commands
3. **Use .dockerignore** to exclude unnecessary files
4. **Enable Docker BuildKit** for better caching
5. **Use Next.js standalone** output for smaller images

### Monitoring

1. **Health checks** - Built-in at `/api/health`
2. **Resource limits** - Set memory and CPU limits
3. **Log aggregation** - Use centralized logging
4. **Metrics collection** - Monitor application metrics

### CI/CD Pipeline Example

```yaml
# GitHub Actions example
name: Build and Deploy
on:
  push:
    tags: ['v*']
    
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
        
      - name: Login to DockerHub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
          
      - name: Extract version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT
        
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/agent-studio:${{ steps.version.outputs.VERSION }}
            ${{ secrets.DOCKERHUB_USERNAME }}/agent-studio:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Fails with Memory Issues
```bash
# Increase Docker memory limit or use smaller dependencies
docker system prune -a
docker buildx build --no-cache .
```

#### 2. Container Exits Immediately
```bash
# Check logs
docker logs <container-name>

# Common issues:
# - Missing environment variables
# - Invalid NEXTAUTH_SECRET
# - Port conflicts
```

#### 3. Application Not Accessible
```bash
# Check if container is running
docker ps

# Check port mapping
docker port <container-name>

# Check health status
curl http://localhost:3000/api/health
```

#### 4. Environment Variables Not Loading
```bash
# Verify .env file exists and has correct permissions
ls -la .env.production

# Test with explicit environment variables
docker run -e NODE_ENV=production -e PORT=3000 <image>
```

### Debug Commands

```bash
# View container logs
docker-compose logs -f agent-studio

# Execute shell in running container
docker exec -it agent-studio sh

# View container stats
docker stats agent-studio

# Inspect container configuration
docker inspect agent-studio
```

### Performance Optimization

```bash
# Build with cache mount for faster builds
docker buildx build --cache-from type=local,src=/tmp/.buildx-cache .

# Use multi-stage builds to reduce image size
# Analyze image layers
docker history your-dockerhub-username/agent-studio:latest
```

## 📞 Support

For deployment issues:
1. Check this documentation first
2. Review application logs: `docker-compose logs -f`
3. Verify environment variables are correctly set
4. Test health endpoint: `curl http://localhost:3000/api/health`

---

## 📄 File Structure

```
.
├── Dockerfile                    # Multi-stage production build
├── .dockerignore                # Files to exclude from build context
├── docker-compose.yml           # Production deployment
├── docker-compose.dev.yml       # Development with hot reload
├── .env.example                 # Environment variables template
├── scripts/
│   └── docker-build.sh          # Build and push script
├── src/app/api/health/          # Health check endpoint
└── DOCKER_DEPLOYMENT.md         # This documentation
```