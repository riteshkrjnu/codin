/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person } from './types.ts';

export const R_Karthick_Narayanan: Person = {
  slug: "karthick",
  name: "R Karthick Narayanan",
  fullName: "R Karthick Narayanan",
  role: "Co-founder and Director",
  email: "karthick@diversity.org.in",
  image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
  bio: "Karthick is an archival scientist and specialist in historical media recovery. He designs digital replication protocols, high-fidelity metadata frameworks, and photogrammetric pipelines for our heritage preservation programs. Over the past decade, he has collaborated with archaeological trusts and State archives to design robust, community-accessible digital vaults.",
  education: [
    {
      degree: "M.Sc. in Archaeological Science",
      institution: "Madras University",
      year: "2015"
    },
    {
      degree: "B.Sc. in History & Material Conservation",
      institution: "Loyola College, Chennai",
      year: "2013"
    }
  ],
  experience: [
    {
      role: "Lead Archival Scientist",
      organization: "Council for Diversity and Innovation",
      period: "2022 - Present",
      description: "Managing photogrammetry capture campaigns, heritage data schemas alignment, and high-fidelity physical manuscript stabilization methods."
    },
    {
      role: "Digital Preservation Consult",
      organization: "Historic Restorations Archive",
      period: "2016 - 2022",
      description: "Consulted on historical media restoration, digitization of high-acid paper prints, and structural metadata compilation."
    }
  ],
  publications: [
    "Metadata Standards for Oral Traditions: The Tholkudi Archival Framework (2025)",
    "Ethical Lifespans of Community-Sourced Cultural Artifact Metadata (2024)"
  ],
  researchInterests: ["Archival Science", "Heritage Preservation", "Photogrammetry", "Metadata Standards"],
  centres: ["digital-preservation", "linguistic-cultural-diversity"],
  socials: {
    linkedin: "https://linkedin.com/in/karthick-ramanathan-mock",
    website: "https://karthick.diversity.org.in"
  },
  otherSections: [
    {
      title: "Archival Field Gear & Setup",
      content: [
        "Calibrated multispectral imagers, photogrammetric turntables, and phase-one backing sensors.",
        "Experienced in handling delicate ancient palm-leaf manuscripts and non-rigid historical fibers."
      ]
    }
  ]
};
