/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from './types';

export const tholkudi: Project = {
  slug: "tholkudi",
  id: "PROJ-TN-01",
  title: "Tholkudi",
  tag: "Government Funded",
  description: "A government-supported language and cultural documentation initiative focused on preserving the linguistic, oral, ecological, and cultural heritage of Tamil Nadu’s Scheduled Tribe communities through digital archiving, field documentation, and public access systems. The project contributes to safeguarding intangible cultural heritage through community-centered archival and documentation practices.",
  longDescription: "Tholkudi is a large-scale language and cultural documentation initiative supported by the Government of Tamil Nadu and developed to document, preserve, and improve long-term access to the linguistic and cultural heritage of Scheduled Tribe communities across Tamil Nadu.\n\nThe project brings together language documentation, oral traditions, folklore, ecological knowledge, songs, narratives, ritual practices, material culture, and community histories into a structured digital archival environment intended for long-term preservation and public accessibility.<br><br>Karthick Narayanan served as consultant for language documentation and played a major role in shaping the archive’s documentation architecture, metadata approach, multilingual archival structure, and broader conceptual direction. His work contributed substantially to the development of the archive’s documentation workflows and approaches to representing linguistic and cultural knowledge within a digital archival system.\n\nIn continuation of this work, the Council for Diversity and Innovation (CoDIN) was later entrusted with implementing a user-centered redesign and accessibility-oriented archival interface for the repository. This phase focused on improving discoverability, metadata navigation, browsing systems, multilingual accessibility, mobile responsiveness, and overall public usability of archival collections.<br><br>The redesign process emphasized practical archival usability for researchers, students, educators, government stakeholders, and community members while maintaining compatibility with long-term digital preservation standards.<br><br>The project combines field documentation, digital humanities approaches, metadata-driven archival systems, and participatory methods of cultural preservation. Particular emphasis is placed on ensuring that archival representation remains context-sensitive, community-informed, and publicly accessible.<br><br>Rather than functioning solely as a storage repository, Tholkudi is envisioned as a living cultural knowledge platform supporting research, education, cultural continuity, public engagement, and future heritage preservation initiatives related to Tamil Nadu’s indigenous and tribal communities.",
  methodology: "The project follows a field-based and archival-centered documentation methodology combining ethnographic fieldwork, oral history collection, audiovisual recording, metadata creation, transcription, cataloguing, and digital preservation workflows.<br><br>Documentation activities include recording oral traditions, linguistic practices, folklore, ecological knowledge, songs, narratives, and cultural practices from communities across Tamil Nadu. The archival infrastructure integrates multilingual metadata systems, structured browsing frameworks, and user-centered design principles to improve accessibility and discoverability.<br><br>The later redesign and implementation phase carried out by the Council for Diversity and Innovation focused on improving archival usability through multilingual interfaces, mobile-responsive design, metadata-driven discovery systems, structured browsing environments, and public-facing archival navigation tools.",
  impact: [
     "Documentation and preservation of linguistic and cultural heritage associated with Scheduled Tribe communities in Tamil Nadu.",
    "Creation of a publicly accessible digital archive for language and cultural materials.",
    "Development of multilingual and metadata-rich archival systems for cultural preservation.",
    "Improved usability and discoverability of archival collections through user-centered interface redesign.",
    "Strengthening long-term digital preservation infrastructure for cultural heritage materials.",
    "Contribution to safeguarding intangible cultural heritage through digital documentation and archival accessibility."
  ],
  aims: ["Language Documentation",
    "Digital Archiving",
    "Cultural Preservation",
    "Community-Centered Documentation",
    "Metadata and Knowledge Systems",
    "User-Centered Archive Design",
    "Public Access to Cultural Heritage",
    "Safeguarding Intangible Cultural Heritage"
],
  color: "bg-brand-blue",
  status: "Ongoing",
  image: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?auto=format&fit=crop&q=80&w=1200",
  relatedLinks: [
    { name: "Govt of Tamil Nadu Cultural Dept", url: "https://www.tn.gov.in/department/3" },
    { name: "Tamil Digital Library Partner", url: "https://www.tamildigitallibrary.in" }
  ],
  associatedCentres: ["digital-preservation"],
  projectDirectors: ["karthick"],
  projectStaffs: [
    "Sangeetha P. (Senior Ethno-Linguistic Field Researcher)",
    "Muthuvelan K. (Lead GIS Cartographer & Artifact Digitizer)",
    "Abhishek R. (Digital Archival Specialist & Metadata Curator)"
  ],
  fundingAgency: "Adi Dravidar and Tribal Welfare Department, Government of Tamil Nadu",
  year: "2021",
  startDate: "2021-01-01",
  endDate: "2025-01-01",
  keywords: ["Digital Archiving", "Indigenous", "Culture", "Tamil Nadu", "Heritage"],
  subPages: [
    {
      slug: "methodology",
      title: "Methodology",
      icon: "BookOpen",
      type: "list",
      content: [
        { name: "Irula Customary Marriage Songs", role: "14 Recordings Archived", affiliation: "Anaikatti Cluster" },
        { name: "Kurumba Honey Harvest Narratives", role: "08 Narratives (Transcribed)", affiliation: "Attappadi Slopes" },
        { name: "Kota Metallic Tool Work Vocabularies", role: "Compiling Lexicon", affiliation: "Trichigadi Settlement" }
      ]
    },
    {
      slug: "collaborators",
      title: "Collaborators",
      icon: "BookOpen",
      type: "list",
      content: [
        { name: "Tribal Research Centre", role: "Institutional Collaborator", affiliation: "" },
        { name: "Madras School of Social Work", role: "Institutional Collaborator", affiliation: "" },
        { name: "Centre for Social Justice and Equity", role: "Institutional Collaborator", affiliation: "" }
      ]
    }
  ]
};
