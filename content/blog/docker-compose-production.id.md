---
title: "Docker Compose di Production: Melampaui Development"
description: "Migrasi Docker Compose dari development ke production memerlukan konfigurasi yang hati-hati untuk keamanan, reliabilitas, dan deployment zero-downtime. Berikut cara melakukannya dengan benar."
date: 2026-06-11
tags: ["docker", "docker-compose", "devops", "production", "containers", "deployment"]
lang: "id"
---

# Docker Compose di Production: Melampaui Development

Docker Compose adalah alat utama untuk development lokal, tetapi banyak tim ragu menggunakannya di production. Kekhawatiran ini valid—konfigurasi default Compose kekurangan elemen penting production seperti manajemen secret, health check, dan logging yang tepat. Namun, dengan pola yang benar, Docker Compose dapat menjalankan workload production dengan andal, terutama untuk aplikasi kecil hingga menengah.

Berikut cara mengubah `docker-compose.yml` Anda dari ramah-development menjadi siap-production.

## 1. Manajemen Secret

Jangan pernah hardcode credential di file Compose. Gunakan Docker secrets atau file environment dengan permission yang tepat.

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

Buat direktori secrets dengan permission terbatas:
```bash
mkdir -p secrets
chmod 700 secrets
echo "password-aman-anda" > secrets/db_password.txt
chmod 600 secrets/db_password.txt
```

Untuk secret eksternal (seperti Docker Swarm atau cloud KMS):
```bash
echo "api-key-anda" | docker secret create api_key -
```

## 2. Health Check dan Dependency Management

Service harus menunggu dependency sehat, bukan hanya berjalan.

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

`condition: service_healthy` memastikan aplikasi Anda hanya mulai ketika dependency benar-benar siap, bukan hanya ketika container-nya berjalan.

## 3. Batasan dan Reservasi Resource

Cegah kelaparan resource dan pastikan performa yang predictable.

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

Catatan: Key `deploy` memerlukan Compose v3.4+ dan bekerja dengan Docker Swarm. Untuk Docker Compose standalone, gunakan:

```yaml
services:
  app:
    image: your-app:${TAG}
    cpus: '2'
    mem_limit: 1G
    mem_reservation: 512M
```

## 4. Konfigurasi Logging

Logging JSON default dapat mengisi disk space dengan cepat. Konfigurasikan log rotation dan external drivers.

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

Untuk production, pertimbangkan external logging drivers:
- `awslogs` untuk AWS CloudWatch
- `gelf` untuk Graylog
- `fluentd` untuk logging terpusat
- `splunk` untuk monitoring enterprise

## 5. Deployment Zero-Downtime

Gunakan konfigurasi `rollout` untuk update bertahap tanpa downtime.

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

Konfigurasi ini:
- Update satu replica sekaligus (`parallelism: 1`)
- Tunggu 10 detik antar update (`delay: 10s`)
- Mulai container baru sebelum menghentikan yang lama (`order: start-first`)
- Monitor selama 60 detik sebelum menganggap update sukses
- Rollback otomatis jika gagal
- Restart container yang gagal dengan exponential backoff

## 6. Keamanan Jaringan

Isolasi service dan kontrol aliran traffic.

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
    internal: true  # Tidak ada akses eksternal
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

Jaringan internal mencegah exposure database. Aplikasi dapat berbicara ke kedua jaringan, tetapi PostgreSQL hanya dapat diakses dari jaringan backend.

## 7. Manajemen Konfigurasi dengan Multiple Files

Pisahkan konfigurasi untuk environment yang berbeda.

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

Deploy dengan:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 8. Monitoring dan Metrics

Tambahkan Prometheus exporters dan health endpoints.

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

## 9. Strategi Backup

Otomatisasi backup database dalam setup Compose Anda.

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

Bungkus semuanya dalam script deployment untuk konsistensi.

```bash
#!/bin/bash
set -e

# Load environment
export TAG=$(git rev-parse --short HEAD)
export COMPOSE_PROJECT_NAME=myapp-prod

# Validasi secret ada
if [ ! -f "./secrets/db_password.txt" ]; then
    echo "Error: secrets/db_password.txt tidak ditemukan"
    exit 1
fi

# Pull image terbaru
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull

# Deploy dengan zero downtime
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale app=3

# Tunggu health check
sleep 30

# Verifikasi deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl -f http://localhost:3000/health || exit 1

# Hapus container lama
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans
```

## Kapan Harus Pindah dari Docker Compose

Docker Compose bekerja baik untuk:
- Aplikasi kecil hingga menengah
- Deployment single-host
- Tim yang familiar dengan Docker
- Rapid prototyping

Pertimbangkan Kubernetes atau Docker Swarm ketika:
- Membutuhkan multi-host clustering
- Autoscaling advanced diperlukan
- Networking kompleks antar data center
- Service discovery grade enterprise
- Memiliki 10+ microservices

## Kesimpulan

Docker Compose di production layak dengan konfigurasi yang tepat. Kuncinya adalah memperlakukannya sebagai alat production, bukan hanya kemudahan development. Implementasikan health check, batasan resource, logging yang tepat, dan pola deployment zero-downtime. Monitor semuanya, backup data Anda, dan miliki rencana rollback.

Untuk banyak aplikasi, pendekatan ini memberikan 90% manfaat Kubernetes dengan 10% kompleksitasnya. Mulai dengan Compose, scale ketika Anda perlu, bukan sebelumnya.