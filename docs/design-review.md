# CoDIN: compare layouts by the problem they solve

## Refined direction: Connected Workspace → Section Atlas → combined reader

Open **`/designs/connected.html`** from the main design gallery. This is the refined direction combining the selected patterns; the earlier seven-way laboratory remains available for comparison.

- Every index—Centres, W2M Academy, Projects, People, Resources and Events—uses a Connected Workspace. Its full-height directory starts alongside the overview heading. Selecting a record collapses the directory into a reopenable rail. Directory searches, status filters and list scroll positions stay in memory while navigating records. Academy includes All, Online and Residential overview filters.
- Centre, event, course and project details start with Section Atlas. Opening a card expands into the combined Programme Desk / Open Notebook reader. Close or Escape returns to the Atlas, restoring focus to the opening card.
- Individual people and resources open directly as Notebooks. Their reading view uses the same contents navigation and At a glance card. The current resource snapshot is empty; its notebook renderer is tested with a browser-only fixture, not fabricated public content.
- The combined reader retains mounted sections, progressively mounts approaching sections and updates the active contents link, mobile selector and direct-link URL as the user scrolls. Direct section navigation mounts its target immediately. Search, publication filters and programme-day selections survive section navigation and reopening the reader. Print mounts all sections so the exported page is complete.
- At a glance stays on the right on desktop. Narrower layouts provide it as an expandable card above the reading column. The contents rail becomes a labelled section selector on smaller screens.
- **Open LMS** links to the existing `/academy/online/:slug` route, matching the event/residential material-entry handlers. Registration & access links to the current event/course overview. The preview does not read account tokens, query private participant status or reproduce access-granting logic. The existing app continues to check authentication, admission, payment, materials and organiser permissions. No `simulate` parameters are passed.

The refined mockup reuses the dated public snapshot and sanitised presentation adapters from the laboratory. Browsing it makes no API or write requests. Linked live-app actions intentionally leave the independent prototype and require the current app to be running. External images and fonts have the same text/image fallbacks as the laboratory.

```sh
./start.sh preview
# Open http://localhost:4173/designs/connected.html
export PATH="$PWD/.tools/node/bin:$PATH"
PLAYWRIGHT_BROWSERS_PATH=/tmp/codin-browsers node scripts/review-connected.mjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/codin-browsers node scripts/review-connected.mjs --export
```

The refined screenshot gallery, PDF and browser report are at `/designs/review/connected/`. Tests cover index/detail compositions at 390/768/1440px, full-height directory placement, collapse/reopening, search preservation, Atlas defaults, progressive mounting, scroll-spy updates, direct links/history, publication state, LMS URLs, motion/focus, resource notebooks and complete printing.

## Layout laboratory: current public records

Open **`/designs/compare.html?page=review`**, also linked from the main `/designs/` gallery. This independent review adds seven structures without replacing the existing concepts or Combined walkthrough:

| Direction | Main use |
| --- | --- |
| Vertical navigation | Predictable access to individual sections |
| Expanding cards | Section discovery followed by a full-page reading view |
| Programme desk | Events with dates, venue, registration and context close to the content |
| Open notebook | Continuous event chapters and project explanations |
| Section atlas | A section mosaic for events and research centres |
| Connected workspace | Search a people/centre directory alongside a selected record |
| Activity ledger | Actual dated project/centre feed entries alongside stable information |

Choose a page family, direction and record using the review controls. Switching direction preserves the record. **Hide review tools** shows the composition without the comparison toolbar. Browse-all views retain search/status controls, while expanded cards support section switching, direct links, history, Escape, focus restoration and reduced motion. Public participant/organiser selectors are explicitly simulated: they do not grant access or submit anything. Practice drafts and publication filters survive section switching in memory and reset on reload.

The new review uses `comparison-data.json`, captured from the unauthenticated public APIs at `http://localhost:3000/` on 20 October 2026. The provenance disclosure contains the exact capture time and per-endpoint counts/errors. It is an observed content snapshot, not independently verified factual content. Presentation fields are allowlisted; no database connection, account tokens, participant-management endpoints, private course modules or payment gateway configuration are used. The snapshot keeps this review independent of the running app. Remote images/fonts need network access; missing images retain text/initial fallbacks.

The principal event is **Voices & Traditions: Knowing Andamans through Language & Culture**. Its published map, ten custom sections, collaborators and sponsors are retained. People, projects and centres use the same current records across their alternatives. The resource API returned no records, so the resource composition is an explicitly empty library. About statements are labelled as repository content. Classroom previews use the public outline and do not reproduce private materials or learner progress. Activity-feed update dates are labelled as record updates rather than invented milestones.

Recommended starting points: Programme desk for Events; Connected workspace for People; Open notebook for Projects; Section atlas for Centres. Ledger views are useful only where dated updates exist. Academy, classroom, resources, About and custom learning have companion compositions in the page-family selector.

