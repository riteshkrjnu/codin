# Scheduled participation buttons

Events and W2M courses share a participation policy in `src/lib/participation.ts` and `src/site/eventParticipation.ts`. The layout receives resolved actions; controllers retain enrollment, login, payment, and LMS handlers.

In **Event editor → Admissions & Fees → Deadlines, phases & buttons**, or the **Admin Course editor**, add a phase with a title, start and/or end date, and one or more buttons. Select each button's label, action, audience, and destination. Registration/payment buttons without a destination open the existing registration chapter. The online course registration card continues into its existing enrollment flow. Materials buttons always use the existing protected LMS destination.

For example, an abstract phase can end on 20 October, followed by a registration phase starting on 21 October. Submission buttons require their portal URL. A registration button can target unregistered visitors; a payment button can target accepted participants. Separate overlapping phases can expose several relevant actions. The editor includes a date and participant preview. No actual event dates or links are guessed or migrated from prose.

Date-only boundaries use IST: start dates begin at 00:00 and end dates include 23:59:59.999. Phase changes update while a page remains open, and enrollment status refreshes when returning to the tab. Existing prose deadline chapters remain unchanged; configure phases explicitly to schedule their buttons.

Eligibility is applied in addition to phase dates:

- Registration and payment actions disappear after payment confirmation.
- Payment actions require a record in the accepted list and an open applicable phase. A personal payment deadline or the shared payment deadline can shorten that window.
- Closing public registration does not prevent accepted participants from paying within their applicable phase and assigned deadline.
- A phase, audience selection, or display preview never grants materials access. Existing server checks still require approved admission and confirmed payment, or existing staff permissions.
- Paid participants awaiting admission see the review status. Unpaid participants past their deadline cannot pay or self-enroll for materials through the API.
- Confirmed paid access remains available when registration ends. Configured materials button labels apply while their phase is active; the standard materials/LMS action remains available afterwards.

With no phases, legacy configured submission buttons and enrollment behavior remain available. Existing explicit payment deadlines still apply. Clearing every phase restores this mode. Changes use the existing versioned save and permissions system; both course and event projections retain the same settings.

Verification: `npm test` covers date boundaries, audiences, multiple buttons, eligibility and server enforcement (API checks require the isolated `QA_MONGODB_URI`). `node tests/participation-browser.mjs` checks desktop/mobile phase transitions, participant states, direct LMS entry, and both editors against that isolated database.
