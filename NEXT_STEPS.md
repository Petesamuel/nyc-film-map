
## Pin accuracy pipeline (run after ANY extractor rewrites a located_*.json)
1. python3 scripts/audit_pins.py --write
2. python3 scripts/fix_between.py --write
3. python3 scripts/history_check.py --write   # borough / neighborhood / old Queens numbers / old street names
4. python3 scripts/retry_oldnames.py --write   # re-places unplaced photos whose captions use old street names
5. python3 scripts/build_v2.py, python3 scripts/make_small.py (copy small.html too), then deploy
- Landmarks photos are pinned to their exact tax lot (raw/lpc/pluto.json from PLUTO by BBL). extract_lpc.py does not do this yet: rerun the PLUTO step if LPC is re-extracted.
- Old street names: data/old_names.json (curated). Source for Manhattan: oldstreets.com (raw_os/entries.json).

## Future: real historic base maps
- Pete wants actual old maps (1950s) as a map style. Best free source: NYC's 1924 and 1951 aerial photo tiles, now behind api-portal.nyc.gov (needs a free key Pete signs up for). Old maps.nyc.gov/xyz URLs return a "moved" placeholder. NYPL map warper tiles are archived (no longer served).
- The sepia "Vintage" style was removed (it was only a color filter on today's map).
- Documents vs photos: scripts/classify_docs.py (uses v2/raw/dpla_formats.json from fetch_dpla_formats*.py, LOC medium, Municipal Archives map series) -> data/doc_urls.json, run before build_v2.py
- NYC in Film: scripts/geocode.py rebuilds data/located.json (house numbers like 1407 no longer mistaken for years; short ranges like 214-16 fall back to 214; images in a scene with one placed spot and no other place named inherit it). Re-add the 4 "restored" pins (Rockefeller Center, 40-36/40-39 82nd St) from backup_located/located_presection.json if it is rerun.
- New blogs: v2/fetch_blog.py <name> <site> wp|blogger, then v2/extract_blog.py <name> "<Blog name>" (captions only, post borough as hint, tax photos skipped). Done: w2tb (Welcome2TheBronx), fny (Forgotten NY). Fetched but no captions: vny (Vanishing NY), hb (Harlem Bespoke).

## 2026-11-18
- LOC fetched by date range (v2/loc_split.sh, loc_split2.sh) into raw/loc_all.json, extracted with extract_loc_all.py.
- Vergara (image path /pnp/vrg/) is excluded in extract_loc_all.py and build_v2.py until he gives permission.
- Historic photos dated 2020+ hidden in build_v2.py. Historic districts no longer drawn as parks (template glStyle filter).
- 6sqft added (located_sixsq.json). New York Almanack skipped: no captions, mostly upstate.
- Permission drafts in Gmail: MOCA, Vergara, James and Karla Murray, Dylan Stone.
- Deploy now with scripts/deploy.sh "message" (stamps a build id into index.html/small.html and ver.txt so open pages reload to the newest version).
- Private copy: PRIV=1 python3 scripts/build_v2.py (adds v2/private/located_vrg.json, keeps 2020+), then inline d_priv into one HTML (private_out.html). Never deploy it.
- Phase 0 restructure started: /home/claude/app/web (Vite + Svelte + TypeScript; leaflet 1.9.4, maplibre-gl 4.7.1, maplibre-gl-leaflet 0.0.22 pinned to match the live map). Outreach list: permission_contacts.md.
- Private sources: v2/private/located_vrg.json (Vergara), v2/private/located_stone.json (Dylan Stone via NYPL API, token in /home/claude/.secrets/keys.env, extract_stone.py). Flickr API keys need a paid Pro account; Store Front album has no addresses.
- 2026-11-19: relax.py (two named streets -> that corner) for dpla/loc/stone; located_relax_*.json. extract_nara.py (NARA key in .secrets, raw/nara). extract_murray.py (Store Front, addresses typed from lookups, private).
- Image check: cls/classify.py (open_clip ViT-B-32, CPU) over cls/all.json -> cls/all.jsonl, resumable: `cd cls && nohup python3 -I classify.py all.json all.jsonl > all.log 2>&1 &`. Then scripts/make_kinds.py -> data/img_kind.json, rebuild. LPC items are last in the list.
- Memory: geocode import needs ~4.5 GB; stop classify.py before running any extractor or pipeline script (OOM otherwise).
- Rights check (raw/dpla_rights.json via fetch_dpla_rights.py): NYPL 7,787 InC + 1,687 undetermined + 6,761 no record; Queens Library 3,425 InC; Brooklyn Historical 2,202 RESTRICTED; N-YHS 525 other. Nothing removed yet (Pete's call). Vendor libs/fonts now self-hosted in /vendor (deploy.sh copies).

## Stripe (support payments) — ready, waiting on Pete's signup
- Pages built: /support/ and /support/thanks/ (hidden until SUPPORT_URL is set in pages/build_pages.py).
- When SUPPORT_URL is set: Support link appears in the page nav, About gets a Support section, Privacy gets a Stripe section. Still to add: a "Support the map" item in the map menu (template_v2.html drawer).
- Pete's Stripe steps: sign up as individual/sole proprietor, product "Support the NYC Then and Now map", Payment Link type "Customers choose what to pay", suggested $10, min $1, after payment redirect to https://<site>/support/thanks/. Statement descriptor e.g. NYCTHENNOW.
- Wording: "Support"/"chip in", not "donate" (not a charity, not tax deductible).
- App stores: check Apple/Google rules on outside payment links for tips before Phase 3; likely hide Support in the iOS app or use in-app purchase.

## Supabase (live since Nov 21)
- Org "NYC Then and Now" (separate from Serger), project nyc-then-now, ref iurancbmhdizoafdhctq, URL https://iurancbmhdizoafdhctq.supabase.co
- Publishable key (public by design): sb_publishable_bdXBpE0UULjIjYDNrHg83g_DsW0WUsb. Secret key: never copy into repo.
- 0001_community.sql applied: profiles, posts, comments, reactions, reports, feedback, takedown_requests, all RLS on.
- Feedback + removal forms now insert into feedback / takedown_requests (fallback: mailto). Read them in Supabase Table Editor until the admin dashboard exists.
- One test row in feedback ("Setup test from Claude"), safe to delete.
- Next: Auth providers (email magic link + Google), R2 bucket + upload Function, sign in UI, upload flow, Community tab, admin dashboard.

## Phone apps (started Nov 22)
- Capacitor project in repo at app/mobile (local working copy /home/claude/mobile, Android SDK at /home/claude/android-sdk).
- Debug APK builds: mobile/android/app/build/outputs/apk/debug/app-debug.apk
- App id com.petesamuel.nycthenandnow, deep link com.petesamuel.nycthenandnow://auth (Android intent filter + iOS URL type done).
- Pending (needs Pete or his PC): add com.petesamuel.nycthenandnow://auth to Supabase Redirect URLs; run 0005_reaction_meta.sql;
  Apple Developer account ($99/yr) + Mac/Xcode for iOS build; Sign in with Apple (required on iOS when Google is offered);
  Google Play Console ($25 one time) for Android; real app icon if Pete wants his own design.
- Run 0006_delete_account.sql (delete_my_account + admin_stats). Until then Delete account files a request in feedback, and admin stats are hidden.
- Before turning on Stripe: build-www.mjs must strip support links from about/ pages for the iOS build (community.js already hides them in-app on iOS).

## Nov 26
- Stripe sandbox tip link made: https://buy.stripe.com/test_4gMbJ22P0cZkaEO6nK87K00 ($10 suggested, $1 to $500, returns to /support/thanks/).
- Site code ready: paste the live link into SUPPORT_LIVE in pages/build_pages.py and deploy; Support page, About line, privacy note and a "Support PastPost" map menu item all turn on (hidden in the iOS app).
- Waiting on Pete: Stripe verification, buying pastpostnyc.com ($11.17/yr, still free), WHM login for the backup install, Apple and Google accounts.

## Later: replace personal address on the DMCA registration
- Pete is registering the DMCA designated agent (dmca.copyright.gov, $6, renew every 3 years) with his personal mailing address for now.
- Later: get a virtual mailbox or business street address, then (1) amend the designation at dmca.copyright.gov ($6) and (2) update DMCA_ADDRESS in pages/build_pages.py and redeploy.
- Waiting on Pete to send the agent mailing address so it can go into DMCA_ADDRESS on the Terms page (required on the site).

## Later: copyright review practice and lawyer check
- Before launch: one-time call with a media lawyer. Ask about (1) DMCA safe harbor when every upload is pre-approved (Mavrix v. LiveJournal, 2017), and (2) showing archive images hosted elsewhere, given New York courts' stricter view.
- Moderation rule for Pete: approve or reject on the rules only (NYC location, appropriate content, nothing obviously copied). Don't pick photos for taste or fit, and don't edit photos or captions beyond fixing the pin.
- Reject anything with a watermark, Getty/agency/newspaper credit, or a famous recognizable image, using the reason "Copyright: not theirs to share" (counts as a strike).
- Act fast on removal requests; formal DMCA notices are flagged in the admin inbox.
- Optional: add a short "How to review" note inside the admin panel so the rule is right where approvals happen.
