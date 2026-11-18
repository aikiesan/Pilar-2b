# Internal authentication — LGPD record & notice

> Companion to `ROPA.md` / `DPIA_RIPD.md`. Covers the **internal staff accounts**
> introduced for gating in-development tools and confidential data. All auth data
> is stored **locally on the UNICAMP VM** (PostgreSQL, behind the proxy) — nothing
> is sent to external services. Draft for review by the UNICAMP DPO.

**Version:** 1.0 — 2026-06-25 · **Controller:** UNICAMP (NIPE/CP2B) · **Contact:** lucasnc@unicamp.br

## 1. Processing activity — internal accounts (ROPA entry)

| Attribute | Detail |
|---|---|
| **Purpose** | Authenticate internal staff/collaborators and authorise access to in-development tools and confidential data tiers. |
| **Legal basis** | Legitimate interest / execution of the working relationship (LGPD Art. 7, V/IX) — not consent. |
| **Data subjects** | Internal CP2B/NIPE staff and named collaborators (invite-only; admin-created). |
| **Personal data (minimised)** | Name, e-mail, bcrypt password hash, role, clearance level, activity timestamps (last login, created/updated), failed-login counters. **No other PII.** |
| **Recipients / sharing** | None. |
| **International transfer** | None — data stays on UNICAMP-managed infrastructure (not Supabase/Vercel/Railway). |
| **Retention** | Accounts deactivated on offboarding; purged after the institutional retention period. |
| **Storage** | PostgreSQL tables `auth_users`, `auth_token_denylist`, `auth_access_log` on the VM. |

## 2. Security of processing (Art. 46)
- Passwords hashed with **bcrypt** (passlib); never stored or logged in clear text.
- Access tokens are **HS256 JWTs signed locally** with `SECRET_KEY` (PyJWT), short-lived,
  and revocable via the `auth_token_denylist` (real logout).
- **Account lockout** after repeated failed logins; per-IP **rate limiting** on auth routes.
- Served only over TLS, **behind the UNICAMP proxy**.
- Application logs are **PII-redacted** (e-mail redaction filter).
- **Accountability**: access to confidential resources is recorded in `auth_access_log`
  (who, what, when) — supports LGPD Art. 37/46.

## 3. Data-subject rights (Art. 18)
- **Access**: `GET /api/v1/auth/me` returns the account's own data.
- **Erasure**: admin `DELETE /api/v1/auth/users/{id}` (hard delete); deactivate (soft) via
  `PATCH /api/v1/auth/users/{id}/active`.
- **Correction**: `PUT /api/v1/auth/me` (name); admin re-provisioning for role/clearance.

## 4. Access model
- Roles: `visitante < autenticado < interno < admin`.
- Clearance tiers (gated independently of role): **0 public · 1 internal · 2 confidential**.
- In-development tools require `require_internal`; the most confidential data requires
  `require_clearance(2)`.

## 5. Internal access notice (to show staff at first login)
> "This platform area is restricted to authorised CP2B/NIPE staff and collaborators.
> UNICAMP (controller) processes your name, institutional e-mail and access activity to
> authenticate you and to secure confidential research data, on the basis of the working
> relationship (LGPD). Access to confidential resources is logged for security and
> accountability. Data is stored on UNICAMP infrastructure and is not shared externally.
> Contact lucasnc@unicamp.br or the UNICAMP DPO for any data-protection request."

## 6. Open items for the DPO
- Confirm the retention period and configure the automated purge of deactivated accounts.
- Register this processing alongside the public-platform ROPA entry.
- Confirm the wording of the internal access notice.
