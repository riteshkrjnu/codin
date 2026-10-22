# CoDIN — Council for Diversity and Innovation

React 19 / Vite / Express / Mongoose application with a MongoDB Atlas database.

**Database names: `codin` is production; `test` is development.** The application refuses the reverse configuration. Both can use the same Atlas cluster; separate database users are recommended.

## Quick start

```bash
./install.sh
./start.sh
```

Open **http://localhost:3000** for the full app. Keep the terminal open; Ctrl+C stops it.

For design review only: `./start.sh preview`, then open **http://localhost:4173/designs/**. No Atlas connection is made for design review.

**[Complete installation, running and deployment instructions →](docs/installation.md)**

Production, on the server: configure `/etc/codin.env` from `deploy/production.env.example`, selecting `codin`, then run `sudo ./deploy.sh`. Follow the linked guide for prerequisites, backups, HTTPS and cutover order.

## Development

```bash
./scripts/setup.sh
./scripts/run.sh dev
```

Setup installs a private Node 22 runtime in `.tools/`, installs locked dependencies, checks Atlas access and builds the application. It preserves existing `.env` files. If none exists, it creates one from `.env.example` and stops for configuration. MongoDB Database Tools are needed for backup/restore, not for normal operation. No local database service is installed.

Required local `.env` values:

```dotenv
MONGODB_URI=your-Atlas-connection-string
MONGODB_DB_NAME=test
NODE_ENV=development
APP_URL=http://localhost:3000
PORT=3000
OUTBOUND_ENABLED=false
```

The website is at `http://localhost:3000`. The independent design review is at `/designs/`, and publishing/recovery tools are at `/admin/editorial` after administrator sign-in. Old database-ID login tokens are invalid; users must sign in again.

**If the old live deployment still uses `test`, complete the production cutover to `codin` before making development changes in `test`.** Account isolation is deliberately a separate post-cutover command.

## Main website design

The approved Open House + Now homepage and Connected Workspace / Section Atlas / Notebook page design are implemented in the React app, with actual API content. The homepage, Academy, Centres, Events, Projects, People, About and resource library share the new layout. Existing public URLs, LMS access and administration remain available. Sign in as an administrator to see page-management links; resource publishing is at `/admin/resources` and announcements at `/admin/announcements`.

The existing combined installation and deployment procedure is unchanged. Optional separate frontend/API builds, public API URL configuration, CORS and OAuth settings are documented in [frontend and backend hosting](docs/frontend-backend.md).

## Design review

The functional routes now use the same Connected Workspace, Atlas and Notebook compositions. Course overviews retain their original classroom through **Open LMS** (`?learn=1`), with existing enrolment and permissions. The independent review prototypes are preserved.

The refined **[Connected pages mockup](public/designs/connected.html)** at `/designs/connected.html` combines full-height workspace indexes, Atlas detail pages and a progressive Notebook reader with the Programme Desk’s At a glance card. People and resource details use the Notebook directly. Events and W2M courses hand off to the current LMS entry route. Open it from `/designs/`; screenshots and the printable review are at `/designs/review/connected/`.

The **[Layout laboratory](public/designs/compare.html)** at `/designs/compare.html?page=review` compares seven page structures using a dated snapshot of the current app's public records. Events, People, Projects and Centres have distinct compositions, with companion previews for learning and other public pages. It runs independently through `./start.sh preview`, is linked from `/designs/`, and includes desktop/mobile screenshots and a printable comparison. See [review and export instructions](docs/design-review.md).

Seven fixture-only directions are available. The combined direction now includes a linked public-site and learning walkthrough:

- **Open House + Now landing page:** `/designs/combined.html` — multimedia mosaic, upcoming diary, W2M/project cards, activity desk and closing invitation.
- **Full-site walkthrough:** `/designs/explore.html?page=review` — W2M Academy, course overview, classroom, Centres, Events, Projects, resource library, About, People and custom learning. Listing and detail pages are linked. The walkthrough includes a printable page-review PDF.
- **CoDIN Now:** `/designs/layouts.html?concept=now` — newsroom, lead story, activity feed and opportunities.
- **Project Observatory:** `/designs/layouts.html?concept=observatory` — project board/list, work stages and logs.
- **CoDIN Open House:** `/designs/layouts.html?concept=house` — activity rooms, diary and participation paths.
- Original Journal, Institute and Atlas directions remain in the gallery for reference.

See [layout comparison and content workflow](docs/design-review.md).
Switch concepts and pages using the review navigation. Gallery links include desktop/mobile screenshots and a printable comparison PDF. Example activities and images are labelled. No prototype makes API calls or persists notes/progress.

To review designs without connecting the backend:

```bash
./start.sh preview
# Open http://localhost:4173/designs/
```

## Database operations

With the project Node runtime on PATH:

```bash
export PATH="$PWD/.tools/node/bin:$PATH"
npm run db:check
npm run db:backup
node scripts/database.mjs restore backups/ARCHIVE.archive.gz test codin_restore_check
npm run db:status                        # dry-run only
```

