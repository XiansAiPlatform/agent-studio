# Docker Instance Creation and Usage

Quick reference for containerizing and deploying the Agent Studio application.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- DockerHub account (for publishing)
- Node.js 20+ (for Next.js 16+ compatibility)

## Environment Setup

### 1. Configure Environment Variables

```bash
# Copy and edit production environment
cp .env.example .env.production

# Required variables:
XIANS_APIKEY=your-api-key
XIANS_SERVER_URL=https://your-server.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret  # Generate with: openssl rand -base64 32
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret
AZURE_AD_CLIENT_ID=your-azure-id
AZURE_AD_CLIENT_SECRET=your-azure-secret
AZURE_AD_TENANT_ID=your-tenant-id
```

## Building Docker Images

### Option 1: Using Build Script (Recommended)

```bash
# Update registry name in scripts/docker-build.sh first
./scripts/docker-build.sh                    # Build latest
./scripts/docker-build.sh v1.0.0             # Build specific version
./scripts/docker-build.sh v1.0.0 linux/amd64 # Build for platform
```

### Option 2: Manual Build

```bash
# Replace 'your-username' with your DockerHub username
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag your-username/agent-studio:latest \
  --push .
```

## Running Instances

### Production Deployment

```bash
# Start production instance
docker-compose up -d

# View logs
docker-compose logs -f

# Stop instance
docker-compose down
```

### Development Instance

```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up -d

# Access at http://localhost:3010
```

### Direct Docker Run

```bash
docker run -d \
  --name agent-studio \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  your-username/agent-studio:latest
```

## Environment-Specific Deployments

### Using Deploy Script

```bash
# Make sure to update registry name in scripts/deploy.sh first
./scripts/deploy.sh production          # Production with latest
./scripts/deploy.sh staging v1.0.0      # Staging with specific version  
./scripts/deploy.sh development         # Development mode
```

### Manual Environment Deployment

```bash
# Staging
docker-compose --env-file .env.staging up -d

# Production with specific version
export IMAGE_TAG=v1.0.0
docker-compose up -d
```

## Health Monitoring

### Health Check Endpoint
- **URL**: `/api/health`
- **Response**: `{"status": "healthy", "timestamp": "...", "uptime": 123}`

### Container Health

```bash
# Check container status
docker ps
docker stats agent-studio

# View health check logs
docker inspect agent-studio | grep -A 10 Health
```

## Image Management

### Publishing to DockerHub

```bash
# Login (one time)
docker login

# Tag and push
docker tag agent-studio:latest your-username/agent-studio:v1.0.0
docker push your-username/agent-studio:v1.0.0
docker push your-username/agent-studio:latest
```

### Image Cleanup

```bash
# Remove unused images
docker image prune -a

# Remove specific version
docker rmi your-username/agent-studio:v1.0.0
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Container exits immediately | Check logs: `docker logs <container>` |
| Port already in use | Change port mapping: `-p 3001:3000` |
| Environment variables not working | Verify `.env.production` exists and has correct values |
| Image build fails | Run `docker system prune -a` and rebuild |
| Health check fails | Check `/api/health` endpoint accessibility |
| "Node.js version required" error | Ensure Dockerfile uses `node:20-alpine` (Next.js 16+ requires Node 20+) |
| GitHub Actions build fails | Check workflow logs for Node.js version compatibility |

### Debug Commands

```bash
# Access container shell
docker exec -it agent-studio sh

# View detailed logs
docker-compose logs -f --tail=100

# Inspect container configuration
docker inspect agent-studio

# Test connectivity
curl http://localhost:3000/api/health
```

### Specific Error Solutions

#### Node.js Version Compatibility Error

**Error Message:**
```
You are using Node.js 18.20.8. For Next.js, Node.js version ">=20.9.0" is required.
ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
```

**Solution:**
1. Ensure Dockerfile uses Node.js 20:
   ```dockerfile
   FROM node:20-alpine AS base
   ```
2. Rebuild the image:
   ```bash
   docker-compose build --no-cache
   ```
3. If using GitHub Actions, the workflow will automatically use the updated Dockerfile

#### Build Fails with Missing Dependencies

**Error Message:**
```
ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
```

**Common Causes & Solutions:**

1. **Missing devDependencies during build:**
   - Ensure Dockerfile uses `npm ci` (not `npm ci --only=production`) for the build stage
   - devDependencies are needed for TypeScript compilation, build tools, etc.

2. **Build environment variables missing:**
   - Add build-time environment variables to Dockerfile:
   ```dockerfile
   ENV SKIP_ENV_VALIDATION=true
   ENV NEXT_TELEMETRY_DISABLED=1
   ```

3. **TypeScript or ESLint errors:**
   ```bash
   # Test build locally first
   npm run build
   
   # Check for TypeScript errors
   npx tsc --noEmit
   
   # Check for linting errors
   npm run lint
   ```

4. **Debug Docker build:**
   ```bash
   # Build with detailed output
   docker build --progress=plain --no-cache -t agent-studio .
   
   # Build up to a specific stage
   docker build --target builder -t agent-studio-debug .
   docker run -it agent-studio-debug sh
   ```

## Docker Image Features

- **Size**: ~90MB (Alpine Linux base)
- **Runtime**: Node.js 20 (required for Next.js 16+)
- **Security**: Runs as non-root user (`nextjs`)
- **Architecture**: Multi-platform (AMD64, ARM64)  
- **Health Checks**: Built-in monitoring
- **Build**: Multi-stage for optimization

## Quick Commands Reference

```bash
# Build and run locally
docker-compose up --build -d

