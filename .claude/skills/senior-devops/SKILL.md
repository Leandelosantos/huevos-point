---
name: senior-devops
description: "[Huevos Point: Vercel serverless + PostgreSQL Neon + GitHub] Comprehensive DevOps skill for CI/CD, infrastructure automation, containerization, and cloud platforms (AWS, GCP, Azure). Includes pipeline setup, infrastructure as code, deployment automation, and monitoring. Use when setting up pipelines, deploying applications, managing infrastructure, implementing monitoring, or optimizing deployment processes."
---
## Huevos Point — Contexto del Proyecto

**Infraestructura actual:**
- **Deploy:** Vercel (serverless functions) — auto-deploy en push a `main`
- **Entrada serverless:** `server/api/index.js` exporta la app Express como handler
- **DB:** PostgreSQL en Neon (serverless, connection pooling)
- **CI local:** Pre-commit hook (`.git/hooks/pre-commit`) — build + Jest + Vitest
- **CI remoto:** Ninguno todavía (solo Vercel build checks)
- **Cron Jobs:** Vercel Cron — `vercel.json` define schedules Mon-Sat
- **Repo:** GitHub (`main` branch → producción automática)

**Variables de entorno en Vercel:**
`DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`, `DEMO_PASSWORD`, `SMTP_*`

**Flujo de deploy actual:**
```
git push origin main
    → Vercel build (npm run build en client/)
    → Deploy serverless function
    → Cold start corre migraciones SQL idempotentes
    → Producción activa
```

**Pain points actuales:**
- No hay staging/preview environment
- Migraciones corren en cold start (no sequelize-cli)
- Sin monitoring/alerting (solo Vercel Function Logs)
- Sin GitHub Actions (CI solo local vía pre-commit hook)

**Mejoras de DevOps prioritarias para este proyecto:**
1. GitHub Actions para CI en PRs (evitar que código roto llegue a main)
2. Preview deployments en Vercel para branches de features
3. Alertas de errores en producción (Sentry o similar)
4. Variables de entorno versionadas/documentadas
5. Health check endpoint `/api/health`

**Cuando uses esta skill:** Configurar GitHub Actions, optimizar el pipeline de deploy en Vercel, agregar monitoring, diseñar estrategia de staging.

# Senior Devops

Complete toolkit for senior devops with modern tools and best practices.

## Quick Start

### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Pipeline Generator
python scripts/pipeline_generator.py [options]

# Script 2: Terraform Scaffolder
python scripts/terraform_scaffolder.py [options]

# Script 3: Deployment Manager
python scripts/deployment_manager.py [options]
```

## Core Capabilities

### 1. Pipeline Generator

Automated tool for pipeline generator tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/pipeline_generator.py <project-path> [options]
```

### 2. Terraform Scaffolder

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/terraform_scaffolder.py <target-path> [--verbose]
```

### 3. Deployment Manager

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/deployment_manager.py [arguments] [options]
```

## Reference Documentation

### Cicd Pipeline Guide

Comprehensive guide available in `references/cicd_pipeline_guide.md`:

- Detailed patterns and practices
- Code examples
- Best practices
- Anti-patterns to avoid
- Real-world scenarios

### Infrastructure As Code

Complete workflow documentation in `references/infrastructure_as_code.md`:

- Step-by-step processes
- Optimization strategies
- Tool integrations
- Performance tuning
- Troubleshooting guide

### Deployment Strategies

Technical reference guide in `references/deployment_strategies.md`:

- Technology stack details
- Configuration examples
- Integration patterns
- Security considerations
- Scalability guidelines

## Tech Stack

**Languages:** TypeScript, JavaScript, Python, Go, Swift, Kotlin
**Frontend:** React, Next.js, React Native, Flutter
**Backend:** Node.js, Express, GraphQL, REST APIs
**Database:** PostgreSQL, Prisma, NeonDB, Supabase
**DevOps:** Docker, Kubernetes, Terraform, GitHub Actions, CircleCI
**Cloud:** AWS, GCP, Azure

## Development Workflow

### 1. Setup and Configuration

```bash
# Install dependencies
npm install
# or
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

### 2. Run Quality Checks

```bash
# Use the analyzer script
python scripts/terraform_scaffolder.py .

# Review recommendations
# Apply fixes
```

### 3. Implement Best Practices

Follow the patterns and practices documented in:
- `references/cicd_pipeline_guide.md`
- `references/infrastructure_as_code.md`
- `references/deployment_strategies.md`

## Best Practices Summary

### Code Quality
- Follow established patterns
- Write comprehensive tests
- Document decisions
- Review regularly

### Performance
- Measure before optimizing
- Use appropriate caching
- Optimize critical paths
- Monitor in production

### Security
- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Keep dependencies updated

### Maintainability
- Write clear code
- Use consistent naming
- Add helpful comments
- Keep it simple

## Common Commands

```bash
# Development
npm run dev
npm run build
npm run test
npm run lint

# Analysis
python scripts/terraform_scaffolder.py .
python scripts/deployment_manager.py --analyze

# Deployment
docker build -t app:latest .
docker-compose up -d
kubectl apply -f k8s/
```

## Troubleshooting

### Common Issues

Check the comprehensive troubleshooting section in `references/deployment_strategies.md`.

### Getting Help

- Review reference documentation
- Check script output messages
- Consult tech stack documentation
- Review error logs

## Resources

- Pattern Reference: `references/cicd_pipeline_guide.md`
- Workflow Guide: `references/infrastructure_as_code.md`
- Technical Guide: `references/deployment_strategies.md`
- Tool Scripts: `scripts/` directory
