# Install, run and deploy CoDIN

## Run on this development machine

Open a terminal in the checkout:

```bash
cd /home/ritesh/Dropbox/PROJECTS/LiFE/codin
./install.sh
./start.sh
```

Open **http://localhost:3000**. Keep that terminal open; Ctrl+C stops the app. The first command installs the project's private Node 22 runtime and locked dependencies, checks Atlas access and builds the app. Repeat it after dependency changes or a fresh checkout; it preserves your `.env` and database contents.

Node and npm do not need to be installed globally. Use the root scripts, or explicitly add `.tools/node/bin` to PATH before running npm commands.

### Configuration

The URI is already in the local `.env`. Keep these values alongside it:

```dotenv
MONGODB_URI=your-existing-Atlas-URI
MONGODB_DB_NAME=test
NODE_ENV=development
APP_URL=http://localhost:3000
PORT=3000
OUTBOUND_ENABLED=false
```

Do not paste the real URI into a command or commit `.env`. Atlas must allow this machine's egress IP, and the database user needs access to `test`. `./start.sh doctor` validates configuration without printing credentials or changing the database.

**Database convention: production is `codin`, development is `test`.** The copy into `codin` has already been done. Do not run the initial-copy command again. If the old live deployment is still pointed at `test`, switch it to `codin` before editing data in local development. Follow the cutover checklist in [operations.md](operations.md).

### Review the designs without running the app

```bash
./start.sh preview
```

Open **http://localhost:4173/designs/**. This command does not read `.env`, connect to Atlas or require npm dependencies. It uses the private Node runtime from installation. To use a different preview port:

```bash
PREVIEW_PORT=4174 ./start.sh preview
```

There are seven options: the combined Open House + Now homepage, plus the previous six visual/layout directions with representative project and learning screens. The combined mockup is at `/designs/combined.html` and includes working demonstration media. New prototypes use illustrative dates and updates. Screenshots and PDFs can be downloaded from the comparison page.

### Common commands

| Command | Purpose |
| --- | --- |
| `./install.sh` | Install/update dependencies, check Atlas and build |
| `./start.sh` | Run development app on port 3000 |
| `./start.sh preview` | Serve design review without a database |
| `./start.sh doctor` | Diagnose local configuration without network access |
| `./start.sh build` | Build frontend and Node server |
| `./start.sh test` | Run automated tests; integration tests require the separate QA replica |
| `./start.sh start` | Run a built production app; requires production environment selecting `codin` |
| `sudo ./deploy.sh` | Install a production release on the server |
| `sudo ./scripts/rollback.sh` | Restore the previous deployed code release |

`npm run preview` serves only the Vite build: it does not run the API or LMS. Use `./start.sh` for the complete application.

### Sign in locally

Existing accounts are preserved. After production cutover, create a dedicated development administrator and isolate copied accounts using the commands in the operations guide. These are separate because account resets in `test` would affect an old deployment still using it. Development SMTP, cloud uploads, Google writes and AI calls are disabled; use existing credentials or the administrator command rather than email-based signup/reset.

## Deploy to the Ubuntu server with Atlas

The scripts use a private Node runtime and Atlas; they neither install a MongoDB server nor change the existing MongoDB 3.6 service. Production deployment requires SSH access to your server. Commands below are run **on that server**, not on the development machine.

1. Copy the reviewed source checkout to the server, excluding `.env`, `backups/`, `.tools/`, `node_modules/` and `.git` if not using Git to transfer. For example, from the development machine, substitute your actual SSH user and host:

   ```bash
   rsync -az --exclude='.env' --exclude='.env.*' --exclude='backups/' \
     --exclude='.tools/' --exclude='node_modules/' --exclude='.git/' --exclude='dist/' \
     ./ USER@HOST:~/codin-source/
   ```

2. Install OS prerequisites on the server:

   ```bash
   sudo apt-get update
   sudo apt-get install -y curl ca-certificates xz-utils tar nginx
   ```

   Also install **MongoDB Database Tools** (`mongodump`, `mongorestore`) from MongoDB's official distribution for the server's platform. They are client utilities, independent of the old MongoDB server. The deployment script stops if `mongodump` is unavailable. Do not install or upgrade the MongoDB server as part of this step.

3. Create the production environment without exposing credentials in shell arguments:

   ```bash
   cd ~/codin-source
   sudo install -m 600 deploy/production.env.example /etc/codin.env
   sudoedit /etc/codin.env
   ```

   On later deployments, edit the existing file rather than copying the template over it. Set at least:

   ```dotenv
   NODE_ENV=production
   MONGODB_URI=your-Atlas-URI
   MONGODB_DB_NAME=codin
   APP_URL=https://YOUR_DOMAIN
   PORT=3000
   HOST=127.0.0.1
   OUTBOUND_ENABLED=false
   ```

4. Allow the server's egress IP in Atlas. Stop writes on the old deployment and reconcile any changes made since the initial copy before switching databases. Rotate the originally exposed Atlas credential. Take a production backup before migrations.

5. Install the release:

   ```bash
   sudo ./deploy.sh
   sudo systemctl status codin --no-pager
   curl --fail http://127.0.0.1:3000/health/ready
   ```

   The installer creates the `codin` service user and a timestamped release under `/opt/codin/releases`, builds it, backs up Atlas and switches `/opt/codin/current`. A failed readiness check restores the previous code release where available. Environment files and data are preserved on subsequent installs. This command does not run status migrations or overwrite either database.

6. Configure public HTTPS. Start from `deploy/nginx.conf.example`, replace the hostname and certificate paths, and obtain/install a certificate for your domain using your existing certificate workflow. Keep the nginx upstream aligned with `PORT` if changing it from 3000. Review the file before enabling it; do not overwrite another site's configuration.

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

7. Check sign-in, material access and editing. Configure SMTP/OAuth/upload credentials and enable outbound only when ready. Then reopen writes. Old database-ID sessions require users to sign in again.

### Routine production operations

```bash
sudo systemctl restart codin
sudo journalctl -u codin -n 100 --no-pager
sudo systemctl list-timers codin-backup.timer
sudo journalctl -u codin-backup -n 50 --no-pager
sudo ./scripts/rollback.sh
```

Daily backups go to `/var/backups/codin`. Store an additional private off-server copy and rehearse restoration. Code rollback does not reverse data migrations. See [operations.md](operations.md) for backup/restore commands, development refresh, status migration and recovery.

## Troubleshooting

- **`node` or `npm` not found:** use `./install.sh` and `./start.sh`; their private runtime does not change your shell globally.
- **Missing dependencies:** run `./install.sh` from this checkout.
- **Configuration error:** run `./start.sh doctor`; correct the named fields in `.env`.
- **Atlas connection failed:** check credentials, database permissions and Atlas Network Access. No in-memory save fallback is used.
- **Port in use:** reuse the running preview, stop the owning process, or choose another port. For the app, update both `PORT` and local `APP_URL`.
- **Designs load but LMS does not:** you may be on the design-only server at port 4173. Run the app at port 3000.
- **Email signup/reset fails locally:** real outbound delivery is disabled in development. Use a development administrator after production cutover.
