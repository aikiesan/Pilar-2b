#!/bin/bash

###############################################################################
# CP2B Maps V3 - Setup Verification Script
# Created: 2025-11-22
# Purpose: Verify complete platform setup and configuration
###############################################################################

# Don't exit on error - we want to check everything
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_check() {
    echo -e "${YELLOW}🔍 Checking:${NC} $1"
    ((TOTAL_CHECKS++))
}

print_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED_CHECKS++))
}

print_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED_CHECKS++))
}

print_warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    ((WARNING_CHECKS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

###############################################################################
# 1. ENVIRONMENT FILES CHECK
###############################################################################
print_header "1. ENVIRONMENT FILES"

print_check "Frontend .env.local exists"
if [ -f "frontend/.env.local" ]; then
    print_pass "frontend/.env.local found"
else
    print_fail "frontend/.env.local NOT FOUND"
    print_info "Create from: frontend/.env.example"
fi

print_check "Backend .env exists"
if [ -f "backend/.env" ]; then
    print_pass "backend/.env found"
else
    print_fail "backend/.env NOT FOUND"
    print_info "Create from: backend/.env.example"
fi

###############################################################################
# 2. FRONTEND CONFIGURATION
###############################################################################
print_header "2. FRONTEND CONFIGURATION"

if [ -f "frontend/.env.local" ]; then
    source frontend/.env.local

    print_check "NEXT_PUBLIC_SUPABASE_URL configured"
    if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ "$NEXT_PUBLIC_SUPABASE_URL" != "your-supabase-url-here" ]; then
        print_pass "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
    else
        print_fail "NEXT_PUBLIC_SUPABASE_URL not configured"
    fi

    print_check "NEXT_PUBLIC_SUPABASE_ANON_KEY configured"
    if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && [ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" != "your-supabase-anon-key-here" ]; then
        # Check if it's a JWT (starts with eyJ)
        if [[ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" =~ ^eyJ ]]; then
            print_pass "Supabase anon key configured (JWT format)"
        else
            print_warn "Supabase anon key doesn't look like a JWT"
        fi
    else
        print_fail "NEXT_PUBLIC_SUPABASE_ANON_KEY not configured"
    fi

    print_check "API URL configured"
    if [ -n "$NEXT_PUBLIC_API_URL" ]; then
        print_pass "API URL: $NEXT_PUBLIC_API_URL"
    else
        print_warn "NEXT_PUBLIC_API_URL not set (will use default)"
    fi
fi

###############################################################################
# 3. BACKEND CONFIGURATION
###############################################################################
print_header "3. BACKEND CONFIGURATION"

if [ -f "backend/.env" ]; then
    source backend/.env

    print_check "SECRET_KEY configured"
    if [ -n "$SECRET_KEY" ] && [ "$SECRET_KEY" != "CHANGE_THIS_GENERATE_WITH_OPENSSL_RAND_HEX_32" ]; then
        if [ ${#SECRET_KEY} -ge 64 ]; then
            print_pass "SECRET_KEY configured (${#SECRET_KEY} chars)"
        else
            print_warn "SECRET_KEY might be too short (${#SECRET_KEY} chars, recommended: 64+)"
        fi
    else
        print_fail "SECRET_KEY not configured or using default"
    fi

    print_check "JWT_SECRET configured"
    if [ -n "$JWT_SECRET" ] && [ "$JWT_SECRET" != "CHANGE_THIS_GENERATE_WITH_OPENSSL_RAND_HEX_32" ]; then
        if [ ${#JWT_SECRET} -ge 64 ]; then
            print_pass "JWT_SECRET configured (${#JWT_SECRET} chars)"
        else
            print_warn "JWT_SECRET might be too short (${#JWT_SECRET} chars, recommended: 64+)"
        fi
    else
        print_fail "JWT_SECRET not configured or using default"
    fi

    print_check "DATABASE_URL configured"
    if [ -n "$DATABASE_URL" ] && [[ ! "$DATABASE_URL" =~ \[YOUR-PASSWORD\] ]]; then
        # Mask the password in output
        MASKED_URL=$(echo "$DATABASE_URL" | sed -E 's/:([^@]+)@/:****@/')
        print_pass "Database URL: $MASKED_URL"
    else
        print_fail "DATABASE_URL not configured or contains placeholder"
    fi

    print_check "SUPABASE_URL configured"
    if [ -n "$SUPABASE_URL" ] && [ "$SUPABASE_URL" != "https://your-project.supabase.co" ]; then
        print_pass "Supabase URL: $SUPABASE_URL"
    else
        print_fail "SUPABASE_URL not configured"
    fi

    print_check "SUPABASE_SERVICE_ROLE_KEY configured"
    if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && [ "$SUPABASE_SERVICE_ROLE_KEY" != "your-supabase-service-role-key-here" ]; then
        print_pass "Service role key configured"
        print_warn "⚠️  SECURITY: Service role key has FULL database access!"
    else
        print_fail "SUPABASE_SERVICE_ROLE_KEY not configured"
    fi
fi

###############################################################################
# 4. DEPENDENCIES CHECK
###############################################################################
print_header "4. DEPENDENCIES"

print_check "Node.js installed"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_pass "Node.js $NODE_VERSION"
else
    print_fail "Node.js not found"
fi

print_check "npm installed"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_pass "npm $NPM_VERSION"
else
    print_fail "npm not found"
fi

print_check "Python installed"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_pass "$PYTHON_VERSION"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    print_pass "$PYTHON_VERSION"
else
    print_fail "Python not found"
fi

print_check "Frontend node_modules"
if [ -d "frontend/node_modules" ]; then
    print_pass "Frontend dependencies installed"
else
    print_warn "Frontend dependencies not installed"
    print_info "Run: cd frontend && npm install"
fi

print_check "Backend virtual environment or dependencies"
if [ -d "backend/venv" ] || [ -d "backend/.venv" ]; then
    print_pass "Backend virtual environment found"
elif command -v uvicorn &> /dev/null; then
    print_pass "Backend dependencies available (system-wide)"
else
    print_warn "Backend dependencies might not be installed"
    print_info "Run: cd backend && pip install -r requirements.txt"
fi

###############################################################################
# 5. DATABASE CONNECTIVITY (if possible)
###############################################################################
print_header "5. DATABASE CONNECTIVITY"

if [ -f "backend/.env" ]; then
    source backend/.env

    print_check "PostgreSQL client available"
    if command -v psql &> /dev/null; then
        print_pass "psql found"

        # Try to connect to database
        print_check "Database connection test"
        if [ -n "$DATABASE_URL" ] && [[ ! "$DATABASE_URL" =~ \[YOUR-PASSWORD\] ]]; then
            # Test connection with timeout
            if timeout 5 psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
                print_pass "Successfully connected to database"

                # Check for tables
                print_check "Checking for municipios table"
                TABLE_CHECK=$(timeout 5 psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'municipios');" 2>/dev/null | tr -d '[:space:]')
                if [ "$TABLE_CHECK" = "t" ]; then
                    print_pass "municipios table exists"

                    # Count municipalities
                    MUNI_COUNT=$(timeout 5 psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM municipios;" 2>/dev/null | tr -d '[:space:]')
                    if [ -n "$MUNI_COUNT" ] && [ "$MUNI_COUNT" -gt 0 ]; then
                        print_pass "Found $MUNI_COUNT municipalities in database"
                    else
                        print_warn "municipios table exists but appears empty"
                    fi
                else
                    print_warn "municipios table not found - database might need migration"
                fi
            else
                print_fail "Could not connect to database (timeout or auth failure)"
                print_info "Check DATABASE_URL and password"
            fi
        else
            print_warn "Skipping connection test (DATABASE_URL not configured)"
        fi
    else
        print_warn "psql not found - skipping database connection test"
        print_info "Install: sudo apt-get install postgresql-client (Ubuntu/Debian)"
    fi
fi

###############################################################################
# 6. PORT AVAILABILITY
###############################################################################
print_header "6. PORT AVAILABILITY"

print_check "Port 3000 (Frontend)"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warn "Port 3000 is already in use"
    print_info "Stop the process or use a different port"
else
    print_pass "Port 3000 is available"
fi

print_check "Port 8000 (Backend)"
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warn "Port 8000 is already in use"
    print_info "Stop the process or use a different port"
else
    print_pass "Port 8000 is available"
fi

###############################################################################
# 7. GIT STATUS
###############################################################################
print_header "7. GIT STATUS"

print_check "Git repository"
if [ -d "../../.git" ]; then
    print_pass "Git repository detected"

    BRANCH=$(git branch --show-current 2>/dev/null)
    if [ -n "$BRANCH" ]; then
        print_info "Current branch: $BRANCH"
    fi

    # Check for uncommitted changes
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        print_pass "No uncommitted changes"
    else
        print_warn "You have uncommitted changes"
    fi
else
    print_warn "Not a git repository or .git not found"
fi

###############################################################################
# 8. SECURITY CHECKS
###############################################################################
print_header "8. SECURITY CHECKS"

print_check ".env files in .gitignore"
if [ -f ".gitignore" ]; then
    if grep -q ".env" .gitignore; then
        print_pass ".env files are in .gitignore"
    else
        print_fail ".env files NOT in .gitignore - SECURITY RISK!"
        print_info "Add .env and .env.local to .gitignore immediately"
    fi
elif [ -f "../../.gitignore" ]; then
    if grep -q ".env" ../../.gitignore; then
        print_pass ".env files are in parent .gitignore"
    else
        print_fail ".env files NOT in .gitignore - SECURITY RISK!"
        print_info "Add .env and .env.local to .gitignore immediately"
    fi
else
    print_warn ".gitignore not found"
fi

print_check "DEBUG mode (backend)"
if [ -f "backend/.env" ]; then
    source backend/.env
    if [ "$DEBUG" = "true" ]; then
        print_warn "DEBUG=true (OK for development, but disable for production)"
    else
        print_pass "DEBUG=false"
    fi
fi

###############################################################################
# SUMMARY
###############################################################################
print_header "VERIFICATION SUMMARY"

echo -e "Total Checks:    $TOTAL_CHECKS"
echo -e "${GREEN}Passed:          $PASSED_CHECKS${NC}"
echo -e "${RED}Failed:          $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings:        $WARNING_CHECKS${NC}"

echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    if [ $WARNING_CHECKS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHECKS PASSED! Platform is ready to run.${NC}"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "1. Start backend:  cd backend && python -m uvicorn app.main:app --reload"
        echo "2. Start frontend: cd frontend && npm run dev"
        echo "3. Open browser:   http://localhost:3000"
    else
        echo -e "${YELLOW}⚠️  SETUP COMPLETE WITH WARNINGS${NC}"
        echo -e "${YELLOW}Review warnings above and fix if necessary.${NC}"
        echo ""
        echo -e "${BLUE}Platform should still work. Next steps:${NC}"
        echo "1. Start backend:  cd backend && python -m uvicorn app.main:app --reload"
        echo "2. Start frontend: cd frontend && npm run dev"
    fi
else
    echo -e "${RED}❌ SETUP INCOMPLETE - Please fix failed checks above${NC}"
    echo ""
    echo -e "${BLUE}Common fixes:${NC}"
    echo "- Missing .env files: Copy from .env.example and fill in credentials"
    echo "- Missing dependencies: Run 'npm install' (frontend) and 'pip install -r requirements.txt' (backend)"
    echo "- Database issues: Check Supabase credentials and connection string"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification complete!${NC}"
echo -e "${BLUE}========================================${NC}"

# Exit with appropriate code
if [ $FAILED_CHECKS -gt 0 ]; then
    exit 1
else
    exit 0
fi
