# Render Environment Variables Checklist

## Quick Reference for Setting Up Render Environment

Copy this checklist when configuring your Render web service. All variables should be added in the Render Dashboard > Your Service > Environment tab.

---

## Required Environment Variables

### Application Configuration
```bash
APP_ENV=production
DEBUG=false
PORT=10000
```

### Security
```bash
# Generate with: openssl rand -hex 32
SECRET_KEY=<your-secure-random-key-here>
```

---

## Database Configuration (Supabase)

Get these values from: [Supabase Dashboard](https://supabase.com/dashboard) > Your Project > Settings > Database

### Connection String (Option 1 - Recommended)
```bash
DATABASE_URL=postgresql://postgres.[ref]:[password]@db.zyuxkzfhkueeipokyhgw.supabase.co:5432/postgres
```

### Individual Components (Option 2)
If you prefer to set them separately:
```bash
POSTGRES_HOST=db.zyuxkzfhkueeipokyhgw.supabase.co
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres.[your-ref]
POSTGRES_PASSWORD=[your-password]
```

---

## Supabase Authentication

Get these values from: [Supabase Dashboard](https://supabase.com/dashboard) > Your Project > Settings > API

```bash
SUPABASE_URL=https://zyuxkzfhkueeipokyhgw.supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

---

## CORS Configuration

Add your Vercel frontend URLs (comma-separated, no spaces):

```bash
PRODUCTION_ORIGINS=https://new-look-nu.vercel.app,https://your-other-domain.vercel.app
```

**Important**: Update this with your actual Vercel deployment URLs!

---

## Optional: Error Monitoring

If using Sentry for error tracking:

```bash
SENTRY_DSN=https://[key]@sentry.io/[project-id]
```

---

## Environment Variables Template for Copy-Paste

```bash
# Application
APP_ENV=production
DEBUG=false
PORT=10000

# Security (CHANGE THIS!)
SECRET_KEY=<generate-with-openssl-rand-hex-32>

# Database - Supabase
DATABASE_URL=postgresql://postgres.[ref]:[password]@db.zyuxkzfhkueeipokyhgw.supabase.co:5432/postgres
POSTGRES_HOST=db.zyuxkzfhkueeipokyhgw.supabase.co
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres.[your-ref]
POSTGRES_PASSWORD=[your-password]

# Supabase Auth
SUPABASE_URL=https://zyuxkzfhkueeipokyhgw.supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# CORS (UPDATE WITH YOUR DOMAINS!)
PRODUCTION_ORIGINS=https://new-look-nu.vercel.app,https://your-domain.vercel.app

# Optional: Error Monitoring
SENTRY_DSN=[your-sentry-dsn]
```

---

## Where to Find These Values

### Supabase Database Credentials
1. Go to https://supabase.com/dashboard
2. Select project: **zyuxkzfhkueeipokyhgw**
3. Click **Settings** (gear icon)
4. Click **Database**
5. Scroll to **Connection String** section
6. Copy the **URI** format

### Supabase API Credentials
1. Go to https://supabase.com/dashboard
2. Select project: **zyuxkzfhkueeipokyhgw**
3. Click **Settings** (gear icon)
4. Click **API**
5. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (click "Reveal" to see it)

### Vercel Frontend URLs
1. Go to https://vercel.com/dashboard
2. Select your project
3. Note the production URL (e.g., `new-look-nu.vercel.app`)
4. Add all domains you want to allow (production + preview deployments if needed)

---

## Verification Checklist

After adding all environment variables:

- [ ] All required variables are set (no missing values)
- [ ] `SECRET_KEY` is at least 32 characters (not the default placeholder)
- [ ] `DATABASE_URL` connects to Supabase (test with health endpoint after deploy)
- [ ] `SUPABASE_URL` matches your project URL
- [ ] `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are from the correct project
- [ ] `PRODUCTION_ORIGINS` includes your actual Vercel domain(s)
- [ ] No trailing slashes in URLs
- [ ] No spaces in comma-separated values

---

## Testing After Deployment

After setting environment variables and deploying:

1. **Health Check**:
   ```bash
   curl https://[your-service].onrender.com/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "environment": "production"
   }
   ```

2. **API Docs**:
   Visit: `https://[your-service].onrender.com/docs`

3. **Test an API Endpoint**:
   ```bash
   curl https://[your-service].onrender.com/api/v1/municipalities
   ```

---

## Troubleshooting

### "Database connection failed"
- Verify `DATABASE_URL` format is correct
- Check Supabase password doesn't contain special characters that need URL encoding
- Test connection from Supabase dashboard first

### "SECRET_KEY validation error"
- Generate a new key: `openssl rand -hex 32`
- Ensure it's at least 32 characters
- No spaces or special characters

### "CORS errors"
- Check `PRODUCTION_ORIGINS` includes your Vercel URL
- Ensure no trailing slashes
- Verify frontend is using correct backend URL

---

## Need Help?

Refer to the main migration guide: [RAILWAY_TO_RENDER_MIGRATION.md](../../../RAILWAY_TO_RENDER_MIGRATION.md)
