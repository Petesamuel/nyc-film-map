# PastPost operations

## Nightly backup (on Pete's server)
- Install once in WHM Terminal as root:
  `curl -fsSL https://raw.githubusercontent.com/Petesamuel/nyc-film-map/main/ops/install-backup.sh | bash`
- Put the Supabase secret key (Project Settings > API Keys > Secret keys) into
  /home/pstudios/pastpost-backup/config.php. Never commit it.
- Runs 3:47 am every night: every table to db/pastpost-YYYY-MM-DD.json.gz (30 kept) and new uploaded photos to photos/.
  Skips photos if the disk has under 3 GB free. One line per night in backup.log.
- Logins themselves live in Supabase Auth and aren't in the dump; profiles are.