Run the independent server with `./start.sh preview`. Refresh the snapshot only when the local app is running:

```sh
export PATH="$PWD/.tools/node/bin:$PATH"
node scripts/design-review-snapshot.mjs --source http://localhost:3000
PLAYWRIGHT_BROWSERS_PATH=/tmp/codin-browsers node scripts/review-layouts.mjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/codin-browsers node scripts/review-layouts.mjs --export
```

Set `PLAYWRIGHT_BROWSERS_PATH` to your browser installation, or omit it for Playwright's default location. Set `DESIGN_REVIEW_URL` when preview uses a port other than 4173. The browser script never starts the app or connects to MongoDB. `--export` writes desktop/tablet/phone screenshots, an artifact index, a browser report and `review/layout-laboratory.pdf`. Find all artifacts through **All screenshots** in the laboratory review index.

Checks cover responsive compositions, every available public record/section, partner/map links, record continuity, publication/directory filtering, draft/day preservation, history, refresh, keyboard focus, interrupted animation, unavailable images, unsafe content, sparse records and many partners. No API requests or write requests are permitted during independent browsing. These checks validate prototypes, not production payments, account permissions or LMS transactions.

---

Open `/designs/` for all seven directions and the combined direction’s full-site walkthrough. The original Journal, Institute and Atlas concepts remain as visual references. Options 04–06 are new structures, with the same typography and restrained palette so the layout differences can be assessed directly.

| Question | 04 — CoDIN Now | 05 — Project Observatory | 06 — CoDIN Open House |
| --- | --- | --- | --- |
| What comes first? | A dated lead story and upcoming opportunities | Project stages, recent movement and next steps | Doorways into learning, fieldwork, archives and technology |
| What replaces the large introductory hero? | A compact newsroom masthead | A compact workspace heading and navigation sidebar | A compact welcome above a mosaic of activities |
| How do I see current work? | Filter the chronological activity desk | Filter work stages; switch board/list; open a project summary | Browse the diary and choose an activity room |
| What does a project become? | An editorial story with timeline and context rail | A work log with output/context tabs and a persistent summary | An explorable room with progressive disclosure |
| What does learning become? | A lesson feature with an edition-like course index | A three-column workspace: outline, lesson, resources | A session plan opening into a classroom |
| Strongest fit | First-time visitors who need to see activity immediately | Researchers and partners following progress | Learners and collaborators looking for a way to participate |

## Suggested direction

**CoDIN Now is the strongest starting point for the homepage problem described.** It answers “what are you doing?” with dated work, and “how do I join?” with nearby opportunities. A finished report remains in the activity desk rather than disappearing when its event ends.

The Observatory project detail can be combined with that homepage if the team prefers its work-log structure. Open House is a separate alternative when participation and learning should be the primary entrance. The previews are deliberately separate choices; no full-site redesign has been applied.

## A small publishing workflow that keeps the site current

The proposed production content structure for whichever layout is selected:

1. An editor publishes **one dated update**, with a project/centre association, a brief account of what happened and an optional photo/resource link. An update can describe fieldwork, a research milestone, a published output or learning activity.
2. That update appears in the homepage's activity area, its project log and the associated centre. The existing shared activity feed and project/centre activity components provide part of this foundation; free-form editorial work logs and lead-story selection would be added when implementing the chosen layout.
3. An event or opportunity includes structured dates and an expiry. The date policy maintains upcoming/ongoing/completed consistently. Event expiry removes the registration invitation; it does not erase the record or its report.
4. A completed activity prompts a short outcome/report. Editors can link it to the same project; the latest substantive update becomes the new lead when an older lead expires.
5. When nothing is scheduled, the homepage shows the latest dated work and outputs, with an honest date. It does not fabricate “live” activity or reset the date to make a page appear fresh.

The previews demonstrate that hierarchy using fixed fixtures. Their dates, stages, work-log entries and courses are illustrative, visibly labelled and never read from or written to Atlas. They are not claims about CoDIN's current operations.

## Team review tasks

- At desktop width, look for a dated activity and a participation opportunity before scrolling.
- Use each interaction: newsroom category filters; Observatory board/list, stage filter and summary dialog; Open House diary and room selectors.
- Open each project page. Decide whether a story, work log or room better explains the process behind CoDIN's work.
- Open the learning screen. Switch lessons, write a practice note, switch away/back and mark a lesson complete. Notes remain only while the page is open.
- Repeat at mobile width. Avoid choosing purely from the colours: all three new options intentionally share the palette and fonts.
- Download the new comparison PDF and desktop/mobile images from the gallery for team discussion.

## 07 — Combined Open House + Now

