/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EventSubPage {
  slug: string;
  title: string;
  icon?: string; // Lucide icon identifier
  type: 'markdown' | 'dates' | 'schedule' | 'registration' | 'list' | 'logistics' | 'committees' | 'contact';
  content: any; // Type-specific content structure
}

export interface ImportantDate {
  label: string;
  date: string;
  footnote?: string;
  highlighted?: boolean;
}

export interface RegistrationFee {
  category: string;
  fee: string;
}

export interface AcceptedPaper {
  title: string;
  authors: string;
  abstract?: string;
}

export interface Participant {
  name: string;
  role: string;
  affiliation?: string;
}

export interface Committee {
  name: string;
  members: {
    name: string;
    role: string;
    affiliation?: string;
  }[];
}

export interface ContactPerson {
  name: string;
  designation: string;
  email: string;
  phone?: string;
}

export interface ScheduleItem {
  time: string;
  topic: string;
  speaker?: string;
}

export interface EventPresenter {
  id: string; 
  name: string;
  isExternal: boolean;
  staffSlug?: string; // If selected from team list
  photoUrl?: string; // Loaded from Cloudinary (for external)
  profileUrl?: string; // External link / bio link
  role?: string; // Optional role like course instructor, key speaker
  affiliation?: string; // Optional affiliated organization
}

export interface Event {
  slug: string;
  title: string;
  type: string; // Customizable event type, can be arbitrary
  dates: string;
  startDate?: string;
  endDate?: string;
  location: string;
  description: string;
  longDescription: string;
  image: string;
  status: 'Upcoming' | 'Ongoing' | 'Archived'; // Needed for classifications
  associatedCentres: string[];
  associatedPeople: string[];
  associatedProjects: string[];
  collaborators?: EventPartner[];
  sponsors?: EventPartner[];
  schedule?: ScheduleItem[];
  subPages?: EventSubPage[]; // Rich, modular pages config
  presenters?: EventPresenter[]; // Active presenters list
}

export interface EventPartner {
  name: string;
  logo?: string;
  website?: string;
}
