#!/usr/bin/env bash
# One-time setup of the GitHub Actions secrets for ingestion and backups.
#
# Generates passwords for the restricted trackr_ingest / trackr_backup database roles and
# the backup encryption passphrase, saves each to your macOS Keychain (service names
# below, account "trackr"), and stores the connection strings as repository secrets.
# Nothing is printed. Re-running rotates everything; the database role passwords are
# then applied from the Keychain by scripts/apply-db-role-passwords.sh.
#
# Retrieve a value later with: security find-generic-password -s <service> -a trackr -w
set -euo pipefail

REPO="${REPO:-Divyesh-Challa/Trackr}"
REF="ftsqodvfojpkjaxzqmgc"
HOST="aws-0-us-east-1.pooler.supabase.com"

store() { security add-generic-password -U -s "$1" -a trackr -w "$2" >/dev/null; }

ingest_pw="$(openssl rand -hex 24)"
backup_pw="$(openssl rand -hex 24)"
passphrase="$(openssl rand -base64 33 | tr -d '\n')"

store trackr-ingest-db-password "$ingest_pw"
store trackr-backup-db-password "$backup_pw"
store trackr-backup-passphrase "$passphrase"

printf '%s' "postgresql://trackr_ingest.${REF}:${ingest_pw}@${HOST}:5432/postgres?sslmode=require" \
  | gh secret set INGEST_DATABASE_URL -R "$REPO"
printf '%s' "postgresql://trackr_backup.${REF}:${backup_pw}@${HOST}:5432/postgres?sslmode=require" \
  | gh secret set BACKUP_DATABASE_URL -R "$REPO"
printf '%s' "$passphrase" | gh secret set BACKUP_PASSPHRASE -R "$REPO"

echo "Done. Secrets set on $REPO:"
gh secret list -R "$REPO"
echo "Passwords saved in Keychain: trackr-ingest-db-password, trackr-backup-db-password, trackr-backup-passphrase"
