# 🚀 PILAR-2b V3 - Deployment Checklist

**Purpose**: Step-by-step guide for deploying Sprint 4 to production  
**Target Platforms**: Railway (Backend), Vercel (Frontend)  
**Date**: November 18, 2025

---

## 📋 Pre-Deployment Checklist

### 1. Code Quality ✅
- [ ] All linting errors fixed
- [ ] No console.log in production code
- [ ] TypeScript types complete
- [ ] Python type hints added
- [ ] All tests passing
- [ ] No commented-out code

### 2. Security ✅
- [ ] `.env` files NOT committed
- [ ] All secrets in environment variables
- [ ] CORS configured (no wildcards)
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)

### 3. Performance ✅
- [ ] Database indexes applied (11 total)
- [ ] Caching middleware enabled
- [ ] Response compression enabled
- [ ] Frontend bundle <500KB
- [ ] Images optimized
- [ ] Lazy loading implemented

### 4. Documentation ✅
- [ ] README.md updated
- [ ] API documentation complete
- [ ] Environment variables documented
- [ ] Deployment guide written
- [ ] Code comments added

---

## 🏗️ Railway Deployment (Backend)

### Step 1: Verify Environment Variables

Log into [Railway Dashboard](https://railway.app/) → Select Project → Variables

**Required Variables**:
```bash
# Database
DATABASE_URL=postgresql://postgres.zyuxkzfhkueeipokyhgw:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres

# Supabase
SUPABASE_URL=https://zyuxkzfhkueeipokyhgw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Get from Supabase Dashboard
SUPABASE_ANON_KEY=eyJhbGc...

# Security
SECRET_KEY=<generate-with-openssl-rand-hex-32>

# App Config
APP_ENV=production
HOST=0.0.0.0
PORT=8000
DEBUG=false

# CORS (Frontend URLs)
FRONTEND_URL=https://new-look-nu.vercel.app
```

**Generate SECRET_KEY**:
```bash
openssl rand -hex 32
```

---

### Step 2: Verify Railway Configuration

**File**: `cp2b-workspace/NewLook/backend/railway.json`

```json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 10,
    "restartPolicyType": "ON_FAILURE",
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
  }
}
```

**File**: `cp2b-workspace/NewLook/backend/Procfile`

```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

### Step 3: Push to GitHub

```bash
cd cp2b-workspace/NewLook/backend

# Commit changes
git add .
git commit -m "feat(sprint4): Performance optimization & error handling"
git push origin main
```

---

### Step 4: Trigger Railway Deployment

Railway will automatically deploy when code is pushed to `main`.

**Monitor Deployment**:
1. Go to Railway Dashboard
2. Click on your service
3. Check "Deployments" tab
4. Watch build logs

**Expected Build Time**: 2-3 minutes

---

### Step 5: Verify Backend Health

```bash
# Test health endpoint
curl https://newlook-production.up.railway.app/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-18T...",
  "version": "3.0.0",
  "environment": "production",
  "database": "connected"
}

# Test cache statistics
curl https://newlook-production.up.railway.app/stats/cache

# Test API docs
open https://newlook-production.up.railway.app/docs
```

---

### Step 6: Check Database Migrations

```bash
# Connect to Supabase
psql $DATABASE_URL

# Verify indexes
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename = 'municipalities';

# Should show 11 indexes

# Verify data
SELECT COUNT(*) FROM municipalities;  -- Should return 645
SELECT COUNT(*) FROM scientific_references;  -- Should return 58

\q
```

---

## 🌐 Vercel Deployment (Frontend)

### Step 1: Verify Environment Variables

Log into [Vercel Dashboard](https://vercel.com/dashboard) → Select Project → Settings → Environment Variables

**Required Variables**:
```bash
# API URL (IMPORTANT: Production Railway URL)
NEXT_PUBLIC_API_URL=https://newlook-production.up.railway.app

# Supabase (MUST match backend)
NEXT_PUBLIC_SUPABASE_URL=https://zyuxkzfhkueeipokyhgw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Data Source (CRITICAL: Set to false for production)
NEXT_PUBLIC_USE_MOCK_DATA=false
```

⚠️ **CRITICAL**: `NEXT_PUBLIC_USE_MOCK_DATA` must be `false` in production!

---

### Step 2: Update next.config.js (if needed)

**File**: `cp2b-workspace/NewLook/frontend/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Optimize bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    domains: ['zyuxkzfhkueeipokyhgw.supabase.co'],
  },
}

module.exports = nextConfig
```

---

### Step 3: Push to GitHub

```bash
cd cp2b-workspace/NewLook/frontend

# Commit changes
git add .
git commit -m "feat(sprint4): Performance optimization & error handling"
git push origin main
```

---

### Step 4: Trigger Vercel Deployment

Vercel will automatically deploy when code is pushed to `main`.

**Monitor Deployment**:
1. Go to Vercel Dashboard
2. Click on your project
3. Check "Deployments" tab
4. Watch build logs

**Expected Build Time**: 1-2 minutes

---

### Step 5: Verify Frontend

```bash
# Test homepage
curl https://new-look-nu.vercel.app

# Test dashboard (requires authentication)
open https://new-look-nu.vercel.app/dashboard

