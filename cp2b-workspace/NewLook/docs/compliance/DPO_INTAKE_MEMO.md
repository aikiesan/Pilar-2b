# Memo to the UNICAMP DPO — registration of the PILAR-2b / CP2B Maps processing

**Date:** 2026-06-25 · **From:** Lucas Nakamura Cerejo (NIPE/CP2B) · **To:** UNICAMP Encarregado de Dados (DPO)

## Purpose
Request review, approval and institutional registration of the personal-data
processing carried out by the PILAR-2b / CP2B Maps platform (cp2b.unicamp.br/pilar2b).

## Summary of the processing
- **What:** an optional viability-calculator contact form collecting name, e-mail,
  optional municipality, and request metadata (IP, user-agent). **No CPF/CNPJ.**
- **Legal basis:** consent (opt-in; default off; recorded with notice version + timestamp).
- **Where:** UNICAMP-managed infrastructure. **No international transfer**; no external SaaS holds personal data.
- **Accounts:** none active (shared demonstration access) — no registration data.

## Controls already in place (engineering)
- Server-side consent gate (HTTP 403 without explicit consent) + regression test.
- Data-subject access & erasure endpoints (LGPD Art. 18).
- Data minimisation (CPF/CNPJ removed; migration 019).
- Security headers, CORS allow-list, rate limiting, input validation, TLS.
- E-mail redaction in application logs.
- Published bilingual Privacy Notice, Terms of Use, and Accessibility Statement (drafts pending your sign-off).

## What we need from the DPO
1. Review/approve the Privacy Notice, Terms and Accessibility Statement.
2. Register this processing in the UNICAMP inventory; approve the attached **ROPA**.
3. Approve the attached **RIPD/DPIA** (or advise changes).
4. Confirm: (a) retention period + automated purge; (b) the breach-notification flow to ANPD/data subjects.
5. Confirm the official DPO contact to publish in the Privacy Notice.

## Attachments
- `ROPA.md` — Record of Processing Activities
- `DPIA_RIPD.md` — Data Protection Impact Assessment
- `EMAG_WCAG_MAPPING.md` — accessibility alignment (LBI 13.146/2015 + e-MAG)
