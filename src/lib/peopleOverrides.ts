/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { people as initialPeople, Person } from '../data/people';

export function getUpdatedPeople(): Person[] {
  if (typeof window === 'undefined') return initialPeople;
  const stored = localStorage.getItem('codin_people_edits');
  if (!stored) return initialPeople;
  try {
    const overrides = JSON.parse(stored) as Record<string, Partial<Person>>;
    return initialPeople.map(p => {
      if (overrides[p.slug]) {
        // Merge nested fields carefully
        return {
          ...p,
          ...overrides[p.slug],
          education: overrides[p.slug].education || p.education,
          experience: overrides[p.slug].experience || p.experience,
          publications: overrides[p.slug].publications || p.publications,
          scholarStats: overrides[p.slug].scholarStats || p.scholarStats,
          otherLinks: overrides[p.slug].otherLinks || p.otherLinks,
          bannerImages: overrides[p.slug].bannerImages || p.bannerImages,
          socials: { ...p.socials, ...overrides[p.slug].socials },
          otherSections: overrides[p.slug].otherSections || p.otherSections,
          researchInterests: overrides[p.slug].researchInterests || p.researchInterests,
          manualEvents: overrides[p.slug].manualEvents || p.manualEvents,
          manualCourses: overrides[p.slug].manualCourses || p.manualCourses,
        };
      }
      return p;
    });
  } catch (e) {
    console.error('Error parsing people overrides:', e);
    return initialPeople;
  }
}

export function savePersonOverride(slug: string, updated: Partial<Person>) {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem('codin_people_edits');
  let overrides: Record<string, Partial<Person>> = {};
  if (stored) {
    try {
      overrides = JSON.parse(stored);
    } catch (e) {}
  }
  
  overrides[slug] = {
    ...overrides[slug],
    ...updated
  };
  localStorage.setItem('codin_people_edits', JSON.stringify(overrides));
  window.dispatchEvent(new Event('people_data_updated'));
}

// Memory cache to prevent duplicate requests across multiple concurrent component rendering
let globalPeopleCache: Person[] | null = null;
let globalPeopleListeners: Array<(people: Person[]) => void> = [];

export function useLatestPeople() {
  const [people, setPeople] = useState<Person[]>(() => {
    return globalPeopleCache || getUpdatedPeople();
  });

  useEffect(() => {
    const handleUpdate = (updatedList: Person[]) => {
      setPeople(updatedList);
    };
    globalPeopleListeners.push(handleUpdate);

    // Fetch from backend API if not cached yet
    if (!globalPeopleCache) {
      fetch('/api/people')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then(data => {
          const list = data.people || getUpdatedPeople();
          globalPeopleCache = list;
          globalPeopleListeners.forEach(listener => listener(list));
        })
        .catch(() => {
          const list = getUpdatedPeople();
          globalPeopleCache = list;
          globalPeopleListeners.forEach(listener => listener(list));
        });
    }

    const handleDataUpdated = () => {
      globalPeopleCache = null;
      fetch('/api/people')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then(data => {
          const fetchedList = data.people || getUpdatedPeople();
          globalPeopleCache = fetchedList;
          globalPeopleListeners.forEach(listener => listener(fetchedList));
        })
        .catch(() => {
          const list = getUpdatedPeople();
          globalPeopleCache = list;
          globalPeopleListeners.forEach(listener => listener(list));
        });
    };

    window.addEventListener('people_data_updated', handleDataUpdated);

    return () => {
      globalPeopleListeners = globalPeopleListeners.filter(l => l !== handleUpdate);
      window.removeEventListener('people_data_updated', handleDataUpdated);
    };
  }, []);

  return people;
}

/**
 * Resolves a person's image using their slug, name, or profileUrl to fetch their latest verified photograph.
 */
export function resolvePersonImage(
  peopleList: Person[],
  slugOrUrl: string | undefined,
  defaultImg: string = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600"
): string {
  if (!slugOrUrl) return defaultImg;

  // 1. Extract slug from profile URL if present (e.g. "/people/ritesh-kumar")
  let slug = slugOrUrl;
  if (slugOrUrl.includes('/people/')) {
    const parts = slugOrUrl.split('/people/');
    slug = parts[parts.length - 1].replace(/\/$/, "");
  }

  // 2. Resolve by slug match
  const matchedBySlug = peopleList.find(p => p.slug === slug);
  if (matchedBySlug && matchedBySlug.image) {
    return matchedBySlug.image;
  }

  // 3. Resolve by name match
  const matchedByName = peopleList.find(
    p => p.name.toLowerCase() === slugOrUrl.toLowerCase() || 
         p.fullName?.toLowerCase() === slugOrUrl.toLowerCase()
  );
  if (matchedByName && matchedByName.image) {
    return matchedByName.image;
  }

  // 4. Return as-is if it's already an absolute or relative image path
  if (slugOrUrl.startsWith('http') || slugOrUrl.startsWith('data:') || (slugOrUrl.startsWith('/') && !slugOrUrl.startsWith('/people/'))) {
    return slugOrUrl;
  }

  return defaultImg;
}

