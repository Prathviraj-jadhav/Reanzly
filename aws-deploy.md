# Reanzly — AWS Deployment Guide

This guide walks you through deploying Reanzly to AWS using **three options**,
from simplest to most production-grade:

- **Option A — EC2 + Docker Compose** (fastest, single instance)
- **Option B — ECS Fargate + ALB + RDS** (scalable, managed)
- **Option C — Elastic Beanstalk** (middle ground)

The repository ships with everything you need: `Dockerfile`,
`docker-compose.yml`, `docker-entrypoint.sh`, `.env.example`, and
`build-zip.sh` (produces `download/reanzly-source.zip`).

---

## 0. Build the deployable artefact

### Option 1 — Source ZIP (upload to S3, build on AWS)

```bash
chmod +x build-zip.sh
./build-zip.sh
# → download/reanzly-source.zip
```

Upload to S3:
```bash
aws s3 mb s3://reanzly-deploy
aws s3 cp download/reanzly-source.zip s3://reanzly-deploy/reanzly-source.zip
```

### Option 2 — Docker image (build locally, push to ECR)

```bash
docker build -t reanzly:latest .

aws ecr create-repository --repository-name reanzly --region ap-south-1
# note the <account>.dkr.ecr.<region>.amazonaws.com/reanzly URI

aws ecr get-login-password --region ap-south-1 \
  | docker login --username AWS --password-stdin <account>.dkr.ecr.ap-south-1.amazonaws.com

docker tag reanzly:latest <account>.dkr.ecr.ap-south-1.amazonaws.com/reanzly:latest
docker push <account>.dkr.ecr.ap-south-1.amazonaws.com/reanzly:latest
```

---

## Option A — EC2 + Docker Compose (fastest)

### A1. Launch an EC2 instance

```bash
aws ec2 run-instances \
  --image-id ami-0f58b397bc5c1f2e6 \
  --instance-type t3.medium \
  --key-name your-key \
  --security-group-ids sg-xxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=reanzly}]' \
  --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=30,VolumeType=gp3}'
```

- **AMI**: Ubuntu Server 22.04 LTS (x86_64) in your region.
- **Instance type**: `t3.medium` minimum (2 vCPU / 4 GB). `t3.large` recommended.
- **Storage**: 30 GB gp3.
- **Security group**: open inbound **80** (HTTP) and **443** (HTTPS) and **22** (SSH).

### A2. Install Docker on the instance

```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu
# log out and back in for the group change to take effect
```

### A3. Get the source onto the instance

Either copy the ZIP:
```bash
aws s3 cp s3://reanzly-deploy/reanzly-source.zip .
unzip reanzly-source.zip
cd reanzly
```

Or git clone if you pushed to CodeCommit/GitHub.

### A4. Configure environment

```bash
cp .env.example .env
nano .env
```

Set at minimum:
```
NODE_ENV=production
DATABASE_URL=file:/app/db/custom.db
NEXTAUTH_URL=http://<EC2-PUBLIC-IP>
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

For a real production DB, point `DATABASE_URL` at RDS Postgres (see Option B).

### A5. Build & run

```bash
docker compose up -d --build
```

This starts:
- Next.js on **:3000**
- Chat service on **:3003**
- Caddy gateway on **:80**

Visit `http://<EC2-PUBLIC-IP>`.

### A6. HTTPS (recommended)

Point a Route53 record at the EC2 IP, then edit `Caddyfile.docker` (rename to
`Caddyfile`) replacing `:80` with your domain and uncomment `tls`. Caddy will
auto-provision a Let's Encrypt certificate.

```bash
docker compose restart
```

---

## Option B — ECS Fargate + ALB + RDS (scalable, managed)

### B1. Provision RDS Postgres

```bash
# DB subnet group + security group first (allow 5432 from the ECS SG)
aws rds create-db-subnet-group --db-subnet-group-name reanzly-sng \
  --subnet-ids subnet-aaa subnet-bbb subnet-ccc \
  --db-subnet-group-description "Reanzly DB subnets"

aws rds create-db-instance \
  --db-instance-identifier reanzly-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username reanzly \
  --master-user-password "$(openssl rand -base64 24)" \
  --allocated-storage 30 \
  --db-subnet-group-name reanzly-sng \
  --vpc-security-group-ids sg-db-xxxx
```

Note the endpoint; your `DATABASE_URL` becomes:
```
postgresql://reanzly:<password>@<rds-endpoint>:5432/reanzly?schema=public
```

### B2. Create an ECS cluster

```bash
aws ecs create-cluster --cluster-name reanzly-prod
```

### B3. Register a task definition

