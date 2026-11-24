#!/usr/bin/env bash
# One-time step when switching cistareseni.cz to the new website (production.yml, mode go-live).
# Moves everything the previous PHP website had in the web root into _puvodni-web/ on the same server
# and closes that folder to visitors. Nothing is deleted and nothing leaves the server.
# The previous assets/ folder stays in place: old image and PDF addresses keep working and
# scripts/restore_media.py keeps reading the original media from there.
#
# Needs: lftp; FTP_HOST, FTP_USER, LFTP_PASSWORD, WEB_ROOT (ends with /), FTP_VERIFY (yes|no).
set -euo pipefail
BACKUP=_puvodni-web
KEEP=". .. assets $BACKUP .well-known cgi-bin"

ftp() {
  lftp --env-password -u "$FTP_USER" "$FTP_HOST" -e "set ftp:ssl-force true; set ssl:verify-certificate ${FTP_VERIFY:-yes}; set net:max-retries 2; set net:timeout 30; $1; bye"
}

listing=$(ftp "cls -1a '$WEB_ROOT'")
if grep -qx "$BACKUP/\?" <<<"$listing"; then
  echo "Folder $BACKUP already exists: the previous website was moved before. Nothing to do."
  exit 0
fi

commands="cd '$WEB_ROOT'; mkdir $BACKUP"
moved=0
while IFS= read -r entry; do
  name=${entry%/}
  name=${name##*/}
  [ -z "$name" ] && continue
  case " $KEEP " in *" $name "*) continue ;; esac
  commands+="; mv '$name' '$BACKUP/$name'"
  moved=$((moved + 1))
done <<<"$listing"
echo "Moving $moved entries into $BACKUP/"

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
listing_backup="$commands; cls -1a $BACKUP"
if ftp "$listing_backup" | grep -qx '.htaccess'; then
  ftp "cd '$WEB_ROOT'; mv $BACKUP/.htaccess $BACKUP/puvodni.htaccess; put deny.htaccess -o $BACKUP/.htaccess"
else
  ftp "cd '$WEB_ROOT'; put deny.htaccess -o $BACKUP/.htaccess"
fi
echo "Previous website moved to $WEB_ROOT$BACKUP/ (closed to visitors)."