# Test proximity analysis
open https://new-look-nu.vercel.app/dashboard/proximity
```

---

## 🧪 Post-Deployment Testing

### 1. Smoke Tests (Critical Path)

**Test Login Flow**:
1. [ ] Go to https://new-look-nu.vercel.app
2. [ ] Click "Entrar"
3. [ ] Log in with test credentials
4. [ ] Verify redirect to dashboard
5. [ ] Check user name displays correctly

**Test Proximity Analysis**:
1. [ ] Navigate to "Análise Proximidade"
2. [ ] Click map to select point (use Campinas: -22.9, -47.0)
3. [ ] Set radius to 25km
4. [ ] Click "Analisar"
5. [ ] Verify analysis completes in <3 seconds
6. [ ] Check results display correctly
7. [ ] Verify cache indicator (run same analysis again)

**Test Error Handling**:
1. [ ] Select point in ocean (try -23.0, -44.0)
2. [ ] Verify validation error shows
3. [ ] Try radius >100km
4. [ ] Verify error message displays
5. [ ] Disconnect internet (airplane mode)
6. [ ] Verify offline notification appears

---

### 2. Performance Tests

**Lighthouse Audit**:
```bash
# Run Lighthouse
npx lighthouse https://new-look-nu.vercel.app --view

# Target Scores:
# - Performance: >90
# - Accessibility: >90
# - Best Practices: >90
# - SEO: >80
```

**Load Time**:
- [ ] Homepage loads in <2s
- [ ] Dashboard loads in <3s
- [ ] Map renders in <2s
- [ ] Analysis completes in <3s (first run)
- [ ] Analysis completes in <100ms (cached)

**Cache Hit Rate**:
```bash
# After 100 analyses, check cache stats
curl https://newlook-production.up.railway.app/stats/cache

# Target hit rate: >60%
```

---

### 3. Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)

---

### 4. Accessibility Tests

**Automated**:
```bash
# Install axe-core
npm install -g @axe-core/cli

# Run audit
axe https://new-look-nu.vercel.app
```

**Manual**:
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Screen reader announcements (NVDA/VoiceOver)
- [ ] Focus indicators visible
- [ ] Color contrast >4.5:1
- [ ] Alt text on images

---

### 5. Mobile Responsiveness

Test on:
- [ ] iPhone SE (375px width)
- [ ] iPhone 12 Pro (390px width)
- [ ] Pixel 5 (393px width)
- [ ] iPad (768px width)
- [ ] iPad Pro (1024px width)

**Check**:
- [ ] Navigation collapses on mobile
- [ ] Map is touch-friendly
- [ ] Buttons are >44px tall
- [ ] Text is readable (>16px)
- [ ] No horizontal scroll

---

## 🔍 Monitoring & Alerts

### Health Checks

**Set up monitoring** (recommended: UptimeRobot or Better Uptime):

```yaml
Backend Health:
  URL: https://newlook-production.up.railway.app/health
  Interval: 5 minutes
  Alert: Email + Slack

Frontend Health:
  URL: https://new-look-nu.vercel.app
  Interval: 5 minutes
  Alert: Email + Slack

Database Connection:
  URL: https://newlook-production.up.railway.app/health/ready
  Interval: 5 minutes
  Alert: Email + Slack (urgent)
```

---

### Error Tracking (Optional)

**Sentry Integration** (future sprint):
```bash
# Install Sentry
npm install @sentry/nextjs @sentry/node

# Configure Sentry
# - Frontend: next.config.js
# - Backend: app/main.py
```

---

## 📈 Performance Monitoring

### Railway Metrics

Monitor in Railway Dashboard:
- [ ] CPU usage <70%
- [ ] Memory usage <80%
- [ ] Response time p95 <3s
- [ ] Error rate <1%

### Vercel Analytics

Monitor in Vercel Dashboard:
- [ ] Largest Contentful Paint <2.5s
- [ ] First Input Delay <100ms
- [ ] Cumulative Layout Shift <0.1
- [ ] Visit count tracking

---

## 🚨 Rollback Plan

If deployment fails:

### Rollback Backend (Railway)
```bash
# Option 1: Redeploy previous version
1. Go to Railway Dashboard
2. Click "Deployments"
3. Find last successful deployment
4. Click "Redeploy"

# Option 2: Revert Git commit
git revert HEAD
git push origin main
# Railway auto-deploys previous version
```

### Rollback Frontend (Vercel)
```bash
# Option 1: Redeploy previous version
1. Go to Vercel Dashboard
2. Click "Deployments"
3. Find last successful deployment
4. Click "Promote to Production"

# Option 2: Revert Git commit
git revert HEAD
git push origin main
# Vercel auto-deploys previous version
```

---

## ✅ Production Sign-Off

**Deployment Completed**: [ ] Yes / [ ] No  
**All Tests Passed**: [ ] Yes / [ ] No  
**Performance Targets Met**: [ ] Yes / [ ] No  
**Error Handling Verified**: [ ] Yes / [ ] No  
**Documentation Updated**: [ ] Yes / [ ] No

**Deployed By**: _____________  
**Date**: _____________  
**Deployment ID**: _____________

**Sign-Off**: _____________  
**Notes**: _____________

---

## 📞 Support Contacts

**Railway Issues**:
- Dashboard: https://railway.app/
- Support: support@railway.app

**Vercel Issues**:
- Dashboard: https://vercel.com/dashboard
- Support: support@vercel.com

**Supabase Issues**:
- Dashboard: https://supabase.com/dashboard
- Support: support@supabase.com

**Technical Issues**:
- GitHub Repository: [Link to repo]
- Documentation: `docs/SPRINT4_IMPLEMENTATION_SUMMARY.md`

---

**Last Updated**: November 18, 2025  
**Version**: 3.0.0 (Sprint 4)  
**Status**: ✅ READY FOR PRODUCTION

