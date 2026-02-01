# Final Deployment Steps

## ✅ Current Status
- Docker infrastructure: **Complete**
- TypeScript fixes: **Complete**  
- Documentation: **Complete**
- Builds: **Passing (0 errors)**

## 🎯 To Deploy Right Now

### Step 1: Configure DockerHub Integration (2 minutes)

**A. Update GitHub Workflow**
Edit `.github/workflows/dockerhub-deploy.yml`:
```yaml
env:
  IMAGE_NAME: agent-studio
  DOCKERHUB_USERNAME: hasithy99x    # ← Your DockerHub username
  DOCKERHUB_ORG: 99xio              # ← Your DockerHub org
```

**B. Add GitHub Secret**
1. Go to GitHub repo → Settings → Secrets → Actions
2. Click "New repository secret"
3. Name: `DOCKERHUB_TOKEN`
4. Value: Your DockerHub access token
   - Get from: https://hub.docker.com/settings/security
   - Create new token with Read/Write/Delete permissions

### Step 2: Configure Production Environment (3 minutes)

Edit `.env.production` with real values:
```bash
# Xians Configuration
XIANS_APIKEY=sk-Xnai-your-actual-api-key
XIANS_SERVER_URL=https://your-production-server.com

# NextAuth  
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)  # Generate fresh secret

# Google OAuth
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret

# Azure AD OAuth
AZURE_AD_CLIENT_ID=your-production-azure-client-id
AZURE_AD_CLIENT_SECRET=your-production-azure-client-secret
AZURE_AD_TENANT_ID=your-azure-tenant-id
```

### Step 3: Create First Release (1 minute)

```bash
# Commit Docker files
git add .
git commit -m "Add Docker deployment infrastructure and TypeScript fixes"
git push origin main

# Create version tag
export VERSION=1.0.0
git tag -a v$VERSION -m "Release v$VERSION - Initial Docker deployment"
git push origin v$VERSION
```

**What Happens Next:**
1. GitHub Actions triggers automatically
2. Builds multi-platform Docker image (5-10 min)
3. Pushes to DockerHub with tags: `v1.0.0`, `v1.0`, `v1`, `latest`
4. Provides deployment summary

### Step 4: Deploy to Production (1 minute)

**Option A: Docker Compose**
```bash
docker pull 99xio/agent-studio:latest
docker-compose up -d
```

**Option B: Deploy Script**
```bash
./scripts/deploy.sh production v1.0.0
```

**Option C: Direct Docker Run**
```bash
docker run -d --name agent-studio \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  99xio/agent-studio:latest
```

### Step 5: Verify Deployment (30 seconds)

```bash
# Check health
curl https://your-domain.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":123}

# View logs
docker-compose logs -f agent-studio
```

## 🔧 Local Testing (Before Production)

Test everything locally first:

```bash
# 1. Test local build
npm run build

# 2. Test Docker build
docker build -t agent-studio:test .

# 3. Test Docker run
docker run -d --name test-agent-studio \
  -p 3001:3000 \
  --env-file .env.local \
  agent-studio:test

# 4. Test health check
curl http://localhost:3001/api/health

# 5. Test application
open http://localhost:3001

# 6. Clean up
docker stop test-agent-studio && docker rm test-agent-studio
```

## 📊 Deployment Verification Checklist

After deployment, verify:

- [ ] Health endpoint responds: `/api/health`
- [ ] Application loads correctly
- [ ] Authentication works (Google/Azure OAuth)
- [ ] Tenant validation functions
- [ ] API routes respond correctly
- [ ] WebSocket connections work (if applicable)
- [ ] No errors in container logs
- [ ] Resource usage is normal (CPU, memory)

## 🚨 Rollback Procedure

If issues occur:

```bash
# Quick rollback to previous version
docker pull 99xio/agent-studio:v0.9.9  # Previous version
docker-compose up -d

# Or stop completely
docker-compose down
```

## 📞 Common Issues & Solutions

### Issue: GitHub Actions Build Fails
**Solution**: Check workflow logs in Actions tab
- Verify `DOCKERHUB_TOKEN` secret is set
- Confirm DockerHub org/username is correct

### Issue: Container Exits Immediately
**Solution**: Check container logs
```bash
docker logs agent-studio
```
Common causes:
- Missing environment variables
- Invalid `NEXTAUTH_SECRET`
- Port conflicts

### Issue: Health Check Fails
**Solution**: Verify network and routing
```bash
# Inside container
docker exec agent-studio wget -O- http://localhost:3000/api/health

# Check if container is running
docker ps | grep agent-studio
```

## 🎯 Timeline Estimate

- **First-time setup**: ~10 minutes
- **GitHub Actions build**: ~5-10 minutes
- **Subsequent deployments**: ~2 minutes
- **Rollback**: ~1 minute

## 💡 Pro Tips

1. **Tag Naming**: Use semantic versioning (v1.0.0)
   - Stable: `v1.0.0` → creates `latest` tag
   - Pre-release: `v1.0.0-beta` → no `latest` tag

2. **Environment Files**: Keep separate files per environment
   - `.env.local` - local development
   - `.env.staging` - staging environment
   - `.env.production` - production

3. **Monitoring**: Set up alerts for:
   - Health check failures
   - High memory/CPU usage
   - Application errors in logs

4. **Updates**: Always test in staging before production
   ```bash
   ./scripts/deploy.sh staging v1.1.0
   # Test thoroughly
   ./scripts/deploy.sh production v1.1.0
   ```

---

**You're all set! 🚀 The application is ready for production deployment.**

For questions or issues, refer to:
- `docs/deploy/DOCKER_SETUP.md` - Comprehensive guide
- `TYPESCRIPT_FIX_SUMMARY.md` - Type system details
- `.github/workflows/README.md` - CI/CD specifics