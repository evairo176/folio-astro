---
title: "Docker Compose in Production: Beyond Development"
description: "Moving Docker Compose from development to production requires careful configuration for security, reliability, and zero-downtime deployments. Here's how to do it right."
date: 2026-06-11
tags: ["docker", "docker-compose", "devops", "production", "containers", "deployment"]
lang: "en"
---

# Docker Compose in Production: Beyond Development

Docker Compose is the go-to tool for local development, but many teams hesitate to use it in production. The concern is valid—default Compose configurations lack production essentials like secrets management, health checks, and proper logging. However, with the right patterns, Docker Compose can power production workloads reliably, especially for small to medium applications.

Here's how to transform your `docker-compose.yml` from development-friendly to production-ready.

## 1. Secrets Management

Never hardcode credentials in your Compose file. Use Docker secrets or environment files with proper permissions.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    image: your-app:${TAG:-latest}
    secrets:
      - db_password
      - api_key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      API_KEY_FILE: /run/secrets/api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    external: true

volumes:
  postgres_data:
```

Create secrets directory with restricted permissions:
```bash
mkdir -p secrets
chmod 700 secrets
echo "your-secure-password" > secrets/db_password.txt
chmod 600 secrets/db_password.txt
```

For external secrets (like Docker Swarm or cloud KMS):
```bash
echo "your-api-key" | docker secret create api_key -
```

## 2. Health Checks and Dependency Management

Services should wait for dependencies to be healthy, not just running.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  app:
    image: your-app:${TAG}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

The `condition: service_healthy` ensures your app only starts when dependencies are truly ready, not just when their containers are running.

## 3. Resource Limits and Reservations

Prevent resource starvation and ensure predictable performance.

```yaml
services:
  app:
    image: your-app:${TAG}
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
```

Note: The `deploy` key requires Compose v3.4+ and works with Docker Swarm. For standalone Docker Compose, use:

```yaml
services:
  app:
    image: your-app:${TAG}
    cpus: '2'
    mem_limit: 1G
    mem_reservation: 512M
```

## 4. Logging Configuration

Default JSON logging can fill disk space quickly. Configure log rotation and external drivers.

```yaml
services:
  app:
    image: your-app:${TAG}
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        tag: "{{.Name}}/{{.ImageName}}"

  nginx:
    image: nginx:alpine
    logging:
      driver: "syslog"
      options:
        syslog-address: "tcp://192.168.1.100:514"
        tag: "nginx"
```

For production, consider external logging drivers:
- `awslogs` for AWS CloudWatch
- `gelf` for Graylog
- `fluentd` for centralized logging
- `splunk` for enterprise monitoring

## 5. Zero-Downtime Deployments

Use the `rollout` configuration for gradual updates without downtime.

```yaml
services:
  app:
    image: your-app:${TAG}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
        failure_action: rollback
        monitor: 60s
      rollback_config:
        parallelism: 0
        order: stop-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
```

This configuration:
- Updates one replica at a time (`parallelism: 1`)
- Waits 10 seconds between updates (`delay: 10s`)
- Starts new container before stopping old (`order: start-first`)
- Monitors for 60 seconds before considering update successful
- Rolls back automatically on failure
- Restarts failed containers with exponential backoff

## 6. Network Security

Isolate services and control traffic flow.

```yaml
networks:
  frontend:
    driver: bridge
    internal: false
    ipam:
      config:
        - subnet: 172.20.0.0/24

  backend:
    driver: bridge
    internal: true  # No external access
    ipam:
      config:
        - subnet: 172.21.0.0/24

services:
  nginx:
    image: nginx:alpine
    networks:
      - frontend
    ports:
      - "80:80"
      - "443:443"

  app:
    image: your-app:${TAG}
    networks:
      - frontend
      - backend

  postgres:
    image: postgres:16-alpine
    networks:
      - backend
```

Internal networks prevent database exposure. The app can talk to both networks, but PostgreSQL is only accessible from the backend network.

## 7. Configuration Management with Multiple Files

Split configuration for different environments.

```yaml
# docker-compose.yml (base)
version: '3.8'

services:
  app:
    image: your-app:${TAG:-latest}
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```yaml
# docker-compose.prod.yml (production overrides)
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  postgres:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
```

Deploy with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 8. Monitoring and Metrics

Add Prometheus exporters and health endpoints.

```yaml
services:
  app:
    image: your-app:${TAG}
    labels:
      - "prometheus.scrape=true"
      - "prometheus.port=3000"
      - "prometheus.path=/metrics"

  node-exporter:
    image: prom/node-exporter:latest
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "9100:9100"

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    ports:
      - "8080:8080"
```

## 9. Backup Strategy

Automate database backups within your Compose setup.

```yaml
services:
  postgres-backup:
    image: postgres:16-alpine
    command: >
      bash -c "
        while true; do
          pg_dump -h postgres -U postgres mydb | gzip > /backups/backup-$$(date +%Y%m%d-%H%M%S).sql.gz
          find /backups -name '*.sql.gz' -mtime +7 -delete
          sleep 3600
        done
      "
    environment:
      PGPASSWORD_FILE: /run/secrets/db_password
    volumes:
      - backup_data:/backups
    depends_on:
      - postgres

volumes:
  backup_data:
```

## 10. Deployment Script

Wrap everything in a deployment script for consistency.

```bash
#!/bin/bash
set -e

# Load environment
export TAG=$(git rev-parse --short HEAD)
export COMPOSE_PROJECT_NAME=myapp-prod

# Validate secrets exist
if [ ! -f "./secrets/db_password.txt" ]; then
    echo "Error: secrets/db_password.txt not found"
    exit 1
fi

# Pull latest images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull

# Deploy with zero downtime
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale app=3

# Wait for health checks
sleep 30

# Verify deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl -f http://localhost:3000/health || exit 1

# Remove old containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans
```

## When to Move Beyond Docker Compose

Docker Compose works well for:
- Small to medium applications
- Single-host deployments
- Teams familiar with Docker
- Rapid prototyping

Consider Kubernetes or Docker Swarm when:
- You need multi-host clustering
- Advanced autoscaling is required
- Complex networking across data centers
- Enterprise-grade service discovery
- You have 10+ microservices

## Conclusion

Docker Compose in production is viable with proper configuration. The key is treating it as a production tool, not just a development convenience. Implement health checks, resource limits, proper logging, and zero-downtime deployment patterns. Monitor everything, back up your data, and have a rollback plan.

For many applications, this approach provides 90% of Kubernetes' benefits with 10% of the complexity. Start with Compose, scale when you need to, not before.