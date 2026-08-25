# Multi-stage build for CP2B Maps V3 Backend
#
# BUILD CONTEXT IS <NewLook>/, NOT backend/ — feedstocks.yaml (the single source of
# truth for every BMP/TS/VS/FDE value) lives at <NewLook>/data/, which a backend/
# context cannot reach. Build with:
#   docker build -f backend/Dockerfile -t cp2b-maps-backend .      # from <NewLook>/
# The layout inside the image mirrors the dev container (backend/ as /app, canonical
# parameters at /app/data/canonical_parameters), so the loader resolves identically
# in both. See <NewLook>/.dockerignore — it must stay in sync with this context.
#
# Stage 1: Builder - Install dependencies
FROM python:3.11-slim as builder

# Install build dependencies including GDAL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
WORKDIR /app
COPY backend/requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime - Minimal production image
FROM python:3.11-slim

# Install only runtime dependencies (use libgdal36 for Debian Trixie/Python 3.11)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    gdal-bin \
    libgdal36 \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Set working directory
WORKDIR /app

# Copy application code. backend/ becomes /app, matching the dev bind-mount.
COPY backend/ .

# Canonical parameters, from outside backend/. Mounted read-only at the same path
# in dev (see docker-compose.yml) so app/services/canonical_loader.py resolves the
# same way in both. Without this the image serves zero biogas metrics — silently,
# because the map endpoints catch the miss per-municipality.
COPY data/canonical_parameters/ ./data/canonical_parameters/

# Download shapefiles (cached layer if script unchanged)
RUN bash ./scripts/download-shapefiles.sh

# Set environment variables
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Run the application (clear Python cache first to avoid stale bytecode)
CMD ["sh", "-c", "find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true && find . -type f -name '*.pyc' -delete 2>/dev/null || true && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
