# Auth deployment runbook — UNICAMP VM

> How to deploy the new VM-local internal authentication (replaces the mock).
> All auth data stays in PostgreSQL on the VM, behind the proxy. Run these on the
> VM after pulling the branch. LGPD record: `docs/compliance/INTERNAL_AUTH_LGPD.md`.

## 0. Prerequisites
- The VM PostgreSQL is reachable via `DATABASE_URL` (the app's existing DB).
- Backend venv active; you can run `psql` against the DB.

## 1. Install the new dependency
PyJWT was added for local HS256 tokens.
```bash
cd cp2b-workspace/NewLook/backend
pip install -r requirements.txt          # pulls PyJWT==2.10.1 (passlib[bcrypt] already present)
```

## 2. Set a strong SECRET_KEY (critical)
Tokens are signed with `SECRET_KEY` (HS256). Production refuses the placeholder.
```bash
export SECRET_KEY="$(openssl rand -hex 32)"   # ≥32 chars; persist in the service env / .env
```

## 3. Apply the migration
Creates `auth_users`, `auth_token_denylist`, `auth_access_log`, and repoints any
Supabase `auth.users` FKs (guarded — no-op if absent).
```bash
psql "$DATABASE_URL" -f app/migrations/020_create_auth_users.sql
```

## 4. Seed the first admin
Registration is invite-only, so bootstrap one admin:
```bash
ADMIN_EMAIL="admin@cp2b.unicamp.br" \
ADMIN_PASSWORD='<a-strong-password>' \
ADMIN_NAME='CP2B Admin' \
python -m scripts.seed_admin
```

## 5. Restart and smoke-test
```bash
# (restart the backend service / pm2 / uvicorn as usual)
# Login → expect a real JWT:
curl -s -X POST "$API/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@cp2b.unicamp.br","password":"<password>"}'
# Use the returned access_token:
curl -s "$API/api/v1/auth/me" -H "Authorization: Bearer <token>"      # 200 + profile
curl -s "$API/api/v1/auth/me" -H "Authorization: Bearer tampered"     # 401
curl -s -X POST "$API/api/v1/auth/logout" -H "Authorization: Bearer <token>"  # revokes; reuse → 401
```
Expected: valid token → profile; tampered/expired → 401; after logout the token is
revoked (denylist); 5 failed logins lock the account for 15 min.

## 6. Gate the protected surface
Apply the dependencies to in-development / confidential endpoints:
```python
from fastapi import Depends
from app.middleware.auth import require_internal, require_clearance

@router.get("/experimental-tool", dependencies=[Depends(require_internal)])
...
@router.get("/confidential-data", dependencies=[Depends(require_clearance(2))])
...
```
Roles: `visitante < autenticado < interno < admin`. Clearance: 0 public · 1 internal · 2 confidential.

## 7. Frontend
- Rebuild the frontend (`npm run build`); ensure `NEXT_PUBLIC_API_URL` points at the API.
- The login flow now stores a real JWT (`localStorage` key `pilar2b-auth-token`,
  attached by `getAuthHeaders` in `src/lib/apiClient.ts`).
- **Note:** the public `register` page now calls the admin-only create-user endpoint
  (invite-only) — repurpose it into an admin "create user" screen or hide it.

## 8. Manage users (admin)
```
POST   /api/v1/auth/users                 # create internal account (role + clearance)
GET    /api/v1/auth/users                 # list
PATCH  /api/v1/auth/users/{id}/active     # activate / deactivate (LGPD soft delete)
DELETE /api/v1/auth/users/{id}            # erasure (LGPD)
```

## 9. Tests (run in CI / on the VM)
The travel sandbox couldn't run them (broken `cryptography` native binding on
`import jwt`). On the VM/CI:
```bash
pytest tests/unit/services/test_auth_service.py \
       tests/unit/middleware/test_auth_dependencies.py \
       tests/integration/endpoints/test_auth_endpoint.py
```

## Rollback
The change is additive (new tables; service swapped). To roll back, redeploy the
previous backend image; the new tables can remain (unused) or be dropped:
`DROP TABLE auth_access_log, auth_token_denylist, auth_users CASCADE;` (only if no
FKs were repointed to them in step 3).
