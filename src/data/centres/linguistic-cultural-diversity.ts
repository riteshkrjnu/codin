/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Centre } from './types.ts';

export const linguisticCulturalDiversity: Centre = {
  slug: "linguistic-cultural-diversity",
  name: "Centre for Linguistic and Cultural Diversity",
  shortName: "CL-CD",
  tagline: "Uncovering deep grammatical patterns and folk traditions through field research.",
  description: "The Centre for Linguistic and Cultural Diversity conducts baseline documentation surveys mapping standard typological traits, grammatical patterns, folk songs, and culinary traditions across regional communities. We study how cultural environments directly shape linguistic structures.",
  image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=1200",
  aims: [
    "Carry out comprehensive linguistic map-making of under-documented South Asian regions.",
    "Publish intensive dictionaries and reference grammars detailing endangered idioms.",
    "Document the ethno-linguistic context behind oral folk narratives."
  ],
  projects: ["suvadugal"],
  people: ["karthick"],
  courses: ["field-linguistics-101", "field-methods-june-2024"],
  publications: [
    {
      title: "Phonological Mapping of Scheduled Tribes in Western Ghats",
      authors: "Dr. Bornini Lahiri",
      journal: "Linguistic Documentation and Conservation Quarterly",
      year: "2025"
    },
    {
      title: "Syntactic Parallels across South Indian Folk Songs",
      authors: "Karthick Ramanathan, Dr. Bornini Lahiri",
      journal: "Ethnomusicology and Linguistics Archive",
      year: "2024"
    }
  ],
  relevantCards: [
    {
      title: "Grammar Catalog Workspace",
      description: "Interactive tools analyzing structural alignment and verb conjugation structures in low-resource syntax."
    },
    {
      title: "Folk Lyric Repository",
      description: "A continuous historical compilation matching transcripts to verified performance melodies."
    }
  ]
};
