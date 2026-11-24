#!/usr/bin/env bash
# The FTP server sends only its own certificate, without the issuing (intermediate) certificates.
# This fetches the missing intermediates from the addresses written in the certificate (AIA),
# verifies the full chain and the host name against the system's trusted roots and writes:
#   $2                    system roots + intermediates (for lftp: ssl:ca-file)
#   $2 without .pem + -intermediates.pem   intermediates only (for Node: NODE_EXTRA_CA_CERTS)
# Certificate checking stays on: the chain must end in a root the system already trusts.
set -euo pipefail
host=$1
out=$2
roots=/etc/ssl/certs/ca-certificates.crt
work=$(mktemp -d)

echo | timeout 30 openssl s_client -starttls ftp -connect "$host:21" -servername "$host" 2>/dev/null \
  | openssl x509 > "$work/leaf.pem"
: > "$work/chain.pem"
current="$work/leaf.pem"
for step in 1 2 3; do
  if openssl verify -CAfile "$roots" -untrusted "$work/chain.pem" "$work/leaf.pem" >/dev/null 2>&1; then break; fi
  url=$(openssl x509 -in "$current" -noout -ext authorityInfoAccess 2>/dev/null | grep -o 'http://[^ ]*' | head -1 || true)
  [ -n "$url" ] || break
  curl -fsS --max-time 20 "$url" -o "$work/issuer.der"
  openssl x509 -inform DER -in "$work/issuer.der" -out "$work/issuer$step.pem" 2>/dev/null \
    || openssl x509 -in "$work/issuer.der" -out "$work/issuer$step.pem"
  cat "$work/issuer$step.pem" >> "$work/chain.pem"
  current="$work/issuer$step.pem"
done
openssl verify -verify_hostname "$host" -CAfile "$roots" -untrusted "$work/chain.pem" "$work/leaf.pem"
cat "$roots" "$work/chain.pem" > "$out"
cp "$work/chain.pem" "${out%.pem}-intermediates.pem"