Create `reanzly-task.json`:
```json
{
  "family": "reanzly",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "3072",
  "executionRoleArn": "arn:aws:iam::<account>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<account>:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "reanzly",
      "image": "<account>.dkr.ecr.ap-south-1.amazonaws.com/reanzly:latest",
      "essential": true,
      "portMappings": [
        {"containerPort": 80, "hostPort": 80, "protocol": "tcp"},
        {"containerPort": 3000, "hostPort": 3000, "protocol": "tcp"},
        {"containerPort": 3003, "hostPort": 3003, "protocol": "tcp"}
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"},
        {"name": "CHAT_SERVICE_PORT", "value": "3003"},
        {"name": "NEXTAUTH_URL", "value": "https://reanzly.yourdomain.com"},
        {"name": "DATABASE_URL", "value": "postgresql://reanzly:...@host:5432/reanzly?schema=public"}
      ],
      "secrets": [
        {"name": "NEXTAUTH_SECRET", "valueFrom": "arn:aws:secretsmanager:...:secret:reanzly/nextauth"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/reanzly",
          "awslogs-region": "ap-south-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:80/api/health || exit 1"],
        "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 30
      }
    }
  ]
}
```

Register it:
```bash
aws ecs register-task-definition --cli-input-json file://reanzly-task.json
```

### B4. Create an ALB + target group

```bash
aws elbv2 create-load-balancer --name reanzly-alb \
  --subnets subnet-aaa subnet-bbb \
  --security-groups sg-alb-xxxx

aws elbv2 create-target-group --name reanzly-tg \
  --protocol HTTP --port 80 --vpc-id vpc-xxxx \
  --target-type ip --health-check-path /api/health
```

Attach an ACM TLS certificate to an HTTPS listener (port 443) forwarding to
`reanzly-tg`.

### B5. Create the ECS service

```bash
aws ecs create-service \
  --cluster reanzly-prod \
  --service-name reanzly-svc \
  --task-definition reanzly:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-aaa,subnet-bbb],securityGroups=[sg-ecs-xxxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...:targetgroup/reanzly-tg/xxx,containerName=reanzly,containerPort=80"
```

### B6. Run migrations (one-off)

Run a one-off task with the same image overriding the command:
```bash
command: ["node_modules/.bin/prisma", "db", "push", "--accept-data-loss"]
```

Or use ECS Exec:
```bash
aws ecs execute-command --cluster reanzly-prod --task <task-id> \
  --container reanzly --command "node_modules/.bin/prisma db push --accept-data-loss" --interactive
```

### B7. Route53

Point `reanzly.yourdomain.com` (A alias) at the ALB DNS name. Done.

---

## Option C — Elastic Beanstalk (middle ground)

1. `eb init -p docker reanzly --region ap-south-1`
2. `eb create reanzly-env --instance_type t3.medium --elb-type application`
3. Set environment properties via the console or `eb setenv`:
   - `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NODE_ENV=production`
4. `eb deploy`

Beanstalk reads `docker-compose.yml` and runs it.

---

## Persistent storage for uploads

The `storage/photos/` directory holds uploaded photos. For production:

- Use an **EFS** mount (ECS/EKS) or **EBS** (single EC2), OR
- Switch `STORAGE_DRIVER=s3` and configure `S3_*` vars (the `src/lib/storage/object-storage.ts` abstraction supports this).

---

## Production checklist

- [ ] `DATABASE_URL` → RDS Postgres (not local SQLite)
- [ ] `NEXTAUTH_SECRET` → `openssl rand -base64 32`, stored in Secrets Manager
- [ ] `NEXTAUTH_URL` → your HTTPS domain
- [ ] HTTPS termination (ALB + ACM, or Caddy auto-TLS)
- [ ] Run `prisma db push` once after first deploy
- [ ] Persistent volume for `storage/photos/` (or S3)
- [ ] CloudWatch alarms on the `/api/health` endpoint
- [ ] DB automated backups (RDS does this automatically — 7-day retention)
- [ ] Rate limiting / WAF on the ALB
- [ ] Seed demo data ONLY in staging (`seed-broker.ts`, `seed-chat.ts`)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Blank page on `/` | Check `NEXTAUTH_URL` matches the domain you're visiting; check container logs `docker logs reanzly` |
| Chat not working | Chat service runs on :3003; ALB/SG must allow it OR rely on `XTransformPort` through Caddy on :80 |
| `prisma db push` fails | `DATABASE_URL` not reachable from the container's network/SG |
| 502 from ALB | Target group health check path must be `/api/health` (HTTP 200) |
| Photos don't persist | Mount a volume at `/app/storage` or switch to S3 driver |

---

## What runs where (port map)

| Port | Service | Notes |
|------|---------|-------|
| 80   | Caddy gateway | The single exposed port in prod; routes by `XTransformPort` |
| 3000 | Next.js standalone | The main app |
| 3003 | Socket.IO chat | Real-time messaging |

Only **port 80** needs to be public. 3000 and 3003 are internal.
