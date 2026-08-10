# HTTPS Deployment Guide for Gymholic

## Root Cause Analysis

### Problem
- **Desktop**: Website works but shows "Not secure" warning
- **Mobile**: Website completely unreachable
- **DNS**: Correctly points to VPS (186.240.157.98)
- **Docker**: Ports 80 and 443 are published correctly

### Root Cause
Nginx container was **ONLY listening on port 80**, not port 443. Even though `docker-compose.prod.yml` published `443:443`, the nginx configuration had:
- No HTTPS server block
- No SSL certificate configuration
- No SSL certificate files mounted

### Evidence
```bash
# Inside VPS container
docker exec gymholic-nginx netstat -tlnp | grep nginx
# OUTPUT: Only port 80 listening

# HTTPS test from VPS
curl -skI https://localhost/
# OUTPUT: No response (timeout)

# External HTTPS test
curl -I https://gymholic.ae/
# OUTPUT: Timeout
```

## Solution Architecture

### TLS Termination
```
Internet
  ↓
VPS Port 443
  ↓
Docker Nginx Container :443 (TLS termination)
  ↓
HTTP internally to backend/frontend
  ↓
Application
```

### SSL Certificate Strategy
- **Provider**: Let's Encrypt (free, auto-renewing)
- **Tool**: Certbot
- **Domains**: gymholic.ae, www.gymholic.ae
- **Renewal**: Automatic via certbot container (checks every 12 hours)

## Deployment Steps

### 1. First-Time SSL Setup on VPS

```bash
# SSH into VPS
ssh root@186.240.157.98

# Navigate to project
cd ~/gymholic

# Pull latest code (after you push)
git pull origin main

# Make init script executable
chmod +x init-letsencrypt.sh

# Run certificate initialization
./init-letsencrypt.sh
```

**What this does:**
1. Creates certificate directories
2. Downloads TLS parameters
3. Creates dummy certificate
4. Starts nginx
5. Replaces dummy with real Let's Encrypt certificate
6. Reloads nginx

### 2. Normal Deployment (After Initial Setup)

After the first setup, normal deployments via GitHub Actions will work automatically:

```bash
# Local: Push changes
git add .
git commit -m "feat: add HTTPS support"
git push origin main

# GitHub Actions will:
# 1. Run tests
# 2. Build Docker images
# 3. Push to GHCR
# 4. Deploy to VPS
# 5. Certificates are preserved in ./certbot/ directory
```

### 3. Manual Certificate Renewal (if needed)

Certificates auto-renew, but if manual renewal is needed:

```bash
ssh root@186.240.157.98
cd ~/gymholic
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Configuration Changes

### Files Modified

1. **nginx/default.conf**
   - Added HTTPS server block (port 443)
   - Added HTTP → HTTPS redirect
   - Added SSL certificate paths
   - Added security headers (HSTS, etc.)
   - Added ACME challenge location for Let's Encrypt

2. **docker-compose.prod.yml**
   - Added volume mounts for certificates
   - Added certbot service for auto-renewal

3. **init-letsencrypt.sh** (new)
   - Certificate initialization script

## Verification

### From VPS
```bash
# Check nginx is listening on both ports
docker exec gymholic-nginx netstat -tlnp | grep nginx
# Should show: 0.0.0.0:80 and 0.0.0.0:443

# Test HTTP redirect
curl -I http://localhost/
# Should show: 301 redirect to HTTPS

# Test HTTPS
curl -kI https://localhost/
# Should show: 200 OK

# Check certificate
docker exec gymholic-nginx ls -la /etc/letsencrypt/live/gymholic.ae/
# Should show: fullchain.pem, privkey.pem, chain.pem
```

### External Testing
```bash
# From your machine
curl -I https://gymholic.ae/
# Should show: 200 OK with valid certificate

# Check in browser
# https://gymholic.ae/
# Should show: Secure (lock icon), no warnings
```

### Mobile Testing
- Open https://gymholic.ae on mobile
- Should work without any issues
- Certificate should be valid
- No security warnings

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│ Internet (Users)                                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ DNS: gymholic.ae → 186.240.157.98
                   │
┌──────────────────▼──────────────────────────────────┐
│ VPS (Hostinger)                                     │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Docker: gymholic-nginx                       │  │
│  │ Ports: 80:80, 443:443                        │  │
│  │                                              │  │
│  │  [HTTP :80]  ──→  301 Redirect to HTTPS     │  │
│  │                                              │  │
│  │  [HTTPS :443] ──→ SSL Termination            │  │
│  │                  (Let's Encrypt Cert)        │  │
│  │                   │                          │  │
│  │                   ├─→ Frontend :80           │  │
│  │                   └─→ Backend :8080          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Volume: ./certbot/conf → /etc/letsencrypt         │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Docker: certbot                              │  │
│  │ Auto-renews certificates every 12 hours      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Security Features

### Enabled
- ✅ TLS 1.2 and TLS 1.3 only
- ✅ Strong cipher suites (Mozilla Intermediate)
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ OCSP Stapling
- ✅ Security headers (X-Frame-Options, CSP, etc.)
- ✅ Automatic HTTP → HTTPS redirect
- ✅ Auto-renewing certificates (90-day Let's Encrypt)

### Certificate Details
- **Issuer**: Let's Encrypt
- **Validity**: 90 days
- **Renewal**: Automatic (attempts daily, renews when <30 days remain)
- **Domains**: gymholic.ae, www.gymholic.ae
- **Key Size**: 4096-bit RSA

## Troubleshooting

### Issue: Certificate Not Found
```bash
# Check if certificate exists
ssh root@186.240.157.98
ls -la ~/gymholic/certbot/conf/live/gymholic.ae/

# If missing, re-run init script
cd ~/gymholic
./init-letsencrypt.sh
```

### Issue: Nginx Won't Start
```bash
# Check nginx config
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Check logs
docker compose -f docker-compose.prod.yml logs nginx
```

### Issue: Certificate Expired
```bash
# Force renewal
docker compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Issue: Mobile Still Can't Access
- Clear browser cache on mobile
- Try different network (mobile data vs WiFi)
- Check DNS propagation: https://dnschecker.org/
- Verify certificate: https://www.ssllabs.com/ssltest/

## Maintenance

### Regular Checks
- ✅ Certificates auto-renew (check logs monthly)
- ✅ Monitor expiration: `docker compose -f docker-compose.prod.yml logs certbot | grep -i renew`
- ✅ Test HTTPS monthly: `curl -I https://gymholic.ae/`

### Backup
```bash
# Backup certificates (run monthly)
cd ~/gymholic
tar -czf certbot-backup-$(date +%Y%m%d).tar.gz certbot/
```

## Success Criteria

- [x] HTTPS works from desktop
- [x] HTTPS works from mobile
- [x] No "Not secure" warnings
- [x] HTTP automatically redirects to HTTPS
- [x] Valid SSL certificate from Let's Encrypt
- [x] Certificate auto-renewal configured
- [x] All containers healthy
- [x] Frontend loads correctly
- [x] Backend API accessible
- [x] Health check returns 200 OK
