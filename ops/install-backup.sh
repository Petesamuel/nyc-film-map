#!/bin/bash
# Installs the PastPost nightly backup on Pete's server. Run once in WHM Terminal (as root).
set -e
D=/home/pstudios/pastpost-backup
mkdir -p "$D"
curl -fsSL https://raw.githubusercontent.com/Petesamuel/nyc-film-map/main/ops/pastpost-backup.php -o "$D/backup.php"
[ -f "$D/config.php" ] || echo "<?php return ['secret' => 'PASTE_THE_SUPABASE_SECRET_KEY_HERE'];" > "$D/config.php"
chown -R pstudios:pstudios "$D"; chmod 700 "$D"; chmod 600 "$D/config.php"
PHP=$(command -v php || echo /usr/local/bin/php)
echo "47 3 * * * pstudios $PHP $D/backup.php >> $D/backup.log 2>&1" > /etc/cron.d/pastpost-backup
chmod 644 /etc/cron.d/pastpost-backup
echo "Installed. Next: paste the Supabase secret key into $D/config.php, then test with:"
echo "  sudo -u pstudios $PHP $D/backup.php"
