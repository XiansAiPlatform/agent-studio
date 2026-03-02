# Quick Start - Docker Deployment

## 🚀 Get Started in 3 Steps

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.example .env.production

# Edit with your values
nano .env.production
```

**Required Variables:**
```bash
XIANS_APIKEY=your-api-key-here
XIANS_SERVER_URL=https://your-server.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Build Docker Image

```bash
# Local build
docker build -t agent-studio .

# Or use build script
./scripts/docker-build.sh
```

### 3. Deploy

```bash
# Production
docker-compose up -d

# Development
docker-compose -f docker-compose.dev.yml up -d
```

## ✅ Verify Deployment

```bash
# Check health
curl http://localhost:3000/api/health

# View logs
docker-compose logs -f
```

## 📚 Documentation

- **Complete Guide**: [DOCKER_SETUP.md](./DOCKER_SETUP.md)
- **GitHub Actions**: [.github/workflows/README.md](../../.github/workflows/README.md)

## 🎯 Key Features

✅ Multi-platform (AMD64, ARM64)
✅ Node.js 20 (Next.js 16+ compatible)
✅ Security hardened (non-root user)
✅ Health checks built-in
✅ Environment-based configuration
✅ Production optimized (~90MB image)

## 🔧 Troubleshooting

### Build Fails
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t agent-studio .
```

### Container Won't Start
```bash
# Check logs
docker logs agent-studio

# Verify environment
docker exec agent-studio env | grep -E "(NEXT|XIANS)"
```

### Type Errors During Build
Run `npm run type-check` to diagnose. Ensure TypeScript and dependencies are up to date.

## 🚢 GitHub Actions Deployment

```bash
# Create and push version tag
export VERSION=1.0.0
git tag -a v$VERSION -m "Release v$VERSION"
git push origin v$VERSION

# GitHub Actions automatically:
# 1. Builds multi-platform Docker image
# 2. Pushes to DockerHub
# 3. Creates semantic version tags
```

## 📝 Next Steps

1. ✅ Configure production environment variables
2. ✅ Update DockerHub registry name in scripts
3. ✅ Set up GitHub secrets for CI/CD
4. ✅ Deploy and test
5. ✅ Monitor application logs
6. ✅ Configure SSL/TLS (external to container)

---

For detailed information, see the complete documentation in `docs/deploy/`.