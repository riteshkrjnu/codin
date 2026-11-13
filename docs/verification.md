# Implementation verification

Verified on the development machine, 19 October 2026.

- Atlas: backed up `test`, copied it into the new `codin` production database, and matched all 18 collection manifests, indexes and full-document digests. The source database was not changed by copying. Original account credentials were preserved in `codin`.
- Recovery: restored that archive into an isolated local replica and matched every original collection manifest. Rehearsed the status migration there: 15 activities examined, 8 ambiguous records flagged for manual review. No Atlas migration applied.
- TypeScript check and production build passed. The pre-existing large-bundle warning remains; further splitting is separate work.
- Eight automated tests passed, including HTTP scenarios for partial metadata saves, explicit material removal, revision restoration, missing/stale revisions, simultaneous writes, student permission denial, duplicate creation, recoverable trash, forged/expired/revoked tokens, consistent course/event status and database outage responses.
- Real React app browser check passed against a dedicated local QA database: login, identity, metadata preservation, two-tab conflict banner, explicit LMS deletion through the compatibility transport and the editorial dashboard. No JavaScript errors.
- All 18 design combinations passed browser checks at 1440px and 390px: three concepts, three page types, two widths. No horizontal overflow, JavaScript errors or API requests. Desktop/mobile images and a comparison PDF are included.
- Development installer completed end to end with an existing `.env`, verified Atlas access to `test` and rebuilt the app. Fresh configuration bootstrap created `.env` with mode 600 and stopped for user configuration. Shell and JavaScript syntax checks passed.

## Production steps still required

- Rotate the original embedded Atlas credential and replace it in environment files. Source removal does not revoke credentials or purge history.
- Obtain production server access, review/install the supplied systemd/nginx configuration and TLS certificate, and switch the live app to `MONGODB_DB_NAME=codin`.
- Check for writes made to the old `test` deployment after the initial copy and reconcile them during a quiet write window before cutover.
- Only then run development account isolation in `test` and create a dedicated development administrator. These commands were deliberately not run while the old live app may still use `test`.
- Review ambiguous activity dates/statuses before applying a production migration. Full-site application of a selected design awaits team selection.

Production service execution on Ubuntu 20.04 and real SMTP/OAuth/upload delivery were not tested here. The production host is not connected. A temporary local replica was used for transaction tests; the server's existing MongoDB service and production Atlas records were not used for destructive tests.

## Installation and layout revision

- Added root `install.sh`, `start.sh` and `deploy.sh` entry points and a dedicated installation guide. Corrected the local placeholder APP_URL. The new installer completed dependency installation, Atlas connectivity check and build successfully; production was not deployed.
- The configuration doctor passed five valid/invalid environment scenarios without database access. The standalone design server served a new layout successfully and rejected write and traversal requests.
- Added CoDIN Now, Project Observatory and CoDIN Open House, each with independent home/project/learning arrangements. Retained the original three visual concepts in the gallery.
- All 18 new screens passed real-browser checks at 1440px and 390px, including category filters, stage filters, board/list switching, project dialog, project tabs, calendar period, room selection, lesson navigation, note retention and completion. No horizontal overflow, JavaScript errors or API calls were observed. Updated desktop/mobile screenshots, first-screen thumbnails and layout-comparison PDF are in `public/designs/review`.

## Combined Open House + Now mockup

- Added `/designs/combined.html` as option 07, retaining all six earlier directions. It combines a photo/video/audio/research card mosaic, upcoming diary, Follow a Project, category-filtered activity desk and Open House's closing invitation.
- Browser checks passed at 1440px, 768px and 390px. Verified photo dialog, Escape/close, actual video decode/playback, captions, actual audio decode/playback, transcript, no autoplay, project filters, category filters, empty-state handling and calendar switching. No horizontal overflow, broken images, API requests or JavaScript errors were observed.
- Video is an original 12-second motion-graphic demo; narration is synthetic and explicitly labelled. No private or production media was accessed.
- Desktop/tablet/mobile screenshots, first-screen image and `combined-mockup.pdf` were generated. Production build and JavaScript syntax checks passed. No live website or Atlas records were changed.

## Multimedia-first layout and refined dialog motion

- Removed the additional ongoing-card section. The multimedia mosaic is again the first feature. The existing diary has equally styled W2M Academy, Projects and Events rows under In progress, followed by upcoming activities. Curiosity can be a beginning replaces Why CoDIN; the activity feed uses the full available width.
- Dialog transitions move a separate surface while content crossfades without scaling. Source return, keyboard focus, Escape, backdrop closing, interrupted entry, reduced motion and project navigation are covered by browser checks.
- Revised browser checks passed at 1440px, 768px and 390px: multimedia-first structure, compact diary rows, removal of Why CoDIN, source-bound surface animation, all close paths, focus restoration, source/category/project filters, diary switching and video/audio playback. Reduced-motion checks passed. No horizontal overflow, JavaScript errors or API requests were observed. Screenshots and the printable PDF were refreshed; production build passed with the existing bundle-size warning.

## Learning card and activity desk refinement

- Removed the diary's three additional in-progress rows. Added a visually distinct W2M Academy invitation before the three projects and renamed the section Stay close to the work.
- Replaced format-filter chips with a compact status dropdown beside the result count. Verified Ongoing, Upcoming, Archived and All activities, scoped counts, upcoming date order, area switching, project/W2M shortcuts and empty-state recovery. Rehearsed the initial Upcoming fallback by intercepting only the local fixture response to remove ongoing entries; no database was involved.
- Added Resources & publications fixtures covering blogs, white papers, reports, datasets, models and toolkits. Verified the library hides the activity lifecycle selector and its dialogs clearly disclose illustrative records without downloads.
- Browser checks passed at 1440px, 768px and 390px, including existing media playback, dialog closing and diary switching. Reduced-motion checks passed. No horizontal overflow, JavaScript errors or API calls. Refreshed screenshots and printable PDF. JavaScript syntax and production build passed with the existing bundle-size warning; production content remains unchanged.

## Full-site page walkthrough

- Added `explore.html`, `explore.js` and `explore.css` with a review index and 14 page types: academy, course, classroom, centres, centre, events, event, projects, project, resources, resource, about, people and custom learning. Connected the landing-page navigation, project dialogs, academy links, footer and design gallery to the walkthrough.
- Browser checks passed for all 15 screens at 1440px and 390px, plus 18 centre/project/event/course/resource variant checks. Verified one main heading, loaded images, no horizontal overflow, no JavaScript errors and no API requests.
- Exercised course format filters, syllabus disclosure, event/project status filtering, archived-event resource actions, library search/format/empty state, profile/governance/participation dialogs and landing-to-centres navigation.
- Classroom checks verified video playback, captions markup, switching lessons, retained practice notes, completion without note loss, next lesson and reset on reload. Reduced-motion contexts were used for these checks. The classroom stores demonstration state only in memory.
- Generated desktop/mobile screenshots in `public/designs/review/pages/`, refreshed landing exports and generated `site-walkthrough.pdf` covering 15 review screens. Verified the PDF is served successfully. No production records, enrolments, registrations or downloads were accessed or changed.


## Main React implementation: Open House + Now

- Applied the approved direction to the actual React routes: landing page, Academy and programme catalogues, public course overview, Centres, Events, Projects, resource library, People and About. Existing public URLs remain intact. CMS and enrolment/registration actions open the existing workflows in the new visual system. The LMS outline is on the left; resizing, materials, uploads, instructor permissions and assignments remain available.
- Public pages load actual API records and report empty/unavailable states without copying prototype fixtures into live content. Homepage media uses public images, project videos and published resource audio. Dated activity is shared across the homepage and associated centre/project views. Completed/archived records remain discoverable without being marked ongoing. Open-ended project status has its own shared policy.
- Added administrator-managed resource publication, scheduling, associations, media/transcripts, revisions and recoverable trash. Existing linked outputs and centre publications are included without duplicating their source records. Resources have no activity lifecycle filter.
- Added account-private learning notes/completion in a separate collection. Stable material IDs, access checks and revision checks prevent learning progress saves from replacing LMS content or another tab's note.
- Added optional independent frontend/API builds, a public frontend API-origin setting, API-only mode, exact-origin credentialled CORS and distinct frontend/API OAuth origins. Existing combined build paths, installation/deployment scripts, systemd/nginx files and actual environment secrets remain unchanged. The bundled API file is not served as a frontend static asset.
- TypeScript and production builds passed. Ten tests passed with the isolated local QA replica, including content/revision/outage/session regression, project status, hosting configuration, private notes/progress, course access, resource authorisation, duplicate slugs, stale saves and recoverable trash. No Atlas database was used by these tests.
- Real browser checks passed for 34 public desktop/mobile screens with frontend and API on different ports. Verified public material redaction, real login/session identity, protected LMS access, note/progress persistence after reload, metadata preservation, stale-tab conflict UI and resource creation through the editor. Resource scheduling and permissions were also exercised over HTTP.
- Independently built static frontend checks passed against the separate API. Verified every browser API request used the API origin, CORS preflight, rejected untrusted origins, source-bound dialog expansion, rapid close, focus/scroll restoration, search and theme switching. Checked development StrictMode does not cancel the entry animation.
- QA images are in `/tmp/codin-main-review/` and contain explicitly synthetic QA records, not production content. OAuth provider exchange, actual email/payment/upload delivery and production server execution were not exercised. No deployment or production data changes were performed; the user requested retaining the existing deployment setup.
- Additional checks passed for `Request`-object API saves without lost bodies, rejection of forged OAuth popup messages and sanitisation of unsafe rich-text attributes/embedded hosts. Fixed LMS refetching after authentication/enrolment changes and cleared cached access on logout. Default `npm test` reports eight passing unit/configuration tests and two explicitly skipped HTTP tests when the isolated QA URI is not supplied.
- Confirmed real sign-in from an already-open guest course refreshes authorised materials without a manual reload; sign-out removes the protected content immediately. Project announcements now inherit the project's lifecycle/associations and are deduplicated with its activity, allowing one dated update to appear across homepage/project/centre views. Course/event editor baselines are namespaced so records sharing a public slug cannot replace each other's revision/material snapshot.
- The final compiled combined app passed a smoke check using a disposable local QA database: root and nested public routes served the React build, assets loaded, unknown API routes returned JSON 404, and direct/encoded access to the bundled backend file was blocked. The default combined build was regenerated after independent-host tests so no QA API origin remains in its frontend assets.

