# infra/CLAUDE.md

Infrastructure guidance. See [/CLAUDE.md](../CLAUDE.md) for project overview.

Covers production deployment on Fly.io — both Fly apps (`fractapay-server`, `fractapay-mariadb`) live in the same org, region `gru`.

## Apps

- **`fractapay-server`** — Node/Fastify app. Root `fly.toml`, root `Dockerfile`. Connects to the DB at `fractapay-mariadb.internal:3306` over Fly's private 6PN network.
- **`fractapay-mariadb`** — `mariadb:11`. Config in `infra/mariadb/` (`Dockerfile`, `fly.toml`, `my.cnf`). No `[http_service]` — private only. A `mariadb_data` volume mounts `/var/lib/mysql`. `my.cnf` sets `bind-address = ::` so the daemon accepts the IPv6 connections that arrive over 6PN.

**Production image extras (server).** `Dockerfile` runtime stage installs `openssl` (`apk add --no-cache openssl`) for Prisma's query engine on Alpine, and `COPY`s `server/prisma/` into the image so the schema and migrations ship with the build. `prisma` lives in `dependencies` (not devDeps) so `npm prune --omit=dev` doesn't drop the CLI.

**Migrations.** Root `fly.toml` defines `[deploy] release_command = 'npx prisma migrate deploy'`. Fly runs the release command in a one-off machine built from the same image, **before** rolling new server machines. A failed migration aborts the deploy.

## First-time provisioning

Run from the repo root. `fly auth whoami` should already show you logged in.

```bash
# 1. DB app + persistent volume.
fly apps create fractapay-mariadb
fly volumes create mariadb_data --region gru --size 3 -a fractapay-mariadb

# 2. Generate passwords and set them BEFORE the first deploy.
#    The mariadb:11 image only creates MARIADB_USER on first boot when
#    /var/lib/mysql is empty — set secrets late and the user is never created.
ROOT_PW=$(openssl rand -hex 24)
APP_PW=$(openssl rand -hex 24)
fly secrets set MARIADB_ROOT_PASSWORD="$ROOT_PW" MARIADB_PASSWORD="$APP_PW" -a fractapay-mariadb

# 3. Deploy MariaDB. Build context must be infra/mariadb/ — `fly deploy` uses cwd,
#    so cd in (or pass the path positional). `-c path/fly.toml` alone leaves the
#    build context at repo root and the `COPY my.cnf` step fails.
cd infra/mariadb && fly deploy && cd -
# Equivalent: fly deploy infra/mariadb

# 4. Wire the server to the DB.
fly apps create fractapay-server   # skip if it already exists
fly secrets set \
  DATABASE_URL="mysql://fractapay:$APP_PW@fractapay-mariadb.internal:3306/fractapay" \
  -a fractapay-server
# Set the other server secrets too (GEMINI_API_KEY, ETHERFUSE_API_KEY,
# SESSION_SECRET, GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, etc.).

# 5. Deploy the server. release_command applies pending migrations first.
fly deploy
```

## Routine deploys

```bash
fly deploy                  # server. Migrations run automatically.
fly deploy infra/mariadb    # DB image / config changes only.
```

## Running Prisma manually against the Fly DB (no server deploy needed)

Open a WireGuard tunnel and run Prisma locally. Works without the server app even existing.

```bash
# Terminal 1 — keep open. Tunnels localhost:3306 to fractapay-mariadb.internal:3306.
fly proxy 3306 -a fractapay-mariadb

# Terminal 2 — from server/. Inline DATABASE_URL beats the local .env shadow.
cd server
DATABASE_URL="mysql://fractapay:$APP_PW@127.0.0.1:3306/fractapay" \
  npx prisma migrate deploy        # or: npm run db:seed, db:studio, migrate status
```

Local `:3306` collision? Use `fly proxy 3307:3306 -a fractapay-mariadb` and switch the URL host to `127.0.0.1:3307`.

## Health checks

```bash
fly status -a fractapay-mariadb                 # machine started, volume attached
fly logs -a fractapay-mariadb | tail -50        # expect "ready for connections"
fly ssh console -a fractapay-mariadb \
  -C "healthcheck.sh --connect --innodb_initialized"   # exit 0 = healthy
```

## Troubleshooting

- **`P1000: Authentication failed`** — usually one of: (a) literal `<APP_PW>` placeholder still in the URL; (b) `.env` shadowed your shell var (use inline `DATABASE_URL=… npx prisma …`, not a separate `export`); (c) volume was created before the DB secrets, so MariaDB initialized without the app user. Test root login through the proxy; if root works but `fractapay` doesn't, `ALTER USER 'fractapay'@'%' IDENTIFIED BY '<APP_PW>'; FLUSH PRIVILEGES;`. If even root fails, the volume was init'd empty — destroy the machine, destroy the volume, recreate the volume, confirm `fly secrets list` shows the passwords, redeploy.
- **`failed to calculate checksum of ref … "/my.cnf"`** — you ran `fly deploy -c infra/mariadb/fly.toml` from the repo root. Build context = cwd. Fix: `cd infra/mariadb && fly deploy` (or `fly deploy infra/mariadb`).
- **Prisma engine error about `libssl`** — the runtime image is missing `openssl`. Should already be installed by `apk add --no-cache openssl` in `Dockerfile`; check the layer didn't get skipped.
