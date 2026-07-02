# Registro das Operações de Tratamento (ROPA) — PILAR-2b / CP2B Maps

> **Record of Processing Activities** under LGPD Art. 37. Draft prepared for the
> UNICAMP DPO. Reflects the platform state at the date below: no authentication
> is active, and personal data stays on UNICAMP-managed infrastructure.

| Field | Value |
|---|---|
| **Version / date** | 1.0 — 2026-06-25 |
| **Controller (Controlador)** | UNICAMP — NIPE / CP2B |
| **Operator (Operador)** | UNICAMP IT infrastructure (institutional hosting) |
| **DPO (Encarregado)** | UNICAMP Data Protection Officer · platform contact: lucasnc@unicamp.br |

## Processing activity 1 — Viability-calculator lead form

| Attribute | Detail |
|---|---|
| **Purpose (finalidade)** | Respond to a user’s interest in the biogas viability tool; enable contact; aggregate research statistics. |
| **Legal basis (base legal)** | Consent — LGPD Art. 7, I (explicit opt-in, recorded with notice version + timestamp). |
| **Data subjects (titulares)** | Visitors who voluntarily submit the calculator contact form. |
| **Personal data categories** | Name, e-mail, optional municipality. Technical metadata: IP address, user-agent, referrer. **No CPF/CNPJ** (removed — migration 019). No special-category data. |
| **Recipients (compartilhamento)** | None. Not shared with third parties; not used for third-party marketing. |
| **International transfer** | None. Data processed on UNICAMP-managed infrastructure (not Supabase/Vercel/Railway). |
| **Retention (retenção)** | Kept only as long as necessary; erased on request. Automated TTL purge to be defined (open item). |
| **Security measures** | TLS in transit; consent gate (server-side 403 without consent); CORS allow-list; rate limiting; input validation; security headers; PII (e-mail) redaction in logs. |
| **Data-subject rights** | Access and erasure via API (`GET`/`DELETE /api/v1/calculator/leads/{id}`); other rights via lucasnc@unicamp.br. |
| **Storage** | PostgreSQL table `calculator_leads` (consent_lgpd, consent_text_version, consented_at). |

## Processing activity 2 — Essential cookies / standard server logs

| Attribute | Detail |
|---|---|
| **Purpose** | Operation and security of the service. |
| **Legal basis** | Legitimate interest / regular exercise of rights (essential cookies); consent for any non-essential cookie. |
| **Personal data** | Cookie identifiers; standard request logs (IP, user-agent) with e-mail redaction. |
| **Retention** | Operational log-retention period (to be confirmed with UNICAMP IT). |

## Not applicable
- **Accounts / authentication:** no account system is active; access is via a shared demonstration profile. No registration personal data is processed.

## Open items for the DPO
- Confirm retention periods and configure automated purge.
- Confirm the institutional incident-response / breach-notification flow (ANPD).
- Approve this ROPA and register the processing in UNICAMP’s inventory.
