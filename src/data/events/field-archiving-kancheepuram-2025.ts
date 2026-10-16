/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from './types.ts';

export const fieldArchivingKancheepuram2025: Event = {
  slug: "field-archiving-kancheepuram-2025",
  title: "Intensive Archiving Field Workshop: Recovery of Epigraphs and Folk Songs",
  type: "Workshop",
  dates: "November 03 - November 08, 2025",
  startDate: "2025-11-03",
  endDate: "2025-11-08",
  location: "Cultural Centre, Kancheepuram",
  description: "Hands-on training in photogrammetry, high-definition oral tradition recording, and digital sound systems.",
  longDescription: "This intensive field workshop focuses directly on on-site recovery of fading manuscript pages and community-hosted oral folk lyric recordings. Participants undergo professional training with specialized multispectral scanners, portable acoustic booths, and our custom Tholkudi open-access metadata framework.",
  image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1200",
  status: "Archived",
  associatedCentres: ["digital-preservation", "linguistic-cultural-diversity"],
  associatedPeople: ["karthick", "bornini"],
  associatedProjects: ["tholkudi", "suvadugal"],
  schedule: [
    { time: "Day 1, 09:00 AM", topic: "Acoustic Insulation in Rural & Forest Terrain", speaker: "Dr. Bornini Lahiri" },
    { time: "Day 2, 11:30 AM", topic: "Multispectral Manuscript Photography & Color Correction", speaker: "Karthick Ramanathan" }
  ],
  subPages: [
    {
      slug: "participation",
      title: "Call for Participation",
      icon: "UserCheck",
      type: "markdown",
      content: {
        teaser: "We are seeking applications from early career researchers, heritage museum archivists, and local conservation volunteers looking to master digital restoration.",
        markdown: `### Practical Syllabus Modules
- **Acoustic Ingestion**: Fieldwork audio diagnostics, noise elimination, and portable recording setups.
- **Multispectral Capture**: Restoring degraded copper plates and palm-leaf manuscripts using physical camera colorimetry.
- **Tholkudi Metadata Core**: Standardized documentation tags for physical relics, dialect recordings, and oral histories.

### Eligibility Criteria
Open to postgraduate students, scholars of archaeology, history, or linguistics, and regional grasswork volunteers. No prior coding experience required.`
      }
    },
    {
      slug: "timeline",
      title: "Timeline & Dates",
      icon: "CalendarRange",
      type: "dates",
      content: [
        { label: "Application Intake Launch", date: "August 10, 2025" },
        { label: "Application Submission Deadline", date: "September 15, 2025" },
        { label: "Selected Participants List Announced", date: "September 25, 2025" },
        { label: "Workshop Commencement", date: "November 03, 2025", highlighted: true }
      ]
    },
    {
      slug: "registration-details",
      title: "Registration Protocols",
      icon: "Award",
      type: "registration",
      content: {
        deadline: "September 15, 2025",
        buttonText: "N/A - Intake Completed",
        buttonLink: "#",
        fees: [
          { category: "Academic Scholars / Researchers", fee: "INR 1,500 (Subsidized)" },
          { category: "Government/Museum Delegated Officials", fee: "INR 4,000" },
          { category: "Local Community Custodians & Students", fee: "Complimentary" }
        ],
        instructions: [
          "Workshop registration carries full lodging boarding and scanning kits.",
          "Participants who successfully complete all 6 physical modules are awarded the Official Tholkudi Field Conservator Certificate."
        ]
      }
    },
    {
      slug: "participants",
      title: "Accepted Participant List",
      icon: "Milestone",
      type: "list",
      content: [
        { name: "Meenakshi Sundaram", role: "Graduate Fellow", affiliation: "University of Madras" },
        { name: "Anupam Goswami", role: "Lead Archivist", affiliation: "Assam Manuscripts Library" },
        { name: "Suresh Perumal", role: "Independent Epigrapher", affiliation: "Kancheepuram Heritage Collective" }
      ]
    },
    {
      slug: "venue-logistics",
      title: "Venue & Lodging",
      icon: "Compass",
      type: "logistics",
      content: {
        venue: "Cultural Centre Conference Enclave, Kancheepuram, Tamil Nadu",
        accommodation: "Hostel rooms are reserved at the Kancheepuram Devalaya Guest Enclave. Rates are covered by the subsidized registration option.",
        travel: "Kancheepuram is connected to Chennai Airport via NH-48 (roughly 2 hours ride). Heavy frequency bus service operates from CMBT Chennai.",
        visa: "Not applicable for national participants. International applicants must acquire an e-Visa through standard research channels."
      }
    },
    {
      slug: "organizer-committees",
      title: "Coordination Teams",
      icon: "ShieldAlert",
      type: "committees",
      content: [
        {
          name: "Field Coordination Board",
          members: [
            { name: "Karthick Ramanathan", role: "On-site Field Lead", affiliation: "Centre for Digital Preservation" },
            { name: "Dr. Bornini Lahiri", role: "Academic Advisor", affiliation: "CL-CD" }
          ]
        }
      ]
    },
    {
      slug: "help-desk",
      title: "Reach Out Liaison",
      icon: "Contact",
      type: "contact",
      content: [
        { name: "Kancheepuram Desk Team", designation: "On-site Help Center", email: "kanchi-workshop@codin.org.in" }
      ]
    }
  ]
};
