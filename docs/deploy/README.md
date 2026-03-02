# Deployment Documentation

> **✅ Status**: Production Ready - All builds successful, zero TypeScript errors!

This directory contains deployment guides and configuration for the Agent Studio application.

## 📚 Available Documentation

### Quick Start
- **[QUICK_START.md](./QUICK_START.md)** - 3-step deployment guide

### Guides
- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Complete Docker guide
  - Environment configuration, image building, CI/CD
  - Cloud deployment (AWS ECS, Kubernetes)
  - Production checklist, troubleshooting

## 🚀 Quick Start

For immediate Docker deployment:

```bash
# 1. Setup environment
cp .env.example .env.production
# Edit .env.production with your actual values

# 2. Build Docker image
docker build -t agent-studio .

# 3. Deploy
docker-compose up -d

# 4. Verify
curl http://localhost:3000/api/health
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   Docker Container (agent-studio)       │
│  ┌───────────────────────────────────┐  │
│  │   Next.js Application             │  │
│  │   - Node.js 20 Runtime            │  │
│  │   - Standalone Output             │  │
│  │   - Port 3000                     │  │
│  │   - Non-root User (nextjs)        │  │
│  └───────────────────────────────────┘  │
│                                          │
│  Environment Variables:                  │
│  - XIANS_APIKEY                         │
│  - XIANS_SERVER_URL                     │
│  - NEXTAUTH_SECRET                      │
│  - OAuth Credentials                    │
└─────────────────────────────────────────┘
         ↓ Published to DockerHub
    via GitHub Actions (on tag push)
```

## 🎯 Features

### Build System
✅ Multi-stage Docker build (optimized size)
✅ Node.js 20 (Next.js 16+ compatible)
✅ TypeScript with zero errors
✅ Production standalone output
✅ Multi-platform support (AMD64, ARM64)

### Security
✅ Non-root user execution
✅ Security headers configured
✅ Secure session management
✅ Build-time vs runtime secret separation

### DevOps
✅ Docker Compose for orchestration
✅ GitHub Actions CI/CD pipeline
✅ Health check endpoints
✅ Environment-based configuration
✅ Automated semantic versioning

## 📋 Deployment Workflows

### Local Development
```bash
docker-compose -f docker-compose.dev.yml up -d
# Access at http://localhost:3010
```

### Staging Environment
```bash
cp .env.example .env.staging
# Configure staging values
docker-compose --env-file .env.staging up -d
```

### Production Deployment
```bash
# Automated via GitHub Actions
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0

# Manual deployment
./scripts/deploy.sh production v1.0.0
```

## 🔧 Maintenance

### Update Application
```bash
# Pull latest image
docker pull your-org/agent-studio:latest

# Restart with new image
docker-compose pull && docker-compose up -d
```

### View Logs
```bash
docker-compose logs -f agent-studio
```

### Backup and Restore
```bash
# Backup environment
cp .env.production .env.production.backup

# Container data is stateless - all state in external services
```

## 🆘 Support & Troubleshooting

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for:
- Common issues and solutions
- Debug commands
- Performance optimization
- Health monitoring

## 📚 Additional Resources

- [Main Guide](./DOCKER_SETUP.md) - Full reference including cloud deployment (AWS ECS, Kubernetes)
- [GitHub Workflows](../../.github/workflows/README.md) - CI/CD automation details
- [Project README](../../README.md) - General project information
- [Development Guide](../development.md) - Local development setup

---

**Last Updated**: February 2026  
**Docker Image**: [99xio/agent-studio](https://hub.docker.com/r/99xio/agent-studio) (update with your org)  
**Build Status**: ✅ Passing