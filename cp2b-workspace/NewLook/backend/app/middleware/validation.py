"""
Input validation middleware for API endpoints
Prevents injection attacks and ensures data integrity
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional
import re
import logging

logger = logging.getLogger(__name__)

# Validation patterns
PATTERNS = {
    'email': re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
    'alphanumeric': re.compile(r'^[a-zA-Z0-9_-]+$'),
    'numeric': re.compile(r'^\d+$'),
    'float': re.compile(r'^-?\d+\.?\d*$'),
    'municipality_code': re.compile(r'^\d{7}$'),  # 7-digit IBGE code
    'sector_code': re.compile(r'^[A-Z0-9]{2,10}$'),
    'safe_string': re.compile(r'^[a-zA-Z0-9\s.,;:!?()\-_áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+$'),
}

# SQL injection patterns to detect
SQL_INJECTION_PATTERNS = [
    re.compile(r"(\bunion\b.*\bselect\b)", re.IGNORECASE),
    re.compile(r"(\bor\b\s+['\"]?1['\"]?\s*=\s*['\"]?1)", re.IGNORECASE),
    re.compile(r"(\band\b\s+['\"]?1['\"]?\s*=\s*['\"]?1)", re.IGNORECASE),
    re.compile(r"(;\s*drop\s+table)", re.IGNORECASE),
    re.compile(r"(;\s*delete\s+from)", re.IGNORECASE),
    re.compile(r"(;\s*insert\s+into)", re.IGNORECASE),
    re.compile(r"(;\s*update\s+\w+\s+set)", re.IGNORECASE),
    re.compile(r"(javascript:)", re.IGNORECASE),  # XSS
]

# Command injection patterns
COMMAND_INJECTION_PATTERNS = [
    re.compile(r"[;&|`$]"),  # Shell metacharacters
    re.compile(r"\$\("),     # Command substitution
    re.compile(r"`"),        # Backticks
]


def detect_sql_injection(value: str) -> bool:
    """
    Detect potential SQL injection attempts.

    Args:
        value: String to check

    Returns:
        True if potential SQL injection detected
    """
    if not isinstance(value, str):
        return False

    for pattern in SQL_INJECTION_PATTERNS:
        if pattern.search(value):
            return True
    return False


def detect_command_injection(value: str) -> bool:
    """
    Detect potential command injection attempts.

    Args:
        value: String to check

    Returns:
        True if potential command injection detected
    """
    if not isinstance(value, str):
        return False

    for pattern in COMMAND_INJECTION_PATTERNS:
        if pattern.search(value):
            return True
    return False


def validate_string(
    value: Any,
    pattern_name: Optional[str] = None,
    min_length: int = 0,
    max_length: int = 10000,
    allow_none: bool = False
) -> str:
    """
    Validate string input.

    Args:
        value: Value to validate
        pattern_name: Optional pattern to match against
        min_length: Minimum string length
        max_length: Maximum string length
        allow_none: Whether None is allowed

    Returns:
        Validated string

    Raises:
        HTTPException: If validation fails
    """
    if value is None:
        if allow_none:
            return None
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Value cannot be None"
        )

    if not isinstance(value, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected string, got {type(value).__name__}"
        )

    # Check length
    if len(value) < min_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"String too short (minimum {min_length} characters)"
        )

    if len(value) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"String too long (maximum {max_length} characters)"
        )

    # Check for injection attacks
    if detect_sql_injection(value):
        logger.warning(f"SQL injection attempt detected: {value[:100]}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid input: potential SQL injection detected"
        )

    if detect_command_injection(value):
        logger.warning(f"Command injection attempt detected: {value[:100]}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid input: potential command injection detected"
        )

    # Validate against pattern if provided
    if pattern_name and pattern_name in PATTERNS:
        if not PATTERNS[pattern_name].match(value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid format for {pattern_name}"
            )

    return value


def validate_integer(
    value: Any,
    min_value: Optional[int] = None,
    max_value: Optional[int] = None,
    allow_none: bool = False
) -> int:
    """
    Validate integer input.

    Args:
        value: Value to validate
        min_value: Minimum allowed value
        max_value: Maximum allowed value
        allow_none: Whether None is allowed

    Returns:
        Validated integer

    Raises:
        HTTPException: If validation fails
    """
    if value is None:
        if allow_none:
            return None
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Value cannot be None"
        )

    try:
        int_value = int(value)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected integer, got {value}"
        )

    if min_value is not None and int_value < min_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Value must be at least {min_value}"
        )

    if max_value is not None and int_value > max_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Value must be at most {max_value}"
        )

    return int_value


def validate_float(
    value: Any,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    allow_none: bool = False
) -> float:
    """
    Validate float input.

    Args:
        value: Value to validate
        min_value: Minimum allowed value
        max_value: Maximum allowed value
        allow_none: Whether None is allowed

    Returns:
        Validated float

    Raises:
        HTTPException: If validation fails
    """
    if value is None:
        if allow_none:
            return None
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Value cannot be None"
        )

    try:
        float_value = float(value)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected float, got {value}"
        )

    if min_value is not None and float_value < min_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Value must be at least {min_value}"
        )

    if max_value is not None and float_value > max_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Value must be at most {max_value}"
        )

    return float_value


def sanitize_query_params(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize query parameters to prevent injection attacks.

    Args:
        params: Dictionary of query parameters

    Returns:
        Sanitized parameters
    """
    sanitized = {}

    for key, value in params.items():
        if isinstance(value, str):
            # Check for injection attempts
            if detect_sql_injection(value) or detect_command_injection(value):
                logger.warning(f"Injection attempt in param '{key}': {value[:100]}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid value for parameter '{key}'"
                )
            sanitized[key] = value
        else:
            sanitized[key] = value

    return sanitized


