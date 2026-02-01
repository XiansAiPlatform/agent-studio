# Deployment Documentation

This directory contains deployment guides and configuration for the Agent Studio application.

## Available Documentation

- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Complete Docker containerization and deployment guide
  - Environment configuration
  - Image building and publishing
  - Instance management
  - Production deployment checklist

## Quick Start

For immediate Docker deployment:

```bash
# 1. Setup environment
cp .env.example .env.production
# Edit .env.production with your values

# 2. Build and deploy
./scripts/docker-build.sh
docker-compose up -d

# 3. Verify deployment
curl http://localhost:3000/api/health
```

## Additional Resources

- [Main Docker Deployment Guide](../../DOCKER_DEPLOYMENT.md) - Comprehensive documentation with cloud examples
- [Project README](../../README.md) - General project information
- [Development Guide](../development.md) - Local development setup