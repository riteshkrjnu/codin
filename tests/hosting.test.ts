import test from 'node:test';
import assert from 'node:assert/strict';
import {hostingConfig} from '../server/config';
import {getProjectStatus} from '../src/lib/courseStatus';
import {resolveApiUrl} from '../src/lib/apiUrl';
test('separate hosts are explicit and combined hosting remains the default',()=>{
 const common={APP_URL:'https://codin.example',NODE_ENV:'production'};
 assert.equal(hostingConfig(common).serveFrontend,true);
 const split=hostingConfig({...common,PUBLIC_API_URL:'https://api.codin.example',CORS_ORIGINS:'https://codin.example,https://www.codin.example',SERVE_FRONTEND:'false'});
 assert.equal(split.api,'https://api.codin.example');assert.equal(split.app,'https://codin.example');assert.equal(split.serveFrontend,false);assert.equal(split.origins.length,2);
 for(const origin of ['*','https://codin.example/path','http://codin.example','javascript:alert(1)','https://user:pass@codin.example'])assert.throws(()=>hostingConfig({...common,CORS_ORIGINS:origin}));
 assert.equal(resolveApiUrl('/api/courses?x=1','https://api.codin.example/'),'https://api.codin.example/api/courses?x=1');
 assert.equal(resolveApiUrl('/api/courses',''),'/api/courses');
 assert.equal(resolveApiUrl('/api/courses'),'/api/courses');
});
test('open-ended project dates do not turn ongoing projects into completed one-day events',()=>{
 const now=Date.parse('2026-10-19T12:00:00Z');
 assert.equal(getProjectStatus({status:'Ongoing',startDate:'2025-01-01'},now),'Ongoing');
 assert.equal(getProjectStatus({status:'Completed',startDate:'2025-01-01'},now),'Completed');
 assert.equal(getProjectStatus({status:'Ongoing',startDate:'2027-01-01'},now),'Upcoming');
 assert.equal(getProjectStatus({status:'Ongoing',startDate:'2025-01-01',endDate:'2026-01-01'},now),'Completed');
 assert.equal(getProjectStatus({status:'Archived',startDate:'2025-01-01'},now),'Archived');
});
