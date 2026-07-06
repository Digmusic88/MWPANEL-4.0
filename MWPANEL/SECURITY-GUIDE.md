# 🔐 MW Panel Security Guide

## Overview

This guide provides security best practices for deploying and maintaining MW Panel in production.

## 🚨 Critical Security Checklist

### 1. Environment Variables

**NEVER commit sensitive data to the repository!**

#### Required Environment Variables for Production:

```bash
# Database
DATABASE_PASSWORD=<strong-unique-password>  # Min 32 chars

# JWT 
JWT_SECRET=<random-64-char-string>          # Use generate-secrets.sh
REFRESH_TOKEN_SECRET=<random-64-char-string> # Different from JWT_SECRET

# Admin Account
ADMIN_EMAIL=<your-admin-email>
ADMIN_PASSWORD=<strong-unique-password>      # Min 12 chars, no defaults!

# Redis (if used)
REDIS_PASSWORD=<strong-unique-password>

# API Keys (as needed)
RESEND_API_KEY=<your-resend-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
HUGGINGFACE_API_KEY=<your-huggingface-key>
```

### 2. Generating Secure Secrets

Use the provided script to generate cryptographically secure secrets:

```bash
cd /opt/mw-panel
./scripts/generate-secrets.sh > secrets.txt
# Copy values to .env file
# Store secrets.txt in password manager
# Delete secrets.txt after copying
```

### 3. Google Service Account

**Option 1: Environment Variable (Recommended)**
```bash
# Convert JSON file to single line
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=$(cat google-credentials.json | jq -c .)
# Add to .env or set in environment
```

**Option 2: Docker Secret (More Secure)**
```bash
docker secret create google-credentials google-credentials.json
```

### 4. File Permissions

```bash
# Secure sensitive files
chmod 600 .env
chmod 600 google-credentials.json
chown root:root .env

# Application files
chown -R www-data:www-data /opt/mw-panel
chmod -R 755 /opt/mw-panel
chmod -R 700 /opt/mw-panel/backend/uploads
```

### 5. Network Security

#### Firewall Rules
```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH (change port recommended)
ufw allow 80/tcp    # HTTP (redirects to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable
```

#### Docker Network Isolation
- Database and Redis are NOT exposed to host
- Only Nginx has public port bindings
- Internal services communicate via Docker network

### 6. SSL/TLS Configuration

**Always use HTTPS in production!**

Current setup uses Cloudflare Origin Certificates. Ensure:
- SSL mode in Cloudflare: "Full (strict)"
- Origin certificate valid and not expired
- Strong ciphers in Nginx configuration

### 7. Database Security

```sql
-- Create application user with limited privileges
CREATE USER mwpanel_app WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE mwpanel TO mwpanel_app;
GRANT USAGE ON SCHEMA public TO mwpanel_app;
GRANT CREATE ON SCHEMA public TO mwpanel_app;

-- Revoke unnecessary privileges
REVOKE ALL ON DATABASE mwpanel FROM PUBLIC;
```

### 8. Regular Security Tasks

#### Daily
- Monitor logs for suspicious activity
- Check failed login attempts
- Verify backup completion

#### Weekly
- Review user access and permissions
- Update Docker images if patches available
- Check for security advisories

#### Monthly
- Rotate API keys
- Review and update firewall rules
- Security scan with tools like OWASP ZAP

#### Quarterly
- Rotate database passwords
- Update JWT secrets
- Full security audit

### 9. Backup Security

```bash
# Encrypt backups
gpg --symmetric --cipher-algo AES256 backup.sql

# Secure backup storage
chmod 600 backup.sql.gpg
# Store in separate location/server
```

### 10. Monitoring & Alerts

Set up alerts for:
- Multiple failed login attempts
- Unusual database queries
- High CPU/memory usage
- Disk space issues
- SSL certificate expiration

## 🚫 Common Security Mistakes to Avoid

1. **Default Passwords**: Never use defaults like "admin123"
2. **Exposed Ports**: Don't expose database/Redis ports
3. **Weak Secrets**: Use cryptographically random secrets
4. **Public Credentials**: Never commit credentials to Git
5. **Unencrypted Backups**: Always encrypt sensitive backups
6. **No Rate Limiting**: Implement rate limiting on APIs
7. **Missing Updates**: Keep all dependencies updated
8. **Verbose Errors**: Don't expose stack traces in production

## 🆘 Security Incident Response

If you suspect a security breach:

1. **Immediate Actions**:
   - Change all passwords and secrets
   - Review access logs
   - Disable suspicious accounts
   - Take system offline if necessary

2. **Investigation**:
   - Check Docker logs: `docker-compose logs`
   - Review Nginx access logs
   - Audit database access logs
   - Check for modified files

3. **Recovery**:
   - Restore from clean backup if compromised
   - Implement additional security measures
   - Document incident and lessons learned

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

**Remember**: Security is not a one-time task but an ongoing process. Stay vigilant!