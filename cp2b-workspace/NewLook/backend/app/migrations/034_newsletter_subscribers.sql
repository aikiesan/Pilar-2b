-- 034_newsletter_subscribers.sql
--
-- Newsletter sign-ups from the site footer, the About page and the cookie
-- banner, kept in the platform's database on the UNICAMP VM. Until now those
-- three forms only pretended to submit.
--
-- One row per e-mail address. What is stored is what the newsletter needs and
-- what demonstrates the consent (LGPD art. 8 §1-2): the address, the language
-- to write in, the form it came from, the version of the privacy notice in
-- force and when the visitor subscribed. No IP address, no browser details.
--
-- Unsubscribing keeps the row with unsubscribed_at set, so a later sign-up is
-- a new, dated consent. A request to erase the data (LGPD art. 18) deletes the
-- row. unsubscribe_token is what an unsubscribe link in a newsletter e-mail
-- carries.
--
-- Safe to re-run: CREATE ... IF NOT EXISTS.
--
-- Check:
--   SELECT count(*) FILTER (WHERE unsubscribed_at IS NULL)     AS active,
--          count(*) FILTER (WHERE unsubscribed_at IS NOT NULL) AS unsubscribed
--   FROM newsletter_subscribers;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id                   BIGSERIAL PRIMARY KEY,
    email                CITEXT NOT NULL UNIQUE,
    locale               TEXT NOT NULL CHECK (locale IN ('pt-BR', 'en')),
    source               TEXT NOT NULL CHECK (source IN ('footer', 'about', 'cookie_banner')),
    consent_text_version TEXT NOT NULL,
    consented_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsubscribe_token    UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    unsubscribed_at      TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active
    ON newsletter_subscribers (consented_at DESC)
    WHERE unsubscribed_at IS NULL;

COMMENT ON TABLE newsletter_subscribers IS
    'Newsletter sign-ups. LGPD legal basis: consent (art. 7 I), recorded with the privacy notice version and time. Data-minimised: no IP, no browser.';
COMMENT ON COLUMN newsletter_subscribers.source IS
    'The form the address came from: footer, about (About page) or cookie_banner.';
COMMENT ON COLUMN newsletter_subscribers.unsubscribe_token IS
    'Secret carried by the unsubscribe link of each newsletter e-mail.';
