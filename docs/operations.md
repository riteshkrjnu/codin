# CoDIN operations

## Database ownership and initial copy

Final convention: production `codin`, development `test`. Set `MONGODB_DB_NAME` explicitly; the URI may omit its database path. The explicit name overrides the URI path. Credentials must have appropriate database privileges, and Atlas Network Access must allow the host's egress IP. Restrict production and development users to their respective databases after the initial copy.

The initial copy was completed on 19 October 2026. A protected archive and `backups/copy-verification.json` record the result. At verification, 18 collections matched: 6 courses, 11 top-level modules, 20 materials, 9 events and 40 registrations, including all users and indexes. Full BSON-aware document digests were compared, preserving IDs and references. Production accounts were preserved. No documents in `test` were changed by the copy.

For a new installation only:

```bash
node scripts/database.mjs copy --verify-stable-source
```

This reads `test`, backs it up, refuses an existing `codin`, restores using namespace mapping, and compares source-before, source-after and restored contents. It aborts on detected writes or mismatches. Schedule a quiet write window for a reliable cutover; verification is point-in-time and cannot cover writes made after the copy. Do not treat this initial copy as ongoing synchronisation.

Backups contain personal data. Directories are mode 700; archives/config files are mode 600. URI values are passed to MongoDB Tools using a short-lived protected configuration file, never command arguments. Tool stderr is withheld because it can contain credentials. Never upload archives to a public issue or commit them.

## Production cutover

1. Rotate the credential exposed in the original source. Configure separate Atlas users if possible. Store values only in environment files.
2. Stop writes on the old live deployment. If `test` has changed since the recorded verification, reconcile those changes into `codin` before switching; the copy command deliberately refuses to overwrite `codin`.
3. Back up `codin`. Restore that backup into a separate verification database and inspect counts and representative materials.
4. On the Ubuntu 20.04 server, install curl, ca-certificates, xz-utils, nginx and MongoDB Database Tools. No change to the existing MongoDB 3.6 service is required.
5. Create `/etc/codin.env` from `deploy/production.env.example`, mode 600, using `NODE_ENV=production` and `MONGODB_DB_NAME=codin`. Configure the real `APP_URL`. Leave outbound disabled during checks.
6. From the reviewed checkout, run `sudo ./scripts/install-production.sh`. It creates an isolated service account and timestamped release, builds, backs up production and switches the service. Readiness failure rolls code back when a previous release exists.
7. Rehearse the status migration on a local restore before applying to production. Run `npm run db:status` for a report. Only unambiguous records missing the new fields are changed with `--apply`; production additionally requires `--allow-production`. Back up immediately before application. Ambiguous records require manual review.
8. Review `deploy/nginx.conf.example` for the actual hostname and TLS certificate, validate with `nginx -t`, then reload nginx. The application binds to loopback; nginx terminates HTTPS.
9. Confirm home, sign-in, event/course editing, material access and `/health/ready`. Existing users sign in again because database-ID tokens are no longer accepted.
10. Enable outbound only after validating SMTP, OAuth callbacks and uploads. Reopen writes. Do not make development changes in `test` before this cutover.

The script does not edit nginx configuration, provision certificates, rotate Atlas credentials or run data migrations automatically. Existing server services remain untouched. Test the scripts on the target server before production use; this workspace does not have access to it.

## Development account isolation and refresh

After production has switched to `codin`:

```bash
node scripts/database.mjs isolate-development --production-cutover-complete
node scripts/database.mjs admin developer@example.org
```

Isolation first backs up `test`, invalidates copied passwords using random hashes, demotes copied roles, clears reset tokens, OTPs and sessions, and preserves course/registration references. The admin command creates/updates the specified development account and prints a new one-time password. Store it securely. The original accounts in `codin` are unaffected.

To refresh development later:

```bash
node scripts/database.mjs refresh --replace-test --production-cutover-complete
```

This backs up `test`, exports `codin`, verifies source stability, replaces `test`, verifies restored documents/indexes and isolates development accounts. If restore fails after replacement, recover from the printed prior `test` backup. Use a quiet write window. Neither command should be run while the old deployment still serves from `test`.

## Backups and recovery

```bash
node scripts/database.mjs backup                         # configured development DB
node scripts/database.mjs backup --production            # when configured for codin
node scripts/database.mjs restore ARCHIVE SOURCE_DB NEW_TARGET_DB
node scripts/database.mjs verify
```

Restore always requires an empty, distinct target and refuses `codin`. Restore into a new recovery database first; inspect documents and references before a separately reviewed production recovery. The revision-recovery UI at `/admin/editorial` is preferred for individual activity mistakes and preserves the version being replaced.

`codin-backup.timer` runs daily at 02:00 IST (20:30 UTC). Archives are stored in `/var/backups/codin`. Monitor timer failures, available disk space and Atlas backup settings. Copy backups to a separately controlled private destination and periodically rehearse restores; a local disk copy alone does not protect against server loss. No backup retention deletion is enabled automatically.

Application output goes to journald. Configure the host's journal retention limits. `deploy/logrotate.conf` rotates this application's nginx logs; review before installing. Inspect service failures with `journalctl -u codin` and backup failures with `journalctl -u codin-backup`.

## Rollback and migration safety

`sudo ./scripts/rollback.sh` switches to the recorded previous code release. It does not undo data changes. Status migrations add fields without removing legacy status values; take a backup and preserve the dry-run report. Never restore an old database directly over production as part of automatic code rollback.

The existing `MONGODB_URI` is not printed by setup/check commands. Missing optional integration configuration should leave the core site usable. SMTP delivery errors should be monitored before enabling signup/reset for public users.

## API changes

- Existing course/event URLs remain. Metadata PUT/PATCH and recoverable DELETE require numeric `__v` or `If-Match`.
- `POST /api/{courses|events}/:id/lms`: `{ __v, operations }`. Types: `module.add`, `module.update`, `module.remove`, `material.add`, `material.update`, `material.remove`. IDs identify targets. Removing a reference never deletes an external file.
- `GET /api/{courses|events}/:id/revisions` lists audit metadata. `POST .../:id/restore/:revisionId` with `{ __v }` restores through an atomic transaction; administrators only.
- `GET /api/activity-feed` merges and deduplicates activities/notices. Linked notices inherit lifecycle; drafts, hidden, future and expired notices are omitted.
- `GET /api/admin/editorial` lists missing dates, expired notices and completion reports needed.
- `GET /api/lms/session` returns current identity. `POST /api/lms/logout` revokes the bearer session. Tokens are random, stored as SHA-256 hashes, expire after 12 hours and must never be treated as user IDs.
- Publication, lifecycle and registration availability are independent. Structured date-only boundaries use Asia/Kolkata. Completion follows the end date; archiving is explicit. Legacy records without dates retain a manual lifecycle; publishing alone does not imply ongoing activity.

## Sites

The current app retains Node/Express and Atlas. No Sites project was created or published. The three visual concepts are portable static assets; a later Sites migration would need separate runtime, storage and identity work.
