#!/usr/bin/env bash
# One-time switch of cistareseni.cz to the new website (production.yml, mode go-live).
# Before this runs, the new website has been uploaded in full to $WEB_ROOT$STAGING.
# The switch only renames entries on the server, so the website is unavailable for a few seconds:
#   1. everything the previous PHP website had in the web root goes into $BACKUP/ (closed to visitors),
#   2. the new website moves from $STAGING/ into the web root.
# Nothing is deleted and nothing leaves the server. The previous assets/ folder stays where it is:
# old image and PDF addresses keep working and scripts/restore_media.py keeps reading the original
# media from there; the new assets/ entries are moved into it.
#
# Needs: lftp; FTP_HOST, FTP_USER, LFTP_PASSWORD, WEB_ROOT (ends with /), FTP_CA (from scripts/ftp_ca.sh).
set -euo pipefail
BACKUP=_puvodni-web
STAGING=_novy-web

ftp() {
  lftp --env-password -u "$FTP_USER" "$FTP_HOST" \
    -e "set ftp:ssl-force true; set ssl:ca-file $FTP_CA; set net:max-retries 2; set net:timeout 30; set cmd:fail-exit yes; $1; bye"
}
names() {  # entry names of a listing, without . and ..
  sed -e 's#/$##' -e 's#.*/##' | grep -vx -e '' -e '\.' -e '\.\.' || true
}

root=$(ftp "cls -1a '$WEB_ROOT'" | names)
if grep -qx "$BACKUP" <<<"$root"; then
  echo "Folder $BACKUP already exists: the switch was done before. Nothing to do."
  exit 0
fi
grep -qx "$STAGING" <<<"$root" || { echo "The new website is not in $STAGING/"; exit 1; }
new=$(ftp "cls -1a '$WEB_ROOT$STAGING/'" | names)
grep -qx index.html <<<"$new" || { echo "$STAGING/ has no index.html"; exit 1; }
new_assets=$(ftp "cls -1a '$WEB_ROOT$STAGING/assets/'" | names)
old_assets=$(grep -qx assets <<<"$root" && ftp "cls -1a '${WEB_ROOT}assets/'" | names || true)
clash=$(comm -12 <(sort <<<"$new_assets") <(sort <<<"$old_assets") | grep -v '^$' || true)
[ -z "$clash" ] || { echo "Same names in old and new assets/: $clash"; exit 1; }

cat > deny.htaccess <<'EOF'
# Záloha původního webu, není veřejně dostupná.
<IfModule mod_authz_core.c>
Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
Order allow,deny
Deny from all
</IfModule>
EOF

q() { printf "'%s'" "$1"; }
commands="cd '$WEB_ROOT'; mkdir $BACKUP"
while IFS= read -r name; do
  case "$name" in assets|"$STAGING"|"$BACKUP"|.well-known|cgi-bin|'') continue ;; esac
  commands+="; mv $(q "$name") $(q "$BACKUP/$name")"
done <<<"$root"
if grep -qx .htaccess <<<"$root"; then commands+="; mv $BACKUP/.htaccess $BACKUP/puvodni.htaccess"; fi
commands+="; put deny.htaccess -o $BACKUP/.htaccess"
if ! grep -qx assets <<<"$root"; then commands+="; mkdir assets"; fi
while IFS= read -r name; do
  [ "$name" = assets ] || [ -z "$name" ] && continue
  commands+="; mv $(q "$STAGING/$name") $(q "$name")"
done <<<"$new"
while IFS= read -r name; do
  [ -z "$name" ] && continue
  commands+="; mv $(q "$STAGING/assets/$name") $(q "assets/$name")"
done <<<"$new_assets"
commands+="; rmdir $STAGING/assets; rmdir $STAGING"

echo "Switching: $(wc -l <<<"$root") old entries into $BACKUP/, $(wc -l <<<"$new") new entries into the web root."
ftp "$commands"
echo "Done. The previous website is in $WEB_ROOT$BACKUP/ (closed to visitors)."
