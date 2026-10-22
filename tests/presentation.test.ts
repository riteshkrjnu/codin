import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePublications } from '../src/features/publications/publications';
import { buildNavigation } from '../src/site/layout/navigation';

test('publications merge legacy citations and Scholar records, preserving useful metadata', () => {
  const rows = normalizePublications(['[Community archives](https://example.org/paper) (2025) [Citations: 3]', 'Earlier work (2022)'], [
    { title: 'Community archives', year: '2025', citationCount: 4, link: 'https://example.org/scholar', authors: 'A. Researcher', journal: 'Field Methods' },
    { title: 'Unsafe link', year: '2026', link: 'javascript:alert(1)' }, null,
  ]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].link, undefined);
  assert.deepEqual(rows[1], { title: 'Community archives', year: '2025', citationCount: 4, link: 'https://example.org/scholar', authors: 'A. Researcher', venue: 'Field Methods', scholar: true });
  assert.equal(rows[2].title, 'Earlier work');
  assert.deepEqual(normalizePublications(undefined, null), []);
});

test('navigation retains original destinations and groups actual projects using shared lifecycle', () => {
  const items = buildNavigation([{ slug: 'new-centre', name: 'A newly created centre' }], [
    { slug: 'active', title: 'Active', status: 'Ongoing', startDate: '2020-01-01' },
    { slug: 'finished', title: 'Finished', status: 'Completed' },
    { slug: 'archived', title: 'Archived', status: 'Archived' },
  ]);
  assert.ok(items.find(item => item.label === 'About')?.groups?.[0].links.some(link => link.href === '/about/rab'));
  assert.ok(!items.find(item => item.label === 'W2M Academy')?.groups?.some(group=>group.links.some(link=>link.label==='Overview')));
  assert.ok(items.find(item => item.label === 'W2M Academy')?.groups?.[0].links.some(link => link.href === '/academy/custom'));
  assert.equal(items.find(item => item.label === 'Centres')?.groups?.[0].links[0].href, '/centres/new-centre');
  const groups = items.find(item => item.label === 'Projects')!.groups!;
  assert.equal(groups[0].links[0].href, '/projects/active');
  assert.equal(groups[2].links.length, 2);
});

import { buildActivities, activityTimestamp } from '../src/site/activityFeed';
import { courseOverviewPages } from '../src/site/coursePresentation';

test('the desk retains separate announcements and related publications without repeating project directory records',()=>{
  const data={courses:[{slug:'course',status:'Upcoming',startDate:'2099-01-01'}],events:[{slug:'course',isCourse:true},{slug:'fieldwork',status:'Ongoing',associatedProjects:['project'],startDate:'2020-01-01'}],projects:[{slug:'project',status:'Ongoing',publications:['[A project paper](https://example.org/paper) (2026)']}],resources:[{slug:'paper',kind:'Publication',associatedProjects:['project'],publishedAt:'2026-02-01'}],items:[{_id:'dynamic',sourceId:'project',isDynamic:true},{_id:'notice-one',sourceId:'project',title:'First update',status:'Ongoing',date:'2026-01-01',link:'/projects/project'},{_id:'notice-two',sourceId:'project',title:'Second update',status:'Upcoming',date:'2026-01-02',link:'/projects/project'},{_id:'custom',title:'Council announcement',status:'Ongoing',date:'2026-01-03'}]};
  const activities=buildActivities(data,c=>`/course/${c.slug}`);
  assert.equal(activities.filter(a=>a.activityKind==='course').length,1);
  assert.equal(activities.filter(a=>a.activityKind==='announcement').length,3);
  assert.equal(activities.filter(a=>a.activityKey==='project:project').length,0);
  const project=activities.filter(a=>a.associatedProjects?.includes('project'));
  assert.deepEqual(project.map(a=>a.activityKind).sort(),['announcement','announcement','event','publication','publication']);
  const notices=activities.filter(a=>a.activityKind==='announcement').sort((a,b)=>activityTimestamp(a)-activityTimestamp(b));
  assert.deepEqual(notices.map(a=>a.title),['First update','Second update','Council announcement']);
  assert.equal(activityTimestamp({date:'unavailable'}),Infinity);
});

test('course overview preserves custom chapter order and public module details',()=>{
  const legacy={curriculum:['Listening','Documentation'],subPages:[{slug:'briefing',title:'Briefing',type:'markdown'}]};
  const pages=courseOverviewPages(legacy);assert.equal(pages[0].slug,'briefing');assert.deepEqual(pages[1].content.modules,[{title:'Listening',description:''},{title:'Documentation',description:''}]);
  pages[1].content.modules[0].description='Consent and listening before recording.';
  assert.deepEqual(courseOverviewPages({...legacy,subPages:pages}),pages);
});

import { centrePartners } from '../src/site/partners';

test('centre partners follow project and event associations, merging logos while excluding unrelated or private credits',()=>{
 const centre={slug:'languages',projects:['explicit-project']};
 const data={projects:[{slug:'explicit-project',fundingAgencies:[{name:'Research Council',website:'https://example.org/council'}]},{slug:'linked-project',associatedCentres:['languages'],collaborators:[{name:'Community Archive',logo:'/archive.svg',website:'https://example.org/archive'}]},{slug:'private-project',associatedCentres:['languages'],status:'Draft',fundingAgency:'Private funder'}],events:[{slug:'direct-event',associatedCentres:['languages'],sponsors:[{name:'research council',logo:'/council.svg'}]},{slug:'project-event',associatedProjects:['linked-project'],collaborators:[{name:'Field Partners',logo:'/field.svg',website:'https://example.org/field'}]},{slug:'unrelated-event',associatedCentres:['another-centre'],sponsors:[{name:'Unrelated funder'}]},{slug:'deleted-event',associatedCentres:['languages'],deleted:true,sponsors:[{name:'Deleted funder'}]}],courses:[{slug:'linked-course',associatedCentres:['languages'],supportingAgencies:[{name:'Learning Partner'}]}]};
 const credits=centrePartners(centre,data);
 assert.equal(credits.funding.length,1);assert.equal(credits.funding[0].name,'Research Council');assert.equal(credits.funding[0].logo,'/council.svg');assert.equal(credits.funding[0].website,'https://example.org/council');
 assert.deepEqual(credits.collaborators.map(c=>c.name),['Community Archive','Field Partners']);assert.deepEqual(credits.support.map(c=>c.name),['Learning Partner']);
});
