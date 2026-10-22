/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Centre } from './types.ts';

export const digitalPreservation: Centre = {
  slug: "digital-preservation",
  name: "Centre for Digital Preservation of Linguistic and Cultural Heritage",
  shortName: "CDP-LCH",
  tagline: "Safeguarding delicate oral histories and physical records through digital vaults.",
  description: "Our Digital Preservation Centre addresses the urgent threat behind the loss of indigenous records and oral traditions. We deploy localized high-granularity media systems, field-recording standard kits, and custom metadata catalog systems to build durable cultural archives.",
  image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=1200",
  aims: [
    "Digitize precious manuscripts, palm-leaf archives, and community heirlooms.",
    "Produce interactive sound vaults detailing tribal narratives and oral histories.",
    "Empower localized communities with low-cost archiving devices and workflows."
  ],
  projects: ["tholkudi", "suvadugal"],
  people: ["karthick", "bornini"],
  courses: ["data-annotation-mastery", "field-methods-oct-2024"],
  publications: [
    {
      title: "Metadata Standards for Oral Traditions: The Tholkudi Archival Framework",
      authors: "Karthick Ramanathan, Dr. Bornini Lahiri",
      journal: "International Journal of Archival Science and Digital Humanities",
      year: "2025"
    },
    {
      title: "Ethical Lifespans of Community-Sourced Cultural Artifact Metadata",
      authors: "Karthick Ramanathan",
      journal: "Cultural Informatics Review",
      year: "2024"
    }
  ],
  relevantCards: [
    {
      title: "Media Ingestion Hubs",
      description: "Equipped with localized multi-spectral scanners to recover faded manuscript pages on-site."
    },
    {
      title: "Sound Vault Storage",
      description: "Redundant offline storage networks managed directly in community clusters to maintain intellectual property."
    }
  ],
  subPages: [
    {
      slug: "manuscript-salvaging",
      title: "Field Salvage Kit",
      icon: "ShieldCheck",
      type: "markdown",
      content: {
        teaser: "Standard field deployment equipment for wet/dry climate regions.",
        markdown: "LCH teams carry portable vacuum sealers, moisture absorbent cartridges, and low-wattage ultra-violet preservation chambers. In emergencies (floods, building collapses), we establish quick restoration tents in coordinate points."
      }
    }
  ]
};
