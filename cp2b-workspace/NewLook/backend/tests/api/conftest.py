"""
Re-export root conftest fixtures into the tests/api package.

All fixtures defined in tests/conftest.py (client, test_app,
mock_db_connection, etc.) are already discovered by pytest through the
conftest hierarchy, so this file only needs to exist to mark the directory
as a pytest package and to house any api-specific overrides.
"""