# Update to latest image
docker-compose pull && docker-compose up -d

# View real-time logs
docker-compose logs -f agent-studio

# Scale instances
docker-compose up -d --scale agent-studio=3

# Complete cleanup
docker-compose down -v --rmi all
```

## Automated CI/CD Deployment

### GitHub Actions Workflow

The project includes automated Docker image publishing via GitHub Actions when version tags are pushed.

**Setup Requirements:**
1. Configure `DOCKERHUB_TOKEN` secret in GitHub repository settings
2. Update organization/username in `.github/workflows/dockerhub-deploy.yml`

### Creating Version Tags for Deployment

Use the following commands to create and push version tags that trigger automated Docker builds:

```bash
# Define the version
export VERSION=1.0.0  # or 1.0.0-beta for pre-release

# Create and push a version tag
git tag -a v$VERSION -m "Release v$VERSION"
git push origin v$VERSION
```

### Tag Examples and Results

| Tag Command | Generated Docker Tags | Description |
|-------------|----------------------|-------------|
| `git tag -a v1.0.0 -m "Release v1.0.0"` | `v1.0.0`, `v1.0`, `v1`, `latest` | Stable release |
| `git tag -a v1.2.3 -m "Release v1.2.3"` | `v1.2.3`, `v1.2`, `v1`, `latest` | Patch release |
| `git tag -a v2.0.0-beta -m "Beta v2.0.0-beta"` | `v2.0.0-beta`, `v2.0-beta`, `v2-beta` | Pre-release (no `latest`) |
| `git tag -a v1.0.0-rc1 -m "RC v1.0.0-rc1"` | `v1.0.0-rc1`, `v1.0-rc1`, `v1-rc1` | Release candidate |

### Deployment Workflow

1. **Prepare Release:**
   ```bash
   # Ensure working directory is clean
   git status
   
   # Make sure you're on the main branch
   git checkout main
   git pull origin main
   ```

2. **Create Release Tag:**
   ```bash
   # For stable release
   export VERSION=1.0.0
   git tag -a v$VERSION -m "Release v$VERSION - Add new features and bug fixes"
   
   # For pre-release
   export VERSION=1.0.0-beta
   git tag -a v$VERSION -m "Beta release v$VERSION - Testing new features"
   ```

3. **Push Tag and Monitor:**
   ```bash
   # Push the tag to trigger GitHub Actions
   git push origin v$VERSION
   
   # Monitor the workflow
   echo "Check deployment status at: https://github.com/your-org/agent-studio/actions"
   ```

4. **Verify Deployment:**
   ```bash
   # Wait for workflow completion (typically 5-10 minutes)
   # Then verify the image is available
   docker pull your-org/agent-studio:v$VERSION
   docker pull your-org/agent-studio:latest  # if stable release
   ```

### Automated Features

- **Multi-platform builds**: AMD64 and ARM64 architectures
- **Semantic versioning**: Automatic creation of major/minor/patch tags
- **Cache optimization**: Faster builds using GitHub Actions cache
- **Build summaries**: Detailed deployment information with quick-start commands
- **Pre-release handling**: Beta/RC versions don't update the `latest` tag

### Manual Workflow Trigger

You can also trigger builds manually via GitHub Actions:

1. Go to **Actions** tab in your GitHub repository
2. Select **Build and Publish Agent Studio to DockerHub**
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

See [Workflow Documentation](../../.github/workflows/README.md) for complete setup instructions.

## Production Checklist

- [ ] Configure GitHub Actions workflow secrets
- [ ] Update registry names in build/deploy scripts and workflows
- [ ] Configure production environment variables
- [ ] Set up SSL certificates (external to container)
- [ ] Configure load balancer/reverse proxy
- [ ] Set up log aggregation
- [ ] Configure monitoring and alerts
- [ ] Test health check endpoint
- [ ] Verify backup and recovery procedures