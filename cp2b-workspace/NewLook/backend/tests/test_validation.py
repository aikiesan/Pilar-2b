"""
Tests for input validation middleware
Ensures protection against injection attacks
"""
import pytest
from fastapi import HTTPException
from app.middleware.validation import (
    validate_string,
    validate_integer,
    validate_float,
    detect_sql_injection,
    detect_command_injection,
    sanitize_query_params,
    Validators
)


class TestSQLInjectionDetection:
    """Test SQL injection detection"""

    def test_detect_union_select(self):
        """Test detection of UNION SELECT attacks"""
        assert detect_sql_injection("' UNION SELECT * FROM users--")
        assert detect_sql_injection("1' union select password from users--")

    def test_detect_or_1_equals_1(self):
        """Test detection of OR 1=1 attacks"""
        assert detect_sql_injection("admin' OR '1'='1")
        assert detect_sql_injection("' OR 1=1--")

    def test_detect_drop_table(self):
        """Test detection of DROP TABLE attacks"""
        assert detect_sql_injection("'; DROP TABLE users;--")
        assert detect_sql_injection("1; drop table users")

    def test_detect_xss_script(self):
        """Test detection of XSS script tags"""
        assert detect_sql_injection("<script>alert('xss')</script>")
        assert detect_sql_injection("<SCRIPT>malicious()</SCRIPT>")

    def test_safe_strings_not_detected(self):
        """Test that safe strings are not flagged"""
        assert not detect_sql_injection("normal text")
        assert not detect_sql_injection("email@example.com")
        assert not detect_sql_injection("123456")


class TestCommandInjectionDetection:
    """Test command injection detection"""

    def test_detect_semicolon(self):
        """Test detection of semicolon command separator"""
        assert detect_command_injection("ls; rm -rf /")

    def test_detect_pipe(self):
        """Test detection of pipe operator"""
        assert detect_command_injection("cat file | grep password")

    def test_detect_command_substitution(self):
        """Test detection of command substitution"""
        assert detect_command_injection("echo $(whoami)")
        assert detect_command_injection("echo `id`")

    def test_safe_strings_not_detected(self):
        """Test that safe strings are not flagged"""
        assert not detect_command_injection("normal text")
        assert not detect_command_injection("email@example.com")


class TestStringValidation:
    """Test string validation"""

    def test_valid_string(self):
        """Test validation of valid string"""
        result = validate_string("hello world", min_length=1, max_length=100)
        assert result == "hello world"

    def test_string_too_short(self):
        """Test rejection of too-short string"""
        with pytest.raises(HTTPException) as exc:
            validate_string("a", min_length=5)
        assert exc.value.status_code == 400

    def test_string_too_long(self):
        """Test rejection of too-long string"""
        with pytest.raises(HTTPException) as exc:
            validate_string("a" * 1001, max_length=1000)
        assert exc.value.status_code == 400

    def test_sql_injection_rejected(self):
        """Test rejection of SQL injection"""
        with pytest.raises(HTTPException) as exc:
            validate_string("' OR 1=1--")
        assert exc.value.status_code == 400
        assert "SQL injection" in str(exc.value.detail)

    def test_command_injection_rejected(self):
        """Test rejection of command injection"""
        with pytest.raises(HTTPException) as exc:
            validate_string("ls; rm -rf")
        assert exc.value.status_code == 400
        assert "command injection" in str(exc.value.detail)

    def test_pattern_validation_email(self):
        """Test email pattern validation"""
        valid = validate_string("test@example.com", pattern_name='email')
        assert valid == "test@example.com"

        with pytest.raises(HTTPException):
            validate_string("not-an-email", pattern_name='email')

    def test_none_handling(self):
        """Test None value handling"""
        with pytest.raises(HTTPException):
            validate_string(None)

        result = validate_string(None, allow_none=True)
        assert result is None


class TestIntegerValidation:
    """Test integer validation"""

    def test_valid_integer(self):
        """Test validation of valid integer"""
        result = validate_integer(42, min_value=0, max_value=100)
        assert result == 42

    def test_integer_from_string(self):
        """Test conversion from string"""
        result = validate_integer("42")
        assert result == 42

    def test_value_too_small(self):
        """Test rejection of too-small value"""
        with pytest.raises(HTTPException) as exc:
            validate_integer(5, min_value=10)
        assert exc.value.status_code == 400

    def test_value_too_large(self):
        """Test rejection of too-large value"""
        with pytest.raises(HTTPException) as exc:
            validate_integer(150, max_value=100)
        assert exc.value.status_code == 400

    def test_invalid_type(self):
        """Test rejection of invalid type"""
        with pytest.raises(HTTPException):
            validate_integer("not a number")