Open `/designs/combined.html`. This combines the user's preferred card mosaic with multimedia: a large photo story, a playable demonstration video, an audio update with transcript, and a research note. The right rail keeps the open diary and the invitation “Curiosity can be a beginning.”

Below the mosaic, **Stay close to the work** starts with a distinct W2M Academy learning invitation, followed by the three project records. Each project links to its latest example updates; the W2M shortcut selects academy activity. These are navigation, not subscriptions. The activity desk combines area tabs with a compact lifecycle selector. Open House's closing **“Make a connection. Start something together.”** section is preserved.

A collapsible review note explains the proposed slot-selection rules. This is still a fixture-only mockup: feature expiry, category selection and live updating are not connected to the backend. Media is labelled; the video is an original motion-graphic demo and the audio is synthetic narration. Playback requires a visitor action, and captions/transcripts are available. No video or audio autoplays.

Screenshots and `combined-mockup.pdf` are available through the gallery and page footer. The previous six options remain available.

### Learning, projects and a quieter activity desk

The multimedia mosaic remains the first feature after the masthead. Open Diary contains upcoming activities only; the extra three ongoing rows have been removed. **Curiosity can be a beginning** remains directly below it.

**Stay close to the work** has four cards: first a dark W2M Academy invitation, “Learn in good company,” with a different structure and learning links; then Tholkudi, Project Kailash and Suvadugal with their latest updates. The layout uses four columns on desktop, two on tablet and one on mobile.

The activity desk's primary tabs are All activities, W2M Academy, Projects, Events and Resources & publications. A small **Show** dropdown beside the result count replaces the second row of chips. It offers Ongoing, Upcoming, Archived and All activities, with counts scoped to the current area/project. On entry and when choosing an area/project, Ongoing is selected if eligible entries exist; otherwise Upcoming is selected. An explicit status choice is respected even if empty. Upcoming items sort by the soonest date; other views show newest first. Archiving is explicit, and an old update on a running project remains ongoing.

**Resources & publications** is a separate reusable library. Its fixtures cover blogs, white papers, project reports, datasets, models and toolkits. It hides the lifecycle selector because these resources are available rather than ongoing events. Detail previews disclose that no actual resource download is attached. Real resource records should include authors, version, licence, citation and the appropriate full text or repository link. These remain illustrative fixtures, not new production resources or live lifecycle calculations.

Detail transitions animate a separate panel surface from the clicked source, while the content fades in at its natural size. Closing reverses the surface movement and fades the source back in. Text, photographs and video controls are never scaled. Escape, backdrop clicks, rapid close during opening, focus restoration and reduced-motion preferences are supported. The backdrop uses a simple colour fade rather than animating an expensive blur.


## Full-site Open House + Now walkthrough

Open `/designs/explore.html?page=review`, or use the main navigation from the combined landing page. The walkthrough has 14 page types plus its review index. The navigation, typography, colours, dated work and resource treatments follow the approved homepage direction; each page has a layout suited to its job.

| Page | What to review |
| --- | --- |
| W2M Academy | Learning-led introduction, online/residential filters, course cards and a route to custom learning |
| Course overview | Status and dates, outcomes, syllabus, practical details and a classroom preview |
| Classroom | Module navigation, reading/video, captions, practice notes, completion and related materials |
| Centres | Three research homes from the existing repository, with associated project links |
| Centre detail | Research questions, connected projects, dated work and relevant resources; all three centres have variants |
| Events | Ongoing-first listing, status dropdown, upcoming diary and date/time clarity |
| Event detail | Programme, practical details and a participation preview; archived events offer resources instead of registration |
| Projects | Project records, lifecycle filtering and latest work |
| Project detail | Question, dated work log, approach, next step, centre association and reusable resources; all three projects have variants |
| Resources & publications | Search by title/topic and filter by format |
| Resource detail | Reading/documentation layout plus authorship, version, licence, access and citation expectations |
| About | Purpose, ways of working and routes into centres, learning and people |
| People & governance | Directory and profile/governance dialogs; names follow the repository, biographies and appointments remain placeholders |
| Custom learning | Context, learning question, format and an email inquiry route |

The classroom retains notes and progress in memory while switching lessons, and resets them on reload. It never saves to a user account. Programme dates, work logs and resource records are illustrative. The public course preview does not bypass actual LMS permissions because it does not load LMS content. Registration, joining links, fees and downloads are not connected. Resource examples assert no licence or actual publication.

Desktop/mobile images are in `public/designs/review/pages/`. The walkthrough links `review/site-walkthrough.pdf` for team discussion, and every screen has a Print this page action. Review a centre → project → resource journey and an academy → course → classroom journey, rather than assessing only isolated screenshots.

These files are a design review surface. The next implementation phase can port the agreed layouts into the existing React components while retaining public routes, permissions, content revision handling and existing enrolments. No live-site deployment or production data change is part of this preview.
