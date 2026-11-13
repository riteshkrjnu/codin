/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface Experience {
  role: string;
  organization: string;
  period: string; // e.g. "2020 - Present"
  description?: string;
}

export interface SocialLinks {
  linkedin?: string;
  website?: string;
  twitter?: string;
  github?: string;
  academia?: string;
  researchgate?: string;
  googlescholar?: string;
  realGoogleScholar?: string;
  realGoogleScholarCitations?: number;
  orcid?: string;
  semanticscholar?: string;
  semanticscholarCitations?: number;
}

export interface ScholarStats {
  citations?: number;
  hIndex?: number;
  i10Index?: number;
  publicationCount?: number;
  lastUpdated?: string;
}

export interface ScholarPublication {
  title: string;
  year?: string;
  citationCount?: number;
  link?: string;
}

export interface CustomLink {
  label: string;
  url: string;
}

export interface CustomSection {
  title: string;
  content: string | string[]; // Can be a paragraph or a list of bullet points
}

export interface Person {
  slug: string; // url-safe identifier, e.g. 'bornini-lahiri'
  name: string; // e.g. "Bornini Lahiri"
  fullName: string; // e.g. "Dr. Bornini Lahiri"
  role: string; // e.g. "Linguistic Lead"
  email: string;
  image: string; // photograph URL
  bannerImages?: string[]; // list of header banner image URLs
  bio: string;
  education?: Education[];
  experience?: Experience[];
  publications?: string[];
  scholarStats?: ScholarStats;
  scholarPublications?: ScholarPublication[];
  centres?: string[]; // slugs of associated centres
  socials?: SocialLinks;
  otherLinks?: CustomLink[];
  otherSections?: CustomSection[];
  boardMemberType?: 'board' | 'rab' | 'staff' | 'none' | 'external';
  researchInterests?: string[];
  manualEvents?: ManualEvent[];
  manualCourses?: ManualCourse[];
}

export interface ManualEvent {
  isInternal?: boolean;
  eventSlug?: string;
  name: string;
  dates: string;
  venue: string;
  link?: string;
  role: string;
  description?: string;
  isManual?: boolean;
}

export interface ManualCourse {
  isInternal?: boolean;
  courseSlug?: string;
  name: string;
  dates?: string;
  venue?: string;
  link?: string;
  role: string;
  description?: string;
  isManual?: boolean;
}

