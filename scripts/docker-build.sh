#!/bin/bash

# Docker Build Script for Agent Studio
# This script builds and optionally pushes the Docker image to DockerHub

set -e

# Configuration
IMAGE_NAME="agent-studio"
REGISTRY="your-dockerhub-username"  # Replace with your DockerHub username
VERSION=${1:-latest}
PLATFORM=${2:-linux/amd64,linux/arm64}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [VERSION] [PLATFORM]"
    echo "  VERSION: Docker image version tag (default: latest)"
    echo "  PLATFORM: Target platforms (default: linux/amd64,linux/arm64)"
    echo ""
    echo "Examples:"
    echo "  $0                          # Build latest version"
    echo "  $0 v1.0.0                   # Build specific version"
    echo "  $0 v1.0.0 linux/amd64      # Build for specific platform"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# Validate Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker first."
    exit 1
fi

# Build the image
print_status "Building Docker image: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"

# Create builder if it doesn't exist (for multi-platform builds)
if [[ "$PLATFORM" == *","* ]]; then
    print_status "Setting up multi-platform builder..."
    docker buildx create --use --name agent-studio-builder 2>/dev/null || docker buildx use agent-studio-builder
fi

# Build the image
print_status "Building for platforms: ${PLATFORM}"
docker buildx build \
    --platform ${PLATFORM} \
    --tag ${REGISTRY}/${IMAGE_NAME}:${VERSION} \
    --tag ${REGISTRY}/${IMAGE_NAME}:latest \
    --load \
    .

print_success "Docker image built successfully!"
print_status "Image: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"

# Show image size
IMAGE_SIZE=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "${REGISTRY}/${IMAGE_NAME}:${VERSION}" | awk '{print $2}')
print_status "Image size: ${IMAGE_SIZE}"

# Ask if user wants to push to DockerHub
echo ""
read -p "Do you want to push the image to DockerHub? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if logged in to DockerHub
    if ! docker info | grep -q "Username:"; then
        print_warning "Not logged in to DockerHub. Please run 'docker login' first."
        read -p "Do you want to login now? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker login
        else
            print_error "Skipping push. Please login to DockerHub and run the push command manually:"
            print_status "docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
            print_status "docker push ${REGISTRY}/${IMAGE_NAME}:latest"
            exit 1
        fi
    fi
    
    print_status "Pushing image to DockerHub..."
    docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}
    docker push ${REGISTRY}/${IMAGE_NAME}:latest
    print_success "Image pushed successfully!"
    
    print_status "DockerHub URL: https://hub.docker.com/r/${REGISTRY}/${IMAGE_NAME}"
else
    print_status "Skipping push. To push later, run:"
    print_status "docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
    print_status "docker push ${REGISTRY}/${IMAGE_NAME}:latest"
fi

print_success "Build process completed!"