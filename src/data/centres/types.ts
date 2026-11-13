/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CentreSubPage {
  slug: string;
  title: string;
  icon?: string; // Lucide icon identifier
  type: 'markdown' | 'list' | 'custom' | 'dates' | 'schedule';
  content: any; // Type-specific content structure
}

export interface Publication {
  title: string;
  authors: string;
  journal: string;
  year: string;
  link?: string;
}

export interface RelevantCard {
  title: string;
  description: string;
  iconName?: string;
}

export interface Centre {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  image: string;
  aims: string[];
  projects: string[]; // Project slugs
  people: string[]; // Team member slugs
  courses: string[]; // Course slugs (both online and residential)
  publications?: Publication[];
  relevantCards?: RelevantCard[];
  subPages?: CentreSubPage[]; // Rich, modular extra pages config
}