## Functionality regression repair and automatic dates

This verification supersedes the earlier claim that routing public pages to simplified views preserved every original workflow. That approach hid controls and omitted profile features. The new layouts now compose the existing controllers directly.

- Restored About, Academy and Centres dropdowns and the Projects mega menu, including dynamic project lifecycle groups, category links, responsive menu controls, keyboard disclosure, Escape/focus return and route dismissal.
- Project, event, people and course collections use the approved templates and cards. Their existing controllers supply records, extra filters and visible Add/Edit/Trash/Restore actions under their original permissions. Removed the manage-query route gate. Public detail pages use the shared heading, cover and content/sidebar layout while retaining their functional tabs, registration, editing, uploads, custom content and learning controls.
- Preserved profile editing, Scholar integration and Courses/Events tabs. Added a dedicated readable bibliography with year/search filters, safe links, deduplication and useful citation metadata. Unchanged structured citation data survives unrelated profile edits. Centre and profile affiliations now use live API records, and event association filters read the actual API response shape.
- Shared date policy drives Upcoming/Ongoing/Completed across projects, events, courses and linked activities. Draft, Archived and suspended projects remain explicit. Open-ended projects remain active; manually completed projects without an end date retain completion. Date-only boundaries include the whole day in Asia/Kolkata. Live clock updates do not reset editor drafts; scheduled public data refreshes in the background. No production migration or timed database writes are required.
- Fixed event creation without dates by giving its free-text date field an explicit “Dates to be announced” value; the required database field no longer fails on an otherwise valid unscheduled event. Structured dates continue to drive automatic status.
- TypeScript and the combined production frontend/backend build passed. All 13 automated tests passed with the isolated local QA replica, including metadata preservation, explicit LMS removal/recovery, concurrent revisions, session/permission checks, database outages, date boundaries, open-ended projects, notices and publication/menu contracts.
- The repeatable `npm run test:browser` suite passed 40 public screens at 1440px and 390px, plus workflow checks. It exercised keyboard/mobile navigation, publication search/year/links, guest restrictions, actual project creation/editing, event creation/editing/trash/restoration, course creation, people/profile/centre/project editor availability, date-driven project transitions with an unsaved editor draft, protected LMS access, saved notes/completion after reload, stale-tab conflict UI and resource creation. HTTP checks rejected student content creation and verified resource revisions, scheduling and recoverable deletion. No page JavaScript errors or public horizontal overflow were observed.
- Browser/API tests ran on separate local origins with outbound delivery disabled and synthetic data only. Screenshots are in `/tmp/codin-regression-review`. Test-created databases and processes were cleaned up. Atlas `codin`/`test`, production data and deployment settings were untouched. External OAuth exchange, email, payment and upload-provider delivery were not revalidated by these local tests.
- Theme tokens, navigation, named detail-layout slots, collection/card action contracts and publication presentation are documented in [design-architecture.md](design-architecture.md).