async def validation_middleware(request: Request, call_next):
    """
    Middleware to validate and sanitize all incoming requests.

    Args:
        request: FastAPI request
        call_next: Next middleware/handler

    Returns:
        Response from next handler

    Raises:
        HTTPException: If validation fails
    """
    # Skip validation for OPTIONS requests (CORS preflight)
    if request.method == "OPTIONS":
        return await call_next(request)

    # Validate query parameters
    try:
        if request.query_params:
            sanitize_query_params(dict(request.query_params))
    except HTTPException as e:
        logger.warning(
            f"Validation failed for {request.method} {request.url.path}",
            extra={"params": dict(request.query_params)}
        )
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail})

    # Continue to next handler
    response = await call_next(request)
    return response


# Utility validators for common use cases
class Validators:
    """Collection of common validators"""

    @staticmethod
    def email(value: str) -> str:
        """Validate email address"""
        return validate_string(value, pattern_name='email', max_length=255)

    @staticmethod
    def municipality_code(value: str) -> str:
        """Validate IBGE municipality code (7 digits)"""
        return validate_string(value, pattern_name='municipality_code')

    @staticmethod
    def sector_code(value: str) -> str:
        """Validate sector code"""
        return validate_string(value, pattern_name='sector_code', max_length=10)

    @staticmethod
    def limit(value: int) -> int:
        """Validate pagination limit"""
        return validate_integer(value, min_value=1, max_value=1000)

    @staticmethod
    def offset(value: int) -> int:
        """Validate pagination offset"""
        return validate_integer(value, min_value=0, max_value=100000)

    @staticmethod
    def latitude(value: float) -> float:
        """Validate latitude"""
        return validate_float(value, min_value=-90.0, max_value=90.0)

    @staticmethod
    def longitude(value: float) -> float:
        """Validate longitude"""
        return validate_float(value, min_value=-180.0, max_value=180.0)

    @staticmethod
    def radius_km(value: float) -> float:
        """Validate radius in kilometers"""
        return validate_float(value, min_value=0.1, max_value=1000.0)

    @staticmethod
    def safe_text(value: str, max_length: int = 1000) -> str:
        """Validate safe text input (no injection)"""
        return validate_string(
            value,
            pattern_name='safe_string',
            max_length=max_length
        )


__all__ = [
    'validate_string',
    'validate_integer',
    'validate_float',
    'sanitize_query_params',
    'validation_middleware',
    'Validators',
    'detect_sql_injection',
    'detect_command_injection',
]
