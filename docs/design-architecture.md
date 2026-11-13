# Updating the design without replacing functionality

The homepage retains the approved Open House + Now layout. Collection routes use a Connected Workspace: a full-height, searchable directory beside the existing collection page. Workspace routes remove the inherited homepage margins and put a single reading gutter inside the content pane, so opening the directory cannot overlap the page. Selecting a record collapses the directory; its search and scroll position are retained. Centres, projects, events and W2M course overviews open as a Section Atlas. Selecting a section opens the progressive Notebook reader with Programme Desk navigation and an At a glance rail. People, resources, Vision/Mission and custom learning use the Notebook directly. The existing controllers continue to own authentication, permissions, filters, forms, uploads, registration, learning, assignments and saves. There is no `manage=1` routing gate.

## Presentation boundaries

- `src/site/theme/tokens.css`: shared brand colours and font families, consumed by Tailwind and site styles.
- `src/site/site.css`: homepage, collection and shared presentation; in the `components` cascade layer, so it does not override functional Tailwind utilities.
- `src/site/theme/functional-pages.css`: named layout slots and the visual adapter for existing functional content.
- `src/site/theme/connected-pages.css`: workspace, compact record summaries, Atlas cards, reader, responsive section selector, print and reduced-motion styles.
- `src/site/layout/ConnectedWorkspace.tsx`: public directory navigation around existing routes. It does not filter or replace the management records owned by collection controllers.
- `src/site/layout/RecordExperience.tsx`: presentation contract (`sections`, `renderSection`, `glance`, optional controller selection). Owns expansion, section URLs/history, progressive chapter mounting and focus restoration. Visited chapters stay mounted when changing sections or closing the Atlas reader. Duplicate legacy section slugs are normalised only in the view.
- `src/site/layout/RecordGlance.tsx`: summary facts and a slot for actual controller-owned registration, admission and management panels.
- `src/site/layout/RecordImage.tsx`: optional covers and portraits with an initials fallback for missing or failed external images.
- `src/site/layout/DossierContent.tsx`: purpose-built project and centre reading chapters, connected-record rows, profile biography/statistics and education/experience. Recruitment receives an explicit controller-owned action callback.
- `src/site/layout/RecordContent.tsx`: shared public chapters for events, courses and custom sections: programme days/documents, fees, deadlines, logistics, contacts, committees and lists. Protected LMS content remains in the original courseware controller.
- `src/site/theme/navigation.css`: desktop/mobile navigation styling.
- `src/site/layout/RecordHeading.tsx`: common record heading and date/status metadata. It never saves content.
- `src/site/layout/PageLayout.tsx`: visual wrapper, without permission or route gates.
- `src/site/layout/navigation.ts`: menu structure from the original navigation configuration plus actual centre/project records.
- `src/site/layout/SiteNavigation.tsx`: accessible disclosure and mega-menu interaction.
- `src/site/PublicPages.tsx` and `src/site/cards.tsx`: the new collection templates and cards. `CatalogueControls` supplies real records, extra filters, page actions and per-card actions from existing controllers.
- `src/features/publications/`: normalisation and readable bibliography presentation, independent of profile layout. Search, year filtering, safe publication links and Scholar deduplication do not modify stored citations.

Change theme tokens or templates for future visual updates. Do not replace a functional route with a simplified read-only view. Keep form state in its existing controller and inject its actions into the presentation slots. Preserve stable IDs, revision checks and API URLs.

## Navigation and functional ownership

The global Navbar and mega menus stay outside the workspace and reader. The reader appears below the measured navigation height; original editor/authentication overlays remain above it. Original controllers supply real records and action callbacks to the reading templates. Custom sections, registration/payment state, upload controls and permission-dependent actions remain connected to those controllers. At a glance uses primary actions and labelled facts; former sidebar cards are not embedded in it. Event registration, admission and support editing are rendered in the registration chapter, and organiser/sponsor credits appear once near the summary. People use a compact identity/portrait summary; published photos, projects and background remain accessible as chapters. No database or API schema changes are needed for the layout. Empty section containers omitted by MongoDB are defaulted in the presentation layer; accepted-paper lists retain title/author/abstract fields alongside person-style lists. Venue links prefer explicit record links, with a map search fallback for a published physical venue. Both legacy object and row-based logistics are supported.

A `?section=slug` URL opens the corresponding chapter; legacy `?tab=slug` and `?participate=1` event links remain supported. User section selections add history entries; scroll highlighting replaces the current entry. Close restores the Atlas card's focus and overview position. The mobile selector replaces a wrapping tab row. The reader progressively mounts chapters as they approach the viewport and preserves their local filters and inputs afterward.

Residential detail links now share `/events/:slug?isCourse=true`; old `/academy/residential/:slug` bookmarks redirect while preserving section parameters. `from=academy` or `from=events` keeps the corresponding workspace and back destination. Course overview URLs show Atlas even for enrolled users. **Open LMS** uses `/academy/online/:slug?learn=1` and preserves that origin; the existing access checks still decide whether classroom content is available. Original event/residential **View Materials** actions also use this entry. Instructor simulation remains available. Classroom lessons, notes, progress, assignments, uploads and permission checks retain their existing controller logic.

## Automatic status

`src/lib/courseStatus.ts` is shared by the API, navigation, cards, detail headings, activity feed and filters. Structured start/end dates drive Upcoming → Ongoing → Completed. Draft and Archived remain explicit; Suspended projects remain suspended. Open-ended projects stay ongoing after their start date. A manually completed project with no end date remains completed because its finish date cannot be inferred.

Date-only boundaries use Asia/Kolkata. An end date includes that entire day. Date/time values without an explicit timezone also use Kolkata. Old free-text date descriptions cannot be interpreted reliably: enter structured start/end dates for automatic transitions.

Status is derived on reads, without rewriting content or running a production migration. `LifecycleClock` refreshes open views every 15 seconds and on tab focus/visibility changes. The public feed also refreshes in the background every minute and after successful content writes, so newly scheduled content can appear without a page reload. It does not replace editor data or clear unsaved drafts. Registration/payment availability remains separate from the activity lifecycle.

## Regression checks

Run `npm run lint`, `npm run build` and `npm test`.

The full database and browser checks deliberately require a disposable local MongoDB replica at `127.0.0.1:27019`. They reject Atlas. Each test run creates and drops a uniquely named QA database; production `codin` and development `test` are untouched.

```sh
# Start your separate local QA replica first; do not use the deployment database.
export QA_MONGODB_URI='mongodb://127.0.0.1:27019/?replicaSet=codinqa'
npm test
npx playwright install chromium
npm run test:browser
```

The replica set must be initialised with its member at `127.0.0.1:27019`. Playwright is a locked development dependency. Set `PLAYWRIGHT_BROWSERS_PATH` if browsers are installed in a non-default directory. `QA_SCREENSHOTS` optionally selects screenshot output; the default is `/tmp/codin-regression-review`.

The browser runner starts separate frontend/API processes, uses synthetic accounts and content, disables outbound side effects and blocks external browser requests. It checks desktop (1440px), phone (390px), tablet (768px) and the 200% desktop reflow equivalent (720 CSS pixels at 2× pixel density), animated rapid closing, menus, bibliography controls, workspace search/collapse, Atlas expansion and closing, direct section links/history, progressive reading, retained chapter filters, visible role-based actions, actual project/event/profile/centre form saves, recruitment form access, event support saves with retained drafts, single event credits, directory/content bounds, recoverable deletion, overview-to-LMS access, saved LMS notes/progress, save conflicts and resource publication. It cleans up its processes and QA database after success or failure.

External email, OAuth-provider exchange, payment providers, Cloudinary/Drive delivery and production deployment require their own integration environment; local checks do not validate those services.

### People and learning context adjustments

People directories share an explicit affiliation filter (staff, external collaborators, governance and unspecified profiles); missing affiliation is never inferred as employment. Complete portraits are presented in larger contained frames. A separate cover gallery reads the existing `bannerImages` field and its editor accepts multiple uploads through the existing media endpoint. The expandable biography stays beneath the name without an extra heading; research metrics sit above the notebook, whose first chapter is Publications. Loading and genuinely missing profiles have distinct states.

Event material links use the existing LMS route with a presentation-only `context=event` query. Both the workspace directory and the shared LMS controller retain that context across refresh and simulation controls; enrollment, payment, permissions and learning writes still use the original controller. Organisation logo links in At a Glance fall back to names when images fail. Confirmed-access promotional cards are removed while registration and pending approval/payment states remain.

### Activity desk and shared course overview

The desk defaults to Upcoming and Ongoing in chronological order. Published publications remain visible in the default update stream. Announcements remain independent records rather than overwriting their linked programme or project. Project views select related announcements, publications and events; directory records are not promoted into project updates. The landing diary fills its column and scrolls internally, and the active-project shelf has no three-record limit. Project catalogue cards now render as full-width rows. Multi-day event rows display both endpoint dates.

`coursePresentation.ts` normalises the public course overview as a `course_overview` chapter inside the existing `subPages` field. `CourseOverviewEditor` is reused in Events and Course editors for its heading, introduction, module titles/details and position. Existing custom sections retain their order; old title-only curricula provide a fallback. The existing revision and permission controller saves this field in the single course record, without replacing private LMS modules or materials. The public LMS fallback uses the same overview presentation while retaining its existing inline edit forms. Mentor rows resolve current profile photos by staff slug, profile URL or name from the refreshed public People data.

### Catalogue photos, Academy navigation and Centre credits

Events and Academy catalogues use photo rows while preserving date ranges, record URLs and controller-owned action slots. The Academy format links live in the narrower workspace sidebar, including Custom courses; the repeated main-page category navigation is removed. Partner credits share compact logo/name tiles, with existing roles and external links retained.

`partners.ts` derives Centre funders, collaborators and supporting organisations from published associated projects and programmes, including events linked through those projects. Duplicate names are merged without losing a logo or website. Header credits and At a Glance use the same derived groups; these are read-only projections and do not change stored Centre content.

### Event header and direct materials access

`EventHeading` presents date/status above the title, followed by the linked venue, compact partner credits, associated Centres and the action buttons. Registration opens the existing section and remains available independently of LMS admission.

The read-only `/api/courses/:slug/access` endpoint reuses the existing learning access policy without creating progress records. `useLearningAccess` hides materials actions while access is unavailable, and refreshes on registration changes and tab focus. The LMS waits for this decision on direct `learn=1` entry, preventing an intervening public overview. Existing forms, classroom controls, notes and permission enforcement remain in their controllers.
