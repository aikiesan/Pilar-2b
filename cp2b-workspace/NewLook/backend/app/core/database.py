"""
Database Connection Management
PostgreSQL + PostGIS connection handling with connection pooling
"""

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import logging
import os
import threading

from app.core.config import settings

logger = logging.getLogger(__name__)

# Fix for Windows UTF-8 encoding issues with psycopg2
os.environ['PYTHONUTF8'] = '1'

# Global connection pool (thread-safe)
_connection_pool = None
_pool_lock = threading.Lock()


def get_connection_pool():
    """
    Get or create the database connection pool (singleton, thread-safe).

    Pool configuration:
    - minconn: Minimum number of connections to keep open
    - maxconn: Maximum number of connections allowed
    - Uses DATABASE_URL as DSN to avoid duplicate SASL authentication

    Returns:
        psycopg2.pool.ThreadedConnectionPool
    """
    global _connection_pool

    if _connection_pool is None:
        with _pool_lock:
            # Double-check locking pattern
            if _connection_pool is None:
                try:
                    # Use DATABASE_URL as DSN to avoid duplicate authentication
                    # Only pass additional options that are NOT in the DSN
                    _connection_pool = pool.ThreadedConnectionPool(
                        minconn=2,  # Minimum connections
                        maxconn=20,  # Maximum connections
                        dsn=settings.DATABASE_URL,  # Use DSN instead of individual params
                        cursor_factory=RealDictCursor,
                        connect_timeout=10,
                        options='-c statement_timeout=30000 -c client_encoding=UTF8'
                    )
                    logger.info("✅ Database connection pool initialized (min=2, max=20)")
                except psycopg2.Error as e:
                    logger.error(f"❌ Failed to create connection pool: {e}")
                    raise

    return _connection_pool


def get_db_connection():
    """
    Get PostgreSQL database connection (LEGACY - prefer get_db()).
    Uses DATABASE_URL as DSN to avoid duplicate SASL authentication.

    Returns:
        psycopg2 connection object
    """
    try:
        # Use DATABASE_URL as DSN to avoid duplicate authentication
        conn = psycopg2.connect(
            dsn=settings.DATABASE_URL,
            cursor_factory=RealDictCursor,  # Return rows as dictionaries
            connect_timeout=10,
            options='-c statement_timeout=30000 -c client_encoding=UTF8'
        )
        # Ensure UTF-8 encoding
        conn.set_client_encoding('UTF8')
        return conn
    except psycopg2.Error as e:
        logger.error(f"Database connection error: {e}")
        raise Exception(f"Database connection error: {e}")


@contextmanager
def get_db():
    """
    Context manager for database connections from pool (RECOMMENDED).
    Ensures connections are always returned to pool, even if exceptions occur.

    Features:
    - Connection pooling for better performance
    - Automatic connection return to pool
    - Transaction rollback on errors
    - UTF-8 encoding enforcement

    Usage:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM table")
            # ... use connection
            cursor.close()

    Yields:
        psycopg2 connection from pool
    """
    conn = None
    connection_pool = get_connection_pool()

    try:
        # Get connection from pool
        conn = connection_pool.getconn()

        # Ensure UTF-8 encoding
        conn.set_client_encoding('UTF8')
        logger.debug(f"Connection acquired from pool (host: {settings.POSTGRES_HOST})")

        yield conn

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            # Commit any pending transaction to ensure fresh data on next use
            # This prevents stale transaction snapshots when connection is reused
            try:
                conn.commit()
            except Exception:
                pass  # Connection might already be in error state

            # Return connection to pool instead of closing it
            connection_pool.putconn(conn)
            logger.debug("Connection returned to pool")


@contextmanager
def get_db_transaction():
    """
    Context manager for transactional database operations (RECOMMENDED for writes).
    Automatically commits on success, rolls back on errors.

    Features:
    - Connection pooling for performance
    - Automatic COMMIT on success
    - Automatic ROLLBACK on any exception
    - UTF-8 encoding enforcement
    - Thread-safe connection management

    Usage:
        with get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO table VALUES (%s)", (value,))
            cursor.execute("UPDATE other_table SET field = %s WHERE id = %s", (val, id))
            cursor.close()
            # Automatic COMMIT if no exceptions
            # Automatic ROLLBACK if any exception occurs

    Best Practices:
        - Use for INSERT, UPDATE, DELETE operations
        - Use get_db() for read-only SELECT operations
        - Operations are atomic - all succeed or all fail

    Yields:
        psycopg2 connection from pool with autocommit=False
    """
    conn = None
    connection_pool = get_connection_pool()

    try:
        # Get connection from pool
        conn = connection_pool.getconn()

        # Ensure UTF-8 encoding
        conn.set_client_encoding('UTF8')

        # Explicitly disable autocommit for transaction management
        conn.autocommit = False

        logger.debug(f"Transaction started (host: {settings.POSTGRES_HOST})")

        yield conn

        # If we reach here, no exception occurred - commit the transaction
        conn.commit()
        logger.debug("Transaction committed successfully")

    except Exception as e:
        # Any exception triggers rollback
        logger.error(f"Transaction failed, rolling back: {e}")
        if conn:
            conn.rollback()
            logger.debug("Transaction rolled back")
        raise  # Re-raise the exception after rollback

    finally:
        if conn:
            # Restore autocommit before returning to pool
            conn.autocommit = True
            # Return connection to pool
            connection_pool.putconn(conn)
            logger.debug("Connection returned to pool")


@contextmanager
def get_db_cursor(commit: bool = False):
    """
    Context manager for database cursor (LEGACY - prefer get_db())

    Args:
        commit: Whether to commit the transaction

    Yields:
        psycopg2 cursor
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        yield cursor

        if commit:
            conn.commit()

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cursor.close()
        conn.close()


def test_db_connection() -> bool:
    """
    Test database connection and PostGIS availability.
    Used for health checks.

    Returns:
        True if connection successful, False otherwise
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Test basic connectivity
            cursor.execute("SELECT 1")
            result = cursor.fetchone()

            # Test PostGIS
            cursor.execute("SELECT PostGIS_Version();")
            version = cursor.fetchone()

            cursor.close()

            logger.info("✓ Database connected successfully")
            logger.info(f"✓ PostGIS version: {next(iter(version.values())) if version else 'Unknown'}")

            return result is not None

    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        return False
