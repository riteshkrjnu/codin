/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProjectSubPage {
  slug: string;
  title: string;
  icon?: string; // Lucide icon identifier
  type: 'markdown' | 'dates' | 'list' | 'logistics' | 'contact' | 'custom' | 'files';
  content: any; // Type-specific content structure
}

export interface RelatedLink {
  name: string;
  url: string;
}

export interface ProjectPartnerAgency {
  name: string;
  website?: string;
  logo?: string;
  role?: string;
}

export interface ProjectCollaborator {
  name: string;
  website?: string;
  logo?: string;
  role?: string;
}

export interface Project {
  slug: string;
  id: string; // e.g., "PROJ-001"
  title: string;
  tag: string;
  description: string;
  longDescription: string;
  methodology: string;
  impact: string[];
  aims: string[];
  color: string; // e.g., "bg-brand-acid"
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Suspended'; // needed for status filtering
  image: string;
  relatedLinks?: RelatedLink[];
  associatedCentres: string[];
  projectDirectors: string[]; // slugs of team members
  projectStaffs?: string[];
  fundingAgency?: string; // database property for searching/filtering
  collaboratingAgency?: string; // database property for searching/filtering
  fundingAgencies?: ProjectPartnerAgency[];
  supportingAgencies?: ProjectPartnerAgency[];
  collaborators?: ProjectCollaborator[];
  year?: string; // database property for searching/filtering
  startDate?: string; // e.g. "2024-01-01"
  endDate?: string;   // e.g. "2025-12-31"
  keywords?: string[]; // database property for searching/filtering
  subPages?: ProjectSubPage[]; // Rich, modular dossier pages config
  openPositions?: Array<{
    title: string;
    description: string;
    deadline: string;
    applyLink: string;
  }>;
  overviewImages?: string[];
  overviewYoutubeLinks?: string[];
  methodologyImages?: string[];
  methodologyYoutubeLinks?: string[];
  outputUrl?: string;
  outputLabel?: string;
}
