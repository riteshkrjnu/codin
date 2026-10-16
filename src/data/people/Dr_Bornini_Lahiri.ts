/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person } from './types.ts';

export const Dr_Bornini_Lahiri: Person = {
  slug: "bornini",
  name: "Dr. Bornini Lahiri",
  fullName: "Dr. Bornini Lahiri",
  role: "Co-founder and Lead - Centre for Linguistic and Cultural Diversity",
  email: "bornini@diversity.org.in",
  image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
  bio: "Dr. Lahiri is a prominent field linguist specialized in South Asian minority languages and phonetic transcriptions. She leads the linguistic fieldwork protocols at CoDIN, bridging organic vernacular documentation with robust machine learning pipelines. Formerly a research fellow with government-funded archiving projects, her work ensures community-first ethical standards in data collection.",
  education: [
    {
      degree: "Ph.D. in Linguistics",
      institution: "Jawaharlal Nehru University",
      year: "2018"
    },
    {
      degree: "M.A. in Linguistics",
      institution: "University of Calcutta",
      year: "2013"
    }
  ],
  experience: [
    {
      role: "Linguistic Research Lead",
      organization: "Council for Diversity and Innovation (CoDIN)",
      period: "2021 - Present",
      description: "Spearheading field data-collection paradigms, transcription efforts, and linguistic alignment with speech and machine learning frameworks."
    },
    {
      role: "Postdoctoral Research Fellow",
      organization: "State Linguistics Institute",
      period: "2019 - 2021",
      description: "Investigated low-resource Dravidian languages and acoustic phonetic transcriptions."
    }
  ],
  publications: [
    "Adapting Speech Foundations for Highly Low-Resource Tribal Dialects (2025)",
    "Metadata Standards for Oral Traditions: The Tholkudi Archival Framework (2025)",
    "Phonological Mapping of Scheduled Tribes in Western Ghats (2025)"
  ],
  researchInterests: ["Acoustic Phonetics", "Field Linguistics", "Low-resource Languages", "Dravidian Studies"],
  centres: ["diversity-ai-nlp", "digital-preservation"],
  socials: {
    linkedin: "https://linkedin.com/in/borninilahiri-mock",
    website: "https://bornini-lahiri.diversity.org.in"
  },
  otherSections: [
    {
      title: "Research Fellowships & Grants",
      content: [
        "Recipient of the National Archival Grant for South Indian Dialects (2023)",
        "JNU Distinguished Young Scholar Fellowship (2016)"
      ]
    }
  ]
};
