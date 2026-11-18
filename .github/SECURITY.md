# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.0.x   | ✅ Yes    |
| < 3.0   | ❌ No     |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public issue.

Use GitHub's private [Report a vulnerability](https://github.com/aikiesan/Pilar-2b/security/advisories/new) feature to submit your report confidentially. We will respond within 72 hours.

Please include:
- A description of the vulnerability
- Steps to reproduce it
- Potential impact
- Suggested fix (if available)

## Security Features

- JWT authentication via Supabase
- Rate limiting on all API endpoints
- Input validation and SQL injection prevention
- CORS restricted to known origins
- Dependency scanning via Dependabot and CodeQL (weekly)
- Secret scanning via GitGuardian

## Disclosure Policy

Once a fix is confirmed and deployed, we will publish a GitHub Security Advisory. We request a coordinated disclosure period of 14 days before any public writeup.
