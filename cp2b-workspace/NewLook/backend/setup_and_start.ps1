# CP2B Maps V3 Backend Setup and Start Script
# This script checks for .env file and starts the backend server
# IMPORTANT: Configure your .env file with your Supabase credentials before running

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "CP2B Maps V3 - Backend Setup & Start" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Step 1: Check .env file
Write-Host "[Step 1/4] Checking .env file..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "✗ .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a .env file with your Supabase credentials:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example .env file:" -ForegroundColor Cyan
    Write-Host @"
APP_ENV=development
DEBUG=True

SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres
POSTGRES_HOST=db.xxx.supabase.co
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_PASSWORD

SECRET_KEY=your-secret-key-at-least-32-characters
"@ -ForegroundColor Gray
    Write-Host ""
    Write-Host "See .env.example or documentation for more details." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ .env file found" -ForegroundColor Green
Write-Host ""

# Step 2: Kill existing Python processes
Write-Host "[Step 2/4] Stopping existing Python processes..." -ForegroundColor Yellow

$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    $pythonProcesses | Stop-Process -Force
    Write-Host "✓ Stopped $($pythonProcesses.Count) Python process(es)" -ForegroundColor Green
} else {
    Write-Host "✓ No existing Python processes to stop" -ForegroundColor Green
}

Write-Host ""

# Step 3: Check if venv exists
Write-Host "[Step 3/4] Checking virtual environment..." -ForegroundColor Yellow

if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "✗ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
    
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    .\venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✓ Virtual environment found" -ForegroundColor Green
    .\venv\Scripts\Activate.ps1
}

Write-Host ""

# Step 4: Start the backend server
Write-Host "[Step 4/4] Starting backend server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Backend server starting on http://localhost:8000" -ForegroundColor Green
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Health Check: http://localhost:8000/health" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
