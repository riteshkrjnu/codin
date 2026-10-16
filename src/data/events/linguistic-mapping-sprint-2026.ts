/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from './types.ts';

export const linguisticMappingSprint2026: Event = {
  slug: "linguistic-mapping-sprint-2026",
  title: "Linguistic Mapping & Dialect Annotation Sprint (Spring 2026)",
  type: "Workshop",
  dates: "May 18 - May 28, 2026",
  location: "Centre for Diversity, Bengaluru",
  description: "An active hacking sprint standardising acoustic metadata profiles for minoritised communities in South India.",
  longDescription: "This collaborative, high-intensity sprint brings together active W2M annotation scholars and AI engineers to map phonetic boundaries. As part of Project Kailash, we are actively processing and clean-labelling over 120 hours of forest dialect recordings.",
  image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200",
  status: "Ongoing",
  associatedCentres: ["diversity-ai-nlp"],
  associatedPeople: ["ritesh", "bornini"],
  associatedProjects: ["kailash"],
  schedule: [
    { time: "09:00 AM", topic: "Daily Scrum & Annotation Diagnostics" },
    { time: "02:00 PM", topic: "Pair-wise Phonetic Labeling Diagnostics" },
    { time: "05:00 PM", topic: "Commit and Validation Checkpoint" }
  ],
  subPages: [
    {
      slug: "sprint-call",
      title: "Hacking Sprint Guidelines",
      icon: "Code",
      type: "markdown",
      content: {
        teaser: "Join us in Bengaluru or online as we accelerate the validation of low-resource dialect phonemes.",
        markdown: `### Active Annotation Targets
- **Toda & Kota Consonants**: Reviewing high-frequency spectral components.
- **Kadar Vowel Space Mapping**: Cleaning sound artifacts on 40 hours of forest recordings.
- **ELAN Timeline Splicing**: Merging community metadata into global foundation model templates.

### Participation Channels
Currently open to verified W2M Certified annotators and research scholars. Participation is hybrid.`
      }
    },
    {
      slug: "dates",
      title: "Sprint Milestones",
      icon: "Clock",
      type: "dates",
      content: [
        { label: "Warmup Sessions", date: "May 15, 2026" },
        { label: "Sprint Launch", date: "May 18, 2026", highlighted: true },
        { label: "Midway Peer Refinement Review", date: "May 23, 2026" },
        { label: "Sprint Wrapup & Archive Commit", date: "May 28, 2026" }
      ]
    },
    {
      slug: "registration",
      title: "Sprint Registration Desk",
      icon: "User",
      type: "registration",
      content: {
        deadline: "May 15, 2026",
        buttonText: "Active Participation",
        buttonLink: "mailto:sprint2026@codin.org.in?subject=Sprint Registration Query",
        fees: [
          { category: "Enrolled Academy Students", fee: "Complimentary" },
          { category: "Industry Contributors", fee: "INR 5,000" }
        ],
        instructions: [
          "Registration remains open for online contributors who already hold standard W2M credentials.",
          "On-site seats are strictly capped at 25 participants."
        ]
      }
    },
    {
      slug: "organizers",
      title: "Sprint Leads",
      icon: "Users",
      type: "committees",
      content: [
        {
          name: "Sprint Coordinators",
          members: [
            { name: "Ritesh Kumar", role: "Sprint Organizer", affiliation: "Centre for Diversity in AI & NLP" },
            { name: "Dr. Bornini Lahiri", role: "Linguistics Advisor", affiliation: "CoDIN" }
          ]
        }
      ]
    }
  ]
};
