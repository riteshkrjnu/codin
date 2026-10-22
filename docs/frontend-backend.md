# Frontend and API hosting

The existing combined hosting remains the default. Production deployment scripts, systemd configuration, nginx configuration and credentials have not been changed by this design implementation. The redesigned application uses the existing public URLs and Atlas selection (`codin` for production, `test` for development).

## Existing combined setup

```bash
./start.sh build
./start.sh start
```

This builds the React site into `dist/` and the API into `dist/server.cjs`; Express serves both, as before. Leave `VITE_API_BASE_URL` empty and `SERVE_FRONTEND` unset or `true`. Set `APP_URL` to the existing public frontend origin.

## Optional separate hosts

Frontend build configuration contains public values only:

```bash
VITE_API_BASE_URL=https://api.example.org npm run build:frontend
```

Upload **only `dist/client/`** to the frontend host. That directory contains static assets and the SPA. Configure the host to serve `index.html` for application URLs such as `/projects/tholkudi`; existing files such as `/assets/*` must be served normally. The design-preview files remain available under `/designs/`.

The build embeds the API origin. Rebuild the frontend after changing it. Never place Atlas, SMTP, OAuth secrets, Cloudinary secrets or private keys in `VITE_` variables or in the static host. [Vite environment documentation](https://vite.dev/guide/env-and-mode.html).

On the API machine, use the existing Node application and locked dependencies:

```bash
npm run build:backend
SERVE_FRONTEND=false NODE_ENV=production npm run start
```

The server environment selects:

```dotenv
APP_URL=https://www.example.org
PUBLIC_API_URL=https://api.example.org
CORS_ORIGINS=https://www.example.org
SERVE_FRONTEND=false
MONGODB_DB_NAME=codin
```

Keep the existing `MONGODB_URI` and all integration secrets on the API machine. `APP_URL` is the frontend origin used in messages and links; `PUBLIC_API_URL` is the API origin used for OAuth callbacks. Origins have no path or credentials. Production origins require HTTPS. The API-only mode serves JSON routes and health checks without serving the React application.

`CORS_ORIGINS` accepts exact comma-separated frontend origins, including both apex and `www` only if both are used. Authenticated API requests send the existing expiring bearer session and use credentialled CORS. A public wildcard is not supported. [Express CORS documentation](https://expressjs.com/en/resources/middleware/cors/).

OAuth callbacks registered with the providers must use the API origin:

- `https://api.example.org/api/lms/auth/google/callback`
- `https://api.example.org/api/lms/auth/github/callback`
- `https://api.example.org/api/google-oauth-callback` for the existing Drive/YouTube authorisation flow.

The sign-in popup visits the API before redirecting to the provider, keeping its OAuth state cookie on the API host. It returns the result only to the configured frontend origin. The frontend accepts sign-in messages only from the configured API origin and its own popup window. Provider credentials and actual external delivery still require the existing production integration configuration.

## Separate local processes

Use Node 22 from the private installation if needed:

```bash
export PATH="$PWD/.tools/node/bin:$PATH"
```

In the API terminal (use the existing development Atlas `test` configuration):

```bash
APP_URL=http://localhost:5173 PUBLIC_API_URL=http://localhost:3000 \
CORS_ORIGINS=http://localhost:5173 npm run dev:backend
```

In the frontend terminal:

```bash
VITE_API_BASE_URL=http://localhost:3000 npm run dev:frontend
```

Open `http://localhost:5173`. Use `localhost` consistently; `127.0.0.1` is a different origin. Vite also has an `/api` development proxy for local same-origin use; explicit API configuration is the most direct test of separately hosted frontend/API behaviour. No production MongoDB is installed locally.

## Content and learning

- Public layouts live in `src/site/`, API modules in `server/`. Neither live layout nor API depends on the prototype JavaScript or fixture records.
- Course metadata, modules, materials, enrolment, registration, assignments and admin workflows retain their existing APIs and public routes. The existing revision transport still applies to saves on another API host.
- The course route directly renders the existing protected learning workflow, with its public overview using the shared detail layout. Its modules appear on the left in the approved design. Instructor controls, assignments, uploads and layout controls remain available under their existing permissions.
- Practice notes and completion are private per account and stored separately in `learningProgress`, keyed by user and course. Updates require confirmed course access and use revisions; stale writes keep the note in the editor. Changing progress never rewrites course modules or materials.
- Resources are stored in `resources`. Administrators can publish drafts, schedule publication, link projects/centres, add media/transcripts and move records to recoverable trash at `/admin/resources`. Saves require a revision and retain prior snapshots in `contentRevisions`. The unique resource slug index is ensured when a resource is first written. No example resource records are seeded.
- Existing linked project outputs and centre publications are discoverable in the library without copying or deleting their source records. Unlinked publication citations stay on their centre pages.
- Homepage media uses actual public project images, project videos and published resource audio where available. Empty media slots become actual text/project/centre content rather than demonstration recordings. Empty or unavailable feeds report their state honestly.
- Lifecycle filters default to Ongoing, then Upcoming when no ongoing entries exist. Completed and explicitly archived records are grouped in “Completed & archived” while retaining their actual status label. Resources are a reusable library without an event lifecycle filter.

## Verification and rollout

Run `npm run lint`, `npm test` and `npm run build` before using the existing deployment procedure. Optional HTTP tests use a dedicated local QA MongoDB replica through `QA_MONGODB_URI`; they refuse Atlas and ordinary local database ports. Back up production using the existing procedure before a release. No production migration, record copy, deployment or hosting change was performed as part of this implementation.

Shared design contracts, automatic status refresh and the repeatable browser regression suite are documented in [design-architecture.md](design-architecture.md).
