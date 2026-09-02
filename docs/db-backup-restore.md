# Database Backups & Restore

The production stack runs a `db-backup` container alongside Postgres. It
dumps the database in Postgres **custom format** (`pg_dump -Fc`) directly
after every deploy, then once every 24 hours, and keeps the newest **14**
dumps in `~/gymholic/backups/` on the VPS.

> A backup on the same disk as the database is **not** a backup. Copy the
> dumps off the VPS on a schedule (rsync to your machine, or an object
> store such as Backblaze B2 / S3):
>
> ```bash
> rsync -avz <user>@gymholic.ae:~/gymholic/backups/ ~/backups/gymholic/
> ```

## Verify backups are happening

```bash
ssh <user>@gymholic.ae
docker logs --tail 20 gymholic-backup
ls -lh ~/gymholic/backups/
```

You should see a new `gymholic-YYYYMMDD-HHMMSS.dump` per day (plus one per
deploy) and `[backup] done` lines in the log.

## Restore into the running production database

> This **overwrites** the live database. Do it only for real recovery, and
> take a fresh dump first (`docker exec gymholic-backup pg_dump -Fc -f
> /backups/pre-restore.dump` — wait ~70s for the backup loop, or dump
> straight from the postgres container).

```bash
ssh <user>@gymholic.ae
cd ~/gymholic
docker compose -f docker-compose.prod.yml -f docker-compose.prod.hostinger.yml stop backend

# restore the dump you want (inside the postgres container)
docker exec -i gymholic-postgres pg_restore \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  < backups/gymholic-YYYYMMDD-HHMMSS.dump

docker compose -f docker-compose.prod.yml -f docker-compose.prod.hostinger.yml start backend
```

`$POSTGRES_USER` / `$POSTGRES_DB` come from `~/gymholic/.env` — export them
first (`set -a; source .env; set +a`) or substitute the values manually.

`--clean --if-exists` drops and recreates each object, so the restore lands
on a clean schema. Flyway does **not** need to re-run: the dump contains the
migrated schema and the `flyway_schema_history` table.

## Restore into a local database (for inspection)

```bash
createdb gymholic_inspect
pg_restore -U postgres -d gymholic_inspect --no-owner backups/gymholic-....dump
```

## Tuning

- **Retention:** set `BACKUP_KEEP` in the `db-backup` service (default 14).
- **Cadence:** change the `sleep 86400` in the entrypoint (86400 = 24h).
- The dumps contain customer data (emails, hashed passwords, encrypted
  payment tokens) — treat them as secrets and never commit or share them.
