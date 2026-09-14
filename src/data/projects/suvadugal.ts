/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from './types';

export const suvadugal: Project = {
  slug: "suvadugal",
  id: "PROJ-TN-02",
  title: "Suvadugal",
  tag: "Government Funded",
  description: "Supported by the Govt of Tamil Nadu. Documentation and archiving of cultural heritage, using advanced digital tools to map history to the future.",
  longDescription: "Suvadugal focuses on the 'tracks' left by history. This project, funded by the Government of Tamil Nadu, specializes in the archival documentation of cultural heritage sites and artifacts. Using high-resolution scanning and localized research, we are building a robust digital repository that maps historical data to the future needs of historians, urban planners, and the public.",
  methodology: "Utilizing photogrammetry and high-fidelity audio-visual recording to capture heritage sites in their current state, combined with historical context provided by community elders.",
  impact: [
    "Preserved metadata for 500+ heritage artifacts.",
    "Interactive digital mapping of historical sites.",
    "Public-facing education modules integrated into state schools."
  ],
  aims: ["Heritage Mapping", "Digital Preservation", "Cultural Data"],
  color: "bg-brand-orange",
  status: "Upcoming",
  image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1200",
  relatedLinks: [
    { name: "Artifact Metadata Catalog", url: "https://archives.diversity.org.in/suvadugal" }
  ],
  associatedCentres: ["linguistic-cultural-diversity", "digital-preservation"],
  projectDirectors: ["karthick"],
  projectStaffs: [
    "Nithya S. (Senior Content & Metadata Architect)",
    "Ramakrishnan G. (Oral Tradition Recording Coordinator)",
    "Deepa V. (Archival Photogrammetry Associate)"
  ],
  fundingAgency: "Department of Culture, Government of Tamil Nadu",
  year: "2026",
  startDate: "2026-08-01",
  endDate: "2030-01-01",
  keywords: ["Artifacts", "Photogrammetry", "Mapping", "Metadata", "Tamil Nadu"],
  subPages: [
    {
      slug: "scanning-protocols",
      title: "Photogrammetry Specs",
      icon: "Code",
      type: "markdown",
      content: {
        teaser: "Standard operating specs for 3D digital archival twin generation.",
        markdown: "Suvadugal field missions utilize 120-megapixel stereo cameras pairing cross-polarized rings to eliminate specular soil shine on ancient palm leaves. Mesh decimation is locked at 2M polygons raw with 8K texture wraps mapped to international Dublin Core metadata schemas."
      }
    }
  ]
};