See [operations guide](docs/operations.md) for the verified initial copy, production installation, development account isolation, refresh, migration, recovery and rollback.

## Checks

```bash
npm run lint                            # TypeScript, no rewrites
npm test                                # unit tests; integration tests skip without QA URI
npm run build
```

Integration tests must use a **dedicated local replica set on port 27019**, never Atlas:

```bash
QA_MONGODB_URI='mongodb://127.0.0.1:27019/?replicaSet=codinqa' npm test
```

The suite creates and removes uniquely named QA databases, starts temporary app servers and tests transactions, permissions, conflicts, restore, status/feed consistency, sessions and database outages.

## Content safety

Metadata saves preserve unmentioned modules/materials. LMS changes use explicit operations with stable IDs and require a revision (`__v`). Atomic transactions save a recovery snapshot and compare the revision before updating. Conflicts return HTTP 409; missing revisions return 428. The UI preserves unsaved editor state and displays a conflict notice.

Trash is recoverable. Permanent course/event deletion is disabled. Database failure returns 503; the app does not report temporary-memory writes as successful. Seed data is opt-in for `test` only (`npm run db:seed`); never run seeds over an existing production dataset.

Development blocks email delivery, external uploads, Google write operations and AI requests. File links are preserved; explicit material deletion removes the database reference, not the externally hosted file. Production outbound integrations require `OUTBOUND_ENABLED=true` and their own credentials.

Do not commit `.env`, dumps or backups. An old credential was embedded in the original source: **rotate it in Atlas before production rollout** and replace the local/server environment values. Removing it from the current source does not revoke it or remove Git history.

### Design and functionality regression checks

The approved layouts use the existing content and LMS controllers, with page/card action slots for their original forms. Theme tokens, layout components and CSS are separate from permissions and saves. See [design architecture and regression testing](docs/design-architecture.md) for the boundaries, automatic date statuses and `npm run test:browser` instructions.

## Writing and homepage highlights

Signed-in members can open **My writing** (`/writing`) from their account menu. Articles use ordered content blocks with text formatting, galleries, captions, attribution, transcripts and audio/video links or YouTube embeds. Photo uploads use the existing Cloudinary integration; development deliberately disables external uploads. Save a private draft or submit for review. Admins can publish directly, approve submissions, return feedback, archive records and restore earlier revisions as working drafts. A member's proposed edits do not replace the public version until approved.

Administrators use `/admin/resources` for the same workspace, the review queue, categories and **Homepage highlights**. Pin stories and move them into order within each of the seven homepage verticals; other eligible stories follow automatically. Category labels are separate from existing resource formats. Existing Markdown records and `/resources/:slug` URLs continue to work.

Connect writing to events, courses, projects and centres. The public **Writing & media** chapter shows connected work by category, newest first. Event/course connections also reach their projects and centres; project connections reach their centres. Published articles also appear in Resources and the activity feed. Notifications without an external destination have public pages under `/notices`.

The Open Diary starts with **All upcoming**, including events, courses and explicit notice, project-position and programme-phase deadlines. Notice expiry is not a deadline. Dates and deadline boundaries use Asia/Kolkata. Notice deadline fields are available in `/admin/announcements`.

Resource public snapshots remain in `resources`; private working versions are stored separately in `resourceworkings`. Editorial categories and homepage pins use `editorialsettings`, and revision recovery uses `contentRevisions`. Collections/indexes are created on first use; existing resources need no destructive migration. Keep MongoDB replica-set transactions enabled, as required by the existing content editors.

The writing workspace follows the admin sidebar layout: **Articles**, **Manage Categories**, **Homepage Highlights** and **Admin Control** (the last three require an administrator). Article drafts remain available when switching into the review queue. The account dropdown has one **My Writing** entry; the public **CoDIN Commons** remains in the main navigation.

If new API routes return `404 API endpoint not found` while `/health/ready` is healthy, restart the development backend: stop its terminal with Ctrl+C and run `./start.sh` again. Frontend hot reload does not reload the Express server. No database reset is required.

Articles are edited through **Overview**, **Content & Media**, **Connections**, **Licence & Citation**, and **Sharing**. New articles default to the signed-in author and today’s India-time date. The licence selector includes six Creative Commons 4.0 licences, CC0, software/data licences, all rights reserved, and custom terms, with links to the original licence documents. Automatic citations follow article metadata and canonical URLs; legacy/custom citations remain editable.

A cover image is the article thumbnail/header; photos and galleries inside the body use content blocks. Both cover images and body photos accept hosted URLs or uploads. The optional external resource URL links to a full report, dataset or other record hosted elsewhere.

Save a draft before sharing. The owner or an admin can add an existing account by its email address in **Sharing**, or remove its edit access. Shared articles appear in the recipient’s My Writing list. Editors may save and submit revisions, but publication still follows the normal admin review policy. Sharing does not send email or enable live simultaneous typing. Shared editing uses revision conflicts and **Reload saved version** to protect concurrent work. Access changes also increment the article revision and are recorded in history; collaborator IDs are omitted from public resources.