class TestFloatValidation:
    """Test float validation"""

    def test_valid_float(self):
        """Test validation of valid float"""
        result = validate_float(3.14, min_value=0.0, max_value=10.0)
        assert result == 3.14

    def test_float_from_string(self):
        """Test conversion from string"""
        result = validate_float("3.14")
        assert result == 3.14

    def test_value_too_small(self):
        """Test rejection of too-small value"""
        with pytest.raises(HTTPException):
            validate_float(0.5, min_value=1.0)

    def test_value_too_large(self):
        """Test rejection of too-large value"""
        with pytest.raises(HTTPException):
            validate_float(150.0, max_value=100.0)


class TestSanitizeQueryParams:
    """Test query parameter sanitization"""

    def test_safe_params(self):
        """Test sanitization of safe parameters"""
        params = {'name': 'John', 'age': '30', 'city': 'São Paulo'}
        result = sanitize_query_params(params)
        assert result == params

    def test_sql_injection_in_params(self):
        """Test rejection of SQL injection in params"""
        params = {'query': "' OR 1=1--"}
        with pytest.raises(HTTPException) as exc:
            sanitize_query_params(params)
        assert exc.value.status_code == 400

    def test_command_injection_in_params(self):
        """Test rejection of command injection in params"""
        params = {'cmd': "ls; rm -rf"}
        with pytest.raises(HTTPException) as exc:
            sanitize_query_params(params)
        assert exc.value.status_code == 400


class TestValidators:
    """Test Validators utility class"""

    def test_email_validator(self):
        """Test email validator"""
        assert Validators.email("test@example.com") == "test@example.com"
        with pytest.raises(HTTPException):
            Validators.email("not-an-email")

    def test_municipality_code_validator(self):
        """Test municipality code validator (7 digits)"""
        assert Validators.municipality_code("3550308") == "3550308"
        with pytest.raises(HTTPException):
            Validators.municipality_code("123")  # Too short

    def test_limit_validator(self):
        """Test pagination limit validator"""
        assert Validators.limit(50) == 50
        with pytest.raises(HTTPException):
            Validators.limit(0)  # Too small
        with pytest.raises(HTTPException):
            Validators.limit(2000)  # Too large

    def test_offset_validator(self):
        """Test pagination offset validator"""
        assert Validators.offset(0) == 0
        assert Validators.offset(100) == 100
        with pytest.raises(HTTPException):
            Validators.offset(-1)  # Negative

    def test_latitude_validator(self):
        """Test latitude validator"""
        assert Validators.latitude(-23.55) == -23.55
        with pytest.raises(HTTPException):
            Validators.latitude(100.0)  # Out of range

    def test_longitude_validator(self):
        """Test longitude validator"""
        assert Validators.longitude(-46.63) == -46.63
        with pytest.raises(HTTPException):
            Validators.longitude(200.0)  # Out of range

    def test_radius_validator(self):
        """Test radius validator"""
        assert Validators.radius_km(10.5) == 10.5
        with pytest.raises(HTTPException):
            Validators.radius_km(0.01)  # Too small
        with pytest.raises(HTTPException):
            Validators.radius_km(2000.0)  # Too large

    def test_safe_text_validator(self):
        """Test safe text validator"""
        text = "This is safe text with áéíóú!"
        assert Validators.safe_text(text) == text

        # Should reject script tags
        with pytest.raises(HTTPException):
            Validators.safe_text("<script>alert('xss')</script>")


class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_empty_string(self):
        """Test handling of empty string"""
        result = validate_string("", min_length=0, max_length=10)
        assert result == ""

        with pytest.raises(HTTPException):
            validate_string("", min_length=1)

    def test_unicode_characters(self):
        """Test handling of Unicode characters"""
        result = validate_string("São Paulo", pattern_name='safe_string')
        assert result == "São Paulo"

    def test_boundary_values_integer(self):
        """Test boundary values for integer"""
        assert validate_integer(10, min_value=10, max_value=10) == 10

    def test_boundary_values_float(self):
        """Test boundary values for float"""
        assert validate_float(1.0, min_value=1.0, max_value=1.0) == 1.0

    def test_zero_values(self):
        """Test zero values"""
        assert validate_integer(0) == 0
        assert validate_float(0.0) == 0.0

    def test_negative_values(self):
        """Test negative values"""
        assert validate_integer(-10, min_value=-100) == -10
        assert validate_float(-3.14, min_value=-10.0) == -3.14
