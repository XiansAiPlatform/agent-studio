#!/bin/bash

# Deployment Script for Agent Studio
# This script helps deploy the application to different environments

set -e

# Configuration
ENVIRONMENTS=("development" "staging" "production")
DEFAULT_ENV="production"
IMAGE_NAME="agent-studio"
REGISTRY="your-dockerhub-username"  # Replace with your DockerHub username

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
    echo "Agent Studio Deployment Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [VERSION]"
    echo ""
    echo "Environments:"
    echo "  development  - Deploy for development"
    echo "  staging      - Deploy for staging"
    echo "  production   - Deploy for production (default)"
    echo ""
    echo "Options:"
    echo "  VERSION      - Docker image version (default: latest)"
    echo "  -h, --help   - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy production with latest"
    echo "  $0 staging                  # Deploy staging with latest"
    echo "  $0 production v1.0.0        # Deploy production with v1.0.0"
}

# Parse command line arguments
ENVIRONMENT=${1:-$DEFAULT_ENV}
VERSION=${2:-latest}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# Validate environment
if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    print_error "Invalid environment: ${ENVIRONMENT}"
    print_status "Valid environments: ${ENVIRONMENTS[*]}"
    exit 1
fi

# Check required tools
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check environment file
ENV_FILE=".env.${ENVIRONMENT}"
if [[ "$ENVIRONMENT" == "development" ]]; then
    ENV_FILE=".env.local"
fi

if [[ ! -f "$ENV_FILE" ]]; then
    print_error "Environment file not found: $ENV_FILE"
    print_status "Please create $ENV_FILE based on .env.example"
    exit 1
fi

# Validate environment file has required variables
required_vars=("XIANS_APIKEY" "XIANS_SERVER_URL" "NEXTAUTH_URL" "NEXTAUTH_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" "$ENV_FILE" || grep -q "^${var}=your-\|^${var}=replace-with-" "$ENV_FILE"; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    print_error "Missing or placeholder values in $ENV_FILE:"
    for var in "${missing_vars[@]}"; do
        print_error "  - $var"
    done
    print_status "Please update $ENV_FILE with actual values"
    exit 1
fi

print_status "Deploying Agent Studio to ${ENVIRONMENT} environment"
print_status "Image: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
print_status "Environment file: ${ENV_FILE}"

# Pull the latest image
print_status "Pulling Docker image..."
docker pull ${REGISTRY}/${IMAGE_NAME}:${VERSION}

# Choose the appropriate docker-compose file
COMPOSE_FILE="docker-compose.yml"
if [[ "$ENVIRONMENT" == "development" ]]; then
    COMPOSE_FILE="docker-compose.dev.yml"
fi

# Set environment variables for docker-compose
export IMAGE_TAG=${VERSION}
export ENV_FILE=${ENV_FILE}

# Stop existing services
print_status "Stopping existing services..."
if [[ "$ENVIRONMENT" == "development" ]]; then
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
else
    docker-compose down 2>/dev/null || true
fi

# Start services
print_status "Starting services..."
if [[ "$ENVIRONMENT" == "development" ]]; then
    docker-compose -f docker-compose.dev.yml --env-file ${ENV_FILE} up -d
else
    docker-compose --env-file ${ENV_FILE} up -d
fi

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Health check
print_status "Performing health check..."
HEALTH_URL="http://localhost:3000/api/health"
if [[ "$ENVIRONMENT" == "development" ]]; then
    HEALTH_URL="http://localhost:3010/api/health"
fi

for i in {1..30}; do
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        print_success "Health check passed!"
        break
    fi
    if [[ $i -eq 30 ]]; then
        print_error "Health check failed after 30 attempts"
        print_status "Check logs with: docker-compose logs -f"
        exit 1
    fi
    sleep 2
done

# Show deployment status
print_success "Deployment completed successfully!"
print_status "Environment: ${ENVIRONMENT}"
print_status "Version: ${VERSION}"
print_status "Health endpoint: ${HEALTH_URL}"

if [[ "$ENVIRONMENT" == "development" ]]; then
    print_status "Application URL: http://localhost:3010"
else
    print_status "Application URL: http://localhost:3000"
fi

# Show useful commands
echo ""
print_status "Useful commands:"
if [[ "$ENVIRONMENT" == "development" ]]; then
    echo "  View logs: docker-compose -f docker-compose.dev.yml logs -f"
    echo "  Stop services: docker-compose -f docker-compose.dev.yml down"
else
    echo "  View logs: docker-compose logs -f"
    echo "  Stop services: docker-compose down"
fi
echo "  Health check: curl ${HEALTH_URL}"