<?php
// PastPost nightly backup. Runs on Pete's server from cron.
// Saves every table as one gzipped JSON file per night (30 nights kept) and mirrors uploaded photos.
// Needs config.php next to it:  <?php return ['secret' => 'sb_secret_...'];   (Supabase secret key, Pete pastes it)
// Run by hand:  php backup.php        Restore notes: see README in the repo (ops/).

date_default_timezone_set('America/New_York');
$DIR = __DIR__;
$cfg = @include $DIR . '/config.php';
if (!is_array($cfg) || empty($cfg['secret']) || strpos($cfg['secret'], 'PASTE') !== false) { fwrite(STDERR, "Missing secret key in config.php\n"); exit(1); }
$SB = 'https://iurancbmhdizoafdhctq.supabase.co';
$KEY = $cfg['secret'];
$KEEP_DAYS = $cfg['keep_days'] ?? 30;
$MIN_FREE_GB = $cfg['min_free_gb'] ?? 3;   // stop copying photos if the disk gets this low
$TABLES = ['profiles', 'posts', 'comments', 'reactions', 'reports', 'feedback', 'takedown_requests'];

function req($url, $key, $headers = [], $method = 'GET', $body = null) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 120, CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => array_merge(["apikey: $key", "Authorization: Bearer $key"], $headers)]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
  $out = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
  if ($out === false || $code >= 400) throw new Exception("$method $url failed ($code) $err " . substr((string)$out, 0, 200));
  return $out;
}

$stamp = date('Y-m-d');
@mkdir("$DIR/db", 0750, true); @mkdir("$DIR/photos", 0750, true);
$summary = [];
try {
  // 1. Tables, 1000 rows at a time
  $dump = ['taken_at' => date('c'), 'tables' => []];
  foreach ($TABLES as $t) {
    $rows = []; $from = 0;
    while (true) {
      $page = json_decode(req("$SB/rest/v1/$t?select=*", $KEY, ["Range-Unit: items", "Range: $from-" . ($from + 999)]), true);
      if (!is_array($page)) throw new Exception("Bad data for $t");
      $rows = array_merge($rows, $page);
      if (count($page) < 1000) break;
      $from += 1000;
    }
    $dump['tables'][$t] = $rows; $summary[] = "$t " . count($rows);
  }
  file_put_contents("$DIR/db/pastpost-$stamp.json.gz", gzencode(json_encode($dump, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 9));
  chmod("$DIR/db/pastpost-$stamp.json.gz", 0640);

  // 2. Old nightly files
  foreach (glob("$DIR/db/pastpost-*.json.gz") as $f) if (filemtime($f) < time() - $KEEP_DAYS * 86400) unlink($f);

  // 3. Photos: copy any uploaded file not copied yet (only new ones each night)
  $freeGb = disk_free_space($DIR) / 1e9; $copied = 0;
  if ($freeGb < $MIN_FREE_GB) { $summary[] = sprintf('photos skipped, only %.1f GB free', $freeGb); }
  else {
    $folders = json_decode(req("$SB/storage/v1/object/list/uploads", $KEY, ['Content-Type: application/json'], 'POST', json_encode(['prefix' => '', 'limit' => 10000])), true) ?: [];
    foreach ($folders as $fo) {
      if (!empty($fo['id'])) continue; // a file at top level (not expected)
      $user = $fo['name']; $off = 0;
      do {
        $files = json_decode(req("$SB/storage/v1/object/list/uploads", $KEY, ['Content-Type: application/json'], 'POST', json_encode(['prefix' => $user, 'limit' => 1000, 'offset' => $off])), true) ?: [];
        foreach ($files as $f) {
          if (empty($f['id'])) continue;
          $dest = "$DIR/photos/$user/" . $f['name'];
          if (file_exists($dest)) continue;
          @mkdir(dirname($dest), 0750, true);
          file_put_contents($dest, req("$SB/storage/v1/object/uploads/" . rawurlencode($user) . '/' . rawurlencode($f['name']), $KEY));
          $copied++;
        }
        $off += 1000;
      } while (count($files) === 1000);
    }
    $summary[] = "photos +$copied";
  }
  echo date('Y-m-d H:i') . ' ok: ' . implode(', ', $summary) . "\n";
} catch (Exception $e) {
  echo date('Y-m-d H:i') . ' FAILED: ' . $e->getMessage() . "\n";
  exit(1);
}
