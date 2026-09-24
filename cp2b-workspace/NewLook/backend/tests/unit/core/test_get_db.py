"""get_db(): a block that finishes commits; any exception rolls back."""

from unittest.mock import MagicMock

import psycopg2
import pytest
from fastapi import HTTPException

from app.core.database import get_db


@pytest.fixture
def pool(monkeypatch):
    mock_pool = MagicMock()
    mock_pool.getconn.return_value = MagicMock()
    monkeypatch.setattr("app.core.database.get_connection_pool", lambda: mock_pool)
    return mock_pool


@pytest.mark.unit
def test_a_block_that_finishes_commits(pool):
    with get_db() as conn:
        conn.cursor().execute("SELECT 1")

    conn.commit.assert_called_once()
    conn.rollback.assert_not_called()
    pool.putconn.assert_called_once_with(conn)


@pytest.mark.unit
def test_a_callers_exception_rolls_back_instead_of_committing(pool):
    # It used to fall through to a commit of what the block had written.
    with pytest.raises(HTTPException):
        with get_db() as conn:
            conn.cursor().execute("UPDATE residuos SET nome_en = 'x'")
            raise HTTPException(status_code=404, detail="not found")

    conn.rollback.assert_called_once()
    conn.commit.assert_not_called()
    pool.putconn.assert_called_once_with(conn)


@pytest.mark.unit
def test_a_database_error_rolls_back(pool):
    with pytest.raises(psycopg2.OperationalError):
        with get_db() as conn:
            raise psycopg2.OperationalError("connection lost")

    conn.rollback.assert_called_once()
    conn.commit.assert_not_called()
    pool.putconn.assert_called_once_with(conn)


@pytest.mark.unit
def test_a_failed_rollback_keeps_the_original_error(pool):
    pool.getconn.return_value.rollback.side_effect = psycopg2.InterfaceError("already closed")
    with pytest.raises(ValueError, match="bad input"):
        with get_db():
            raise ValueError("bad input")
    pool.putconn.assert_called_once()
