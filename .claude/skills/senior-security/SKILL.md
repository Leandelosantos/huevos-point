---
name: senior-security
description: "[Huevos Point: Express + JWT + PostgreSQL multi-tenant] Comprehensive security engineering skill for application security, penetration testing, security architecture, and compliance auditing. Includes security assessment tools, threat modeling, crypto implementation, and security automation. Use when designing security architecture, conducting penetration tests, implementing cryptography, or performing security audits."
---
## Huevos Point — Contexto del Proyecto

**Superficie de ataque principal:**
- API REST Express en Vercel serverless — rutas `/api/v1/...`
- Multi-tenant: aislamiento por `tenantId` en cada query (riesgo: tenant data leakage)
- JWT en `sessionStorage` (8h expiry) — roles: `superadmin | admin | employee | demo`
- PostgreSQL (Neon serverless) — Sequelize ORM con parámetros binding (protección SQLi)
- Cron endpoint `/api/cron/daily-summary` protegido por `CRON_SECRET`

**Middlewares de seguridad existentes:**
- `authMiddleware.js` — valida JWT
- `roleMiddleware.js` — verifica rol requerido
- `tenantMiddleware.js` — valida acceso al tenant por `x-tenant-id`
- `demoMiddleware.js` — intercepta usuario demo, cero acceso a DB
- `express-rate-limit` — rate limiting en login

**Riesgos prioritarios para este proyecto:**
1. Tenant data isolation — queries sin `tenantId` exponen datos de otras sucursales
2. JWT secret exposure — si `JWT_SECRET` no está en env de Vercel
3. CRON_SECRET vacío — cron acepta cualquier llamada sin autenticación
4. Privilege escalation — employee accediendo a rutas de admin
5. Demo role bypass — si demoMiddleware no intercepta correctamente

**Variables de entorno sensibles:**
`JWT_SECRET`, `CRON_SECRET`, `DEMO_PASSWORD`, `DB_PASSWORD`, `SMTP_PASS`

**Cuando uses esta skill:** Revisar nuevas rutas por vulnerabilidades, diseñar autenticación, auditar aislamiento multi-tenant, evaluar exposición de endpoints.

# Senior Security

Complete toolkit for senior security with modern tools and best practices.

## Quick Start

### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Threat Modeler
python scripts/threat_modeler.py [options]

# Script 2: Security Auditor
python scripts/security_auditor.py [options]

# Script 3: Pentest Automator
python scripts/pentest_automator.py [options]
```

## Core Capabilities

### 1. Threat Modeler

Automated tool for threat modeler tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/threat_modeler.py <project-path> [options]
```

### 2. Security Auditor

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/security_auditor.py <target-path> [--verbose]
```

### 3. Pentest Automator

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/pentest_automator.py [arguments] [options]
```

## Reference Documentation

### Security Architecture Patterns

Comprehensive guide available in `references/security_architecture_patterns.md`:

- Detailed patterns and practices
- Code examples
- Best practices
- Anti-patterns to avoid
- Real-world scenarios

### Penetration Testing Guide

Complete workflow documentation in `references/penetration_testing_guide.md`:

- Step-by-step processes
- Optimization strategies
- Tool integrations
- Performance tuning
- Troubleshooting guide

### Cryptography Implementation

Technical reference guide in `references/cryptography_implementation.md`:

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
python scripts/security_auditor.py .

# Review recommendations
# Apply fixes
```

### 3. Implement Best Practices

Follow the patterns and practices documented in:
- `references/security_architecture_patterns.md`
- `references/penetration_testing_guide.md`
- `references/cryptography_implementation.md`

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
python scripts/security_auditor.py .
python scripts/pentest_automator.py --analyze

# Deployment
docker build -t app:latest .
docker-compose up -d
kubectl apply -f k8s/
```

## Troubleshooting

### Common Issues

Check the comprehensive troubleshooting section in `references/cryptography_implementation.md`.

### Getting Help

- Review reference documentation
- Check script output messages
- Consult tech stack documentation
- Review error logs

## Resources

- Pattern Reference: `references/security_architecture_patterns.md`
- Workflow Guide: `references/penetration_testing_guide.md`
- Technical Guide: `references/cryptography_implementation.md`
- Tool Scripts: `scripts/` directory
