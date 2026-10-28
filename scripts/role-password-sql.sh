#!/usr/bin/env bash
# Writes supabase/.temp/role-passwords.sql: ALTER ROLE statements that enable login for
# trackr_ingest and trackr_backup using the passwords saved in your Keychain by
# setup-github-secrets.sh. Only SCRAM-SHA-256 verifiers (one-way hashes) go in the file,
# never the passwords. supabase/.temp is gitignored.
set -euo pipefail

cd "$(dirname "$0")/.."
out="supabase/.temp/role-passwords.sql"
mkdir -p "$(dirname "$out")"

INGEST_PW="$(security find-generic-password -s trackr-ingest-db-password -a trackr -w)" \
BACKUP_PW="$(security find-generic-password -s trackr-backup-db-password -a trackr -w)" \
python3 - "$out" <<'PY'
import base64, hashlib, hmac, os, sys

def scram(password: str) -> str:
    salt = os.urandom(16)
    salted = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 4096)
    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
    server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
    stored_key = hashlib.sha256(client_key).digest()
    b64 = lambda b: base64.b64encode(b).decode()
    return f"SCRAM-SHA-256$4096:{b64(salt)}${b64(stored_key)}:{b64(server_key)}"

with open(sys.argv[1], "w") as f:
    f.write(f"alter role trackr_ingest login password '{scram(os.environ['INGEST_PW'])}';\n")
    f.write(f"alter role trackr_backup login password '{scram(os.environ['BACKUP_PW'])}';\n")
PY
chmod 600 "$out"
echo "Wrote $out (hashes only)."
