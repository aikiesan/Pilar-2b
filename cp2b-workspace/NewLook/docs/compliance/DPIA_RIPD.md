# Relatório de Impacto à Proteção de Dados (RIPD / DPIA) — calculator lead form

> LGPD Art. 38. Draft for the UNICAMP DPO. Scope: the only processing of
> personal data on the platform — the optional viability-calculator contact form.

**Version / date:** 1.0 — 2026-06-25 · **Controller:** UNICAMP (NIPE/CP2B) · **Contact:** lucasnc@unicamp.br

## 1. Description of the processing
A visitor may voluntarily submit a contact form attached to the biogas viability
calculator. With explicit consent, the platform stores name, e-mail, optional
municipality, and request metadata (IP, user-agent, referrer). Purpose: respond
to the user and produce aggregate research statistics. No profiling, no automated
decisions with legal effects, no special-category data, **no CPF/CNPJ**.

## 2. Necessity & proportionality
- **Necessity:** the form is optional; the platform is fully usable without it.
- **Minimisation:** CPF/CNPJ removed (migration 019); only name + e-mail are
  needed to reply. Municipality is optional and low-risk.
- **Legal basis:** consent (opt-in, default off, recorded with notice version +
  timestamp). Withdrawal/erasure available.

## 3. Risk assessment

| Risk | Likelihood | Impact | Mitigation | Residual |
|---|---|---|---|---|
| Storage without consent | Low | Medium | Server-side 403 if `consent_lgpd` not true; default false | Low |
| Unauthorised access to leads | Low | Medium | UNICAMP infra; TLS; CORS; rate limiting; no public listing endpoint | Low |
| Excessive data (identifier) | — | — | CPF/CNPJ removed; data minimised | Low |
| International transfer | None | — | Data stays on UNICAMP infrastructure | None |
| PII leakage via logs | Low | Low | E-mail redaction filter on all log records | Low |
| Indefinite retention | Medium | Low | Erasure on request; **automated TTL purge to be configured** | Medium |

## 4. Data-subject rights (LGPD Art. 18)
Access and erasure implemented as API endpoints
(`GET`/`DELETE /api/v1/calculator/leads/{id}`); a user-facing self-service flow
and other rights (correction, portability) handled via lucasnc@unicamp.br.

## 5. Conclusion
Residual risk is **low**, contingent on two open items: (a) configure an
automated retention/purge TTL; (b) confirm the institutional breach-notification
procedure. Recommended for DPO approval once those are scheduled.
