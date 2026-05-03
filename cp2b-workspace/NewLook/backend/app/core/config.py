"""
Configuration settings for PILAR-2b V3 Backend
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator, ValidationError
from typing import List, Optional
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App settings
    APP_NAME: str = "PILAR-2b V3 API"
    VERSION: str = "3.0.1"
    APP_ENV: str = "development"  # development, staging, production
    DEBUG: bool = False  # Default to False for security - can be overridden by env var
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS settings - NO WILDCARDS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3006",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3006",
    ]
    # Production origins - comma-separated, includes main and preview deployments
    # Supports both Vercel and Cloudflare Pages deployments
    PRODUCTION_ORIGINS: str = "https://cp2b.unicamp.br,https://new-look-nu.vercel.app,https://new-look-delta.vercel.app,https://cp2bmaps.pages.dev,https://541792a2.cp2bmaps.pages.dev"
    ALLOWED_HOSTS: List[str] = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "newlook-production.up.railway.app",  # Railway (legacy, can be removed after migration)
        "*.onrender.com",  # Render (all deployments)
        "*.vercel.app",  # Vercel (all deployments)
        "*.pages.dev",  # Cloudflare Pages (all deployments)
    ]

    # Database settings
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/cp2b_maps"
    DATABASE_URL_SYNC: str = "postgresql://user:password@localhost:5432/cp2b_maps"

    # PostgreSQL connection details (parsed from DATABASE_URL or set individually)
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "postgres"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""

    # Supabase settings
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # JWT settings - CRITICAL: Change in production
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # External APIs
    GEMINI_API_KEY: Optional[str] = None

    # File paths
    DATA_DIR: Path = Path(__file__).parent.parent.parent.parent / "data"
    UPLOAD_DIR: Path = Path(__file__).parent.parent.parent / "uploads"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Request size limiting (DoS protection)
    MAX_REQUEST_SIZE: int = 10_000_000  # 10MB maximum request body size

    # Logging
    LOG_LEVEL: str = "INFO"

    @field_validator('DATABASE_URL', mode='before')
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info):
        """Assemble database connection string if not present"""
        if isinstance(v, str) and v and v != "postgresql://user:password@localhost:5432/cp2b_maps":
            return v

        # Check if individual components are available in env
        host = os.getenv("POSTGRES_HOST")
        user = os.getenv("POSTGRES_USER")
        password = os.getenv("POSTGRES_PASSWORD")
        db = os.getenv("POSTGRES_DB")
        port = os.getenv("POSTGRES_PORT", "5432")

        if host and user and db:
            # Build connection string
            # Handle password
            pwd_part = f":{password}" if password else ""
            return f"postgresql://{user}{pwd_part}@{host}:{port}/{db}"
            
        return v or "postgresql://user:password@localhost:5432/cp2b_maps"

    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v, info):
        """Ensure SECRET_KEY is secure in production"""
        app_env = os.getenv("APP_ENV", "development")

        if v == "your-secret-key-change-in-production":
            if app_env == "production":
                logger.error(
                    "🚨 SECURITY ERROR: SECRET_KEY must be changed in production!\n"
                    "Generate a secure key with: openssl rand -hex 32\n"
                    "Set in environment: export SECRET_KEY=<generated-key>"
                )
                raise ValueError("SECRET_KEY must be changed in production")
            logger.warning("⚠️  Using default SECRET_KEY in development")

        if len(v) < 32:
            logger.error(
                f"SECRET_KEY too short ({len(v)} chars). Must be at least 32 characters.\n"
                f"Generate with: openssl rand -hex 32"
            )
            raise ValueError(f"SECRET_KEY too short: {len(v)} characters (minimum 32)")

        return v

    @field_validator('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')
    @classmethod
    def validate_supabase(cls, v, info):
        """Ensure Supabase credentials are set if using auth"""
        app_env = os.getenv("APP_ENV", "development")
        field_name = info.field_name

        if not v and app_env == "production":
            logger.warning(
                f"⚠️  {field_name} not set in production. "
                f"Set with: export {field_name}=<your-value>"
            )

        return v

    @field_validator('POSTGRES_PASSWORD')
    @classmethod
    def validate_postgres_password(cls, v):
        """Ensure database password is set"""
        app_env = os.getenv("APP_ENV", "development")

        if not v and app_env == "production":
            logger.error(
                "🚨 POSTGRES_PASSWORD is required in production!\n"
                "Set in environment: export POSTGRES_PASSWORD=<secure-password>"
            )
            raise ValueError("POSTGRES_PASSWORD is required in production")

        # URL-encoded passwords are valid (e.g., %23 for #)
        # Don't validate length for URL-encoded passwords
        if v and len(v) < 12 and app_env == "production" and '%' not in v:
            logger.warning(
                f"⚠️  POSTGRES_PASSWORD is short ({len(v)} chars). "
                f"Consider using at least 12 characters for better security."
            )

        return v

    def get_all_origins(self) -> List[str]:
        """Get all allowed CORS origins including production"""
        origins = self.ALLOWED_ORIGINS.copy()

        if self.PRODUCTION_ORIGINS:
            prod_origins = [o.strip() for o in self.PRODUCTION_ORIGINS.split(",")]
            origins.extend(prod_origins)
            logger.info(f"Added {len(prod_origins)} production origins")

        return origins

    def validate_all(self) -> bool:
        """Validate all settings and log status"""
        try:
            logger.info(f"Environment: {self.APP_ENV}")
            logger.info(f"Debug mode: {self.DEBUG}")
            logger.info(f"Database: {self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}")

            all_origins = self.get_all_origins()
            logger.info(f"CORS origins: {len(all_origins)} configured")

            # Security checks for production
            if self.APP_ENV == "production":
                if "*" in all_origins:
                    raise ValueError("🚨 Wildcard CORS (*) not allowed in production!")
                if len(self.SECRET_KEY) < 32:
                    raise ValueError("🚨 SECRET_KEY too short for production")
                logger.info("✅ Production security validation passed")

            return True

        except Exception as e:
            logger.error(f"❌ Settings validation failed: {e}")
            return False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Create settings instance with error handling
try:
    settings = Settings()
    settings.validate_all()
    logger.info("✅ Configuration loaded successfully")
except ValidationError as e:
    print("\n" + "="*60)
    print("🚨 CONFIGURATION ERROR")
    print("="*60)
    for error in e.errors():
        field = '.'.join(str(loc) for loc in error['loc'])
        message = error['msg']
        error_type = error.get('type', 'unknown')
        print(f"❌ Field: {field}")
        print(f"   Error: {message}")
        print(f"   Type: {error_type}")
        if 'input' in error:
            print(f"   Value: {str(error['input'])[:100]}")
        print()
    print("="*60)
    print("\nEnvironment Variables Check:")
    print(f"  APP_ENV: {os.getenv('APP_ENV', 'NOT SET')}")
    print(f"  SECRET_KEY: {'SET' if os.getenv('SECRET_KEY') else 'NOT SET'} (length: {len(os.getenv('SECRET_KEY', ''))})")
    print(f"  DATABASE_URL: {'SET' if os.getenv('DATABASE_URL') else 'NOT SET'}")
    print(f"  POSTGRES_PASSWORD: {'SET' if os.getenv('POSTGRES_PASSWORD') else 'NOT SET'}")
    print("="*60 + "\n")
    raise
except Exception as e:
    print(f"\n🚨 Failed to load settings: {e}")
    print(f"   Error type: {type(e).__name__}")
    import traceback
    traceback.print_exc()
    raise