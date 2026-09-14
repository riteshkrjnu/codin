/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from './types';

export const w2mResidentialOoty2025: Event = {
  slug: "w2m-residential-ooty-2025",
  title: "W2M Intensive Field Methods Residency (Spring Cohort)",
  type: "W2M Residential Course",
  dates: "March 18 - March 25, 2025",
  startDate: "2025-03-18",
  endDate: "2025-03-25",
  location: "Nilgiris Field Station, Ooty",
  description: "Immersive field linguistic course mapping phonological frameworks of Nilgiris' tribal societies.",
  longDescription: "Part of the flagship W2M Academy core program, this residential session deploys selected fellows directly within Toda and Kota tribal villages. Over 7 days of structured fieldwork, fellows learn non-intrusive metadata registration, speech annotation in ELAN, and respectful community integration strategies under direct expert guidance.",
  image: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?auto=format&fit=crop&q=80&w=1200",
  status: "Archived",
  associatedCentres: ["linguistic-cultural-diversity", "digital-preservation"],
  associatedPeople: ["karthick", "bornini"],
  associatedProjects: ["tholkudi"],
  schedule: [
    { time: "Day 1, 10:00 AM", topic: "Field Ethics & Communal Consent Protocols" },
    { time: "Day 3, 02:00 PM", topic: "ELAN Annotation Pipelines & Granular Time Alignment" },
    { time: "Day 6, 09:30 AM", topic: "Archival Metadata Submission to Local Repositories", speaker: "Karthick Ramanathan" }
  ],
  subPages: [
    {
      slug: "overview",
      title: "Call for Participation",
      icon: "Atom",
      type: "markdown",
      content: {
        teaser: "W2M Academy announces its residency cohort fellowship, deploying trainees to catalog syntax variations in the Nilgiris highlands.",
        markdown: `### Residency Focus Areas
- **Community Protocols**: Acquiring informed consent, community-owned licensing, and dialect boundary surveying.
- **Phonological Field Annotation**: Multi-track recording of native speaker narratives using state-of-the-art acoustic captures.
- **Metadata Register Splicing**: Splicing transcribed recordings into ELAN time-aligned templates for regional archive integration.

### Selection Fellowship
We support 15 Fully-Funded fellowships covering travel, lodging, boarding, and regional village guide expenditures.`
      }
    },
    {
      slug: "dates",
      title: "Key Residency Gates",
      icon: "Calendar",
      type: "dates",
      content: [
        { label: "Fellowship Nominations Open", date: "December 01, 2024" },
        { label: "Application Gateway Closes", date: "January 15, 2025" },
        { label: "Interviews & Final Invites Issued", date: "February 10, 2025" },
        { label: "Cohort Deploys on Site", date: "March 18, 2025", highlighted: true }
      ]
    },
    {
      slug: "residential-registration",
      title: "Registration Details",
      icon: "Inbox",
      type: "registration",
      content: {
        deadline: "February 15, 2025",
        buttonText: "Residency Concluded",
        buttonLink: "#",
        fees: [
          { category: "Selected Academic Fellows", fee: "Fully Funded (INR 0)" },
          { category: "Sponsored External Delegates", fee: "INR 15,000" }
        ],
        instructions: [
          "Fellowship funding is restricted to accepted candidates who possess a letter from CoDIN Academic Registrar.",
          "All registrations include dormitory accommodation at Nilgiris Field Station, shared meals, and field travel."
        ]
      }
    },
    {
      slug: "accepted-fellows",
      title: "Fellows Cohort List",
      icon: "ShieldCheck",
      type: "list",
      content: [
        { name: "Dr. Arundhati Roy Choudhury", role: "Fellow", affiliation: "Jawaharlal Nehru University" },
        { name: "Siddharth Karthikeyan", role: "Graduate Fellow", affiliation: "Bharathiar University" },
        { name: "Kundan Kumar Singh", role: "Research Assistant", affiliation: "IIT Kharagpur" }
      ]
    },
    {
      slug: "station-logistics",
      title: "Nilgiris Field Station Guide",
      icon: "Map",
      type: "logistics",
      content: {
        venue: "CoDIN Nilgiris Field Hub, Doddabetta Foothills, Ooty, Tamil Nadu",
        accommodation: "Fellows are housed in double-sharing rooms at Doddabetta Field Enclave. Linen, warm clothing, and umbrellas are mandatory.",
        travel: "Reach Ooty via Coimbatore International Airport (SBT) followed by a scenic 3-hour cab ride or local mountain railway. Pickups are scheduled for March 17 at airport.",
        visa: "Not applicable."
      }
    },
    {
      slug: "organizers",
      title: "Residency Directors",
      icon: "Award",
      type: "committees",
      content: [
        {
          name: "Academic Advisory Panel",
          members: [
            { name: "Dr. Bornini Lahiri", role: "Senior Scholar & Evaluator", affiliation: "CoDIN" },
            { name: "Karthick Ramanathan", role: "Archiving Co-chair", affiliation: "CDP" }
          ]
        }
      ]
    },
    {
      slug: "residency-office",
      title: "Direct Connect",
      icon: "Mail",
      type: "contact",
      content: [
        { name: "W2M Registrar Office", designation: "Ooty Enclave Admin", email: "ooty-residency@codin.org.in" }
      ]
    }
  ]
};
