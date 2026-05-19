# PILAR-2b V3 - Deployment Guide

## 🚀 Deployment Status

### Backend (Railway) ✅
- **Status**: LIVE
- **URL**: https://newlook-production.up.railway.app
- **Platform**: Railway
- **Runtime**: Python 3.10

### Frontend (Vercel) 🔄
- **Status**: Ready to deploy
- **Platform**: Vercel
- **Framework**: Next.js 15

---

## Backend Deployment (Railway) - COMPLETED ✅

The backend is already deployed and running on Railway.

### Configuration
- **Repository**: `aikiesan/NewLook`
- **Root Directory**: `/cp2b-workspace/NewLook/backend`
- **Branch**: `main`
- **Runtime**: `python-3.10`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Environment Variables Required
Make sure these are set in Railway:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET_KEY`
- `DATABASE_URL` (if using PostgreSQL)

---

## Frontend Deployment (Vercel) - TODO

### Step 1: Prerequisites

1. **Get Supabase Credentials**
   - Go to your Supabase project dashboard
   - Navigate to Project Settings → API
   - Copy:
     - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
     - Anon/Public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository: `aikiesan/NewLook`
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `cp2b-workspace/NewLook/frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

5. **Add Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://newlook-production.up.railway.app
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

6. Click **"Deploy"**

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd cp2b-workspace/NewLook/frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Step 3: Configure Environment Variables in Vercel

After deployment, you can add/update environment variables:

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://newlook-production.up.railway.app` | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key | Production |

4. Redeploy to apply the new variables

### Step 4: Update API Endpoint (if needed)

The frontend is currently configured to use mock endpoints. To use real backend data:

1. Open `frontend/src/lib/api/geospatialClient.ts`
2. Change line 15:
   ```typescript
   // From:
   const API_PREFIX = '/api/v1/mock';
   
   // To:
   const API_PREFIX = '/api/v1/geospatial';
   ```

---

## Post-Deployment Checklist

### Backend (Railway)
- [x] Application starts successfully
- [x] Public domain generated
- [x] Environment variables configured
- [ ] Health check endpoint accessible: `https://newlook-production.up.railway.app/health`
- [ ] API documentation accessible: `https://newlook-production.up.railway.app/docs`

### Frontend (Vercel)
- [ ] Application deployed
- [ ] Environment variables configured
- [ ] Can connect to Railway backend
- [ ] Supabase authentication works
- [ ] Map loads successfully
- [ ] Data displays correctly

---

## Troubleshooting

### Backend Issues

**App crashes on startup**
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure Supabase credentials are correct

**CORS errors**
- Backend already has CORS configured for `*` (all origins)
- Check that the API URL is correct in frontend

### Frontend Issues

**Build fails on Vercel**
- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility (Next.js 15 requires Node 18.17+)

**Can't connect to backend**
- Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- Check that Railway backend is running
- Test backend directly: `curl https://newlook-production.up.railway.app/health`

**Supabase authentication fails**
- Verify Supabase environment variables are correct
- Check Supabase dashboard for authentication settings
- Ensure Supabase URL includes `https://`

---

## URLs

- **Backend API**: https://newlook-production.up.railway.app
- **API Docs**: https://newlook-production.up.railway.app/docs
- **Frontend**: (Will be provided by Vercel after deployment)

---

## Support

For issues, check:
- Railway logs: Railway Dashboard → NewLook → Logs
- Vercel logs: Vercel Dashboard → Your Project → Deployments → Logs
- GitHub repository: https://github.com/aikiesan/NewLook

