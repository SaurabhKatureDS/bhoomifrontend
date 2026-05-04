#!/bin/bash
# Configure AWS CLI
aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID}
aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY}
aws configure set region ${AWS_REGION}

# Login to AWS ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Pull the latest frontend image
docker pull ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}

# Create shared Docker network (if not exists)
docker network create bhoomi-network 2>/dev/null || true

# Stop existing frontend container
docker-compose -f docker-compose.prod.yml down || true

# Run frontend container (--force-recreate ensures new image is always used)
docker-compose -f docker-compose.prod.yml up -d --force-recreate
