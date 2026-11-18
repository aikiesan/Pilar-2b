#!/usr/bin/env bash
# Kept so the old command still works; the deploy is frontend/deploy.sh.
exec bash "$(dirname "$0")/deploy.sh" "$@"
