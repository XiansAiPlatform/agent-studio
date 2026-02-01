# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Agent Studio project.

## Available Workflows

### `dockerhub-deploy.yml`
Automatically builds and publishes Docker images to DockerHub when version tags are pushed.

**Triggers:**
- Push of version tags (e.g., `v1.0.0`, `v2.1.0`, etc.)
- Manual workflow dispatch

**Features:**
- Multi-platform builds (AMD64, ARM64)
- Semantic versioning support
- GitHub Actions cache optimization
- Comprehensive build summaries

## Setup Instructions

### 1. Configure DockerHub Organization

Update the environment variables in `dockerhub-deploy.yml`:

```yaml
env:
  IMAGE_NAME: agent-studio
  DOCKERHUB_USERNAME: your-dockerhub-username    # Your DockerHub username
  DOCKERHUB_ORG: your-dockerhub-org              # Your DockerHub organization
```

### 2. Set GitHub Secrets

Add the following secret to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - **Name:** `DOCKERHUB_TOKEN`
   - **Value:** Your DockerHub access token

#### Creating a DockerHub Access Token

1. Go to [DockerHub Account Settings](https://hub.docker.com/settings/security)
2. Click **New Access Token**
3. Name: `github-actions-agent-studio`
4. Permissions: **Read, Write, Delete**
5. Copy the generated token and add it to GitHub secrets

## Usage

### Automatic Deployment

Create and push a version tag:

```bash
# Create a new version
git tag v1.0.0
git push origin v1.0.0

# The workflow will automatically:
# 1. Build the Docker image
# 2. Create semantic version tags (v1.0.0, v1.0, v1, latest)
# 3. Push to DockerHub
# 4. Generate a detailed build summary
```

### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select **Build and Publish Agent Studio to DockerHub**
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Workflow Outputs

The workflow generates:

- **Multi-platform images** (AMD64, ARM64)
- **Semantic version tags:**
  - `v1.2.3` (exact version)
  - `v1.2` (minor version)
  - `v1` (major version)  
  - `latest` (only for stable releases, no pre-release suffixes)

## Build Summary Example

After successful deployment, you'll see a summary like:

```
🚀 Agent Studio Docker Image Published Successfully!

Image: 99xio/agent-studio

Tags:
- 99xio/agent-studio:v1.0.0
- 99xio/agent-studio:v1.0
- 99xio/agent-studio:v1
- 99xio/agent-studio:latest

Platforms: linux/amd64, linux/arm64

Docker Pull Command:
docker pull 99xio/agent-studio:latest

Quick Start:
# Create environment file
cat > .env.production << EOF
XIANS_APIKEY=your-api-key
XIANS_SERVER_URL=https://your-server.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret
EOF

# Run the container
docker run -d --name agent-studio -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  99xio/agent-studio:latest

Health Check:
curl http://localhost:3000/api/health
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid credentials" | Check `DOCKERHUB_TOKEN` secret is correctly set |
| "Repository not found" | Verify `DOCKERHUB_ORG` and `IMAGE_NAME` are correct |
| "Build failed" | Check Dockerfile syntax and build context |
| "Permission denied" | Ensure DockerHub token has Write permissions |

### Debug Tips

- Check the **Actions** tab for detailed logs
- Verify all environment variables in the workflow file
- Test Docker build locally before pushing tags
- Ensure DockerHub repository exists and is accessible