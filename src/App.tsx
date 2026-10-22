import ResidentialCourseRedirect from './site/layout/ResidentialCourseRedirect';
import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import SaveConflictNotice from './components/SaveConflictNotice';
import ScrollToTop from './components/ScrollToTop';
import { LifecycleClock } from './lib/lifecycleClock';
import { AuthProvider } from './context/AuthContext';
import { SiteDataProvider } from './site/data';
import './site/site.css';
import PageLayout from './site/layout/PageLayout';
import './site/theme/functional-pages.css';
import './site/theme/navigation.css';
import './site/theme/connected-pages.css';
import './features/writing/writing.css';
import ConnectedWorkspace from './site/layout/ConnectedWorkspace';
const Notices=lazy(()=>import('./site/Notices'));
const Home=lazy(()=>import('./site/Home'));
const ResourceEditor=lazy(()=>import('./site/ResourceEditor'));
const PublicCatalogue=lazy(()=>import('./site/PublicPages').then(m=>({default:m.Catalogue})));
const PublicDetail=lazy(()=>import('./site/PublicPages').then(m=>({default:m.Detail})));
const About=lazy(()=>import('./site/PublicPages').then(m=>({default:m.About})));
const CustomLearning=lazy(()=>import('./site/PublicPages').then(m=>({default:m.CustomLearning})));
const ResidentialCourses=lazy(()=>import('./pages/ResidentialCourses'));
const Projects=lazy(()=>import('./pages/Projects'));
const ProjectDetail=lazy(()=>import('./components/ProjectDetail'));
const CentreDetail=lazy(()=>import('./pages/CentreDetail'));
const People=lazy(()=>import('./pages/People'));
const PeopleDetail=lazy(()=>import('./pages/PeopleDetail'));
const Events=lazy(()=>import('./pages/Events'));
const EventDetail=lazy(()=>import('./pages/EventDetail'));
const OnlineCourses=lazy(()=>import('./pages/OnlineCourses'));
const OnlineCourseDetail=lazy(()=>import('./pages/OnlineCourseDetail'));
const CourseIterationDetail=lazy(()=>import('./pages/CourseIterationDetail'));
const Profile=lazy(()=>import('./pages/Profile'));
const AdminPanel=lazy(()=>import('./pages/AdminPanel'));
const EditorialDashboard=lazy(()=>import('./pages/EditorialDashboard'));
const CertificationDetail=lazy(()=>import('./pages/CertificationDetail'));
const HomeBulletins=lazy(()=>import('./components/HomeBulletins'));
function Shell(){useEffect(()=>{document.body.classList.add('codin-site');return()=>document.body.classList.remove('codin-site');},[]);return <div className="combined explorer live-site"><ScrollToTop/><Navbar/><AuthModal/><SaveConflictNotice/><main id="main-content" tabIndex={-1}><ConnectedWorkspace><Suspense fallback={<p className="loading-state" role="status">Loading…</p>}><Routes>
<Route path="/" element={<Home/>}/>
<Route path="/projects" element={<PageLayout><Projects/></PageLayout>}/>
<Route path="/projects/:slug" element={<PageLayout><ProjectDetail/></PageLayout>}/>
<Route path="/centres" element={<PublicCatalogue kind="centres"/>}/>
<Route path="/centres/:slug" element={<PageLayout><CentreDetail/></PageLayout>}/>
<Route path="/events" element={<PageLayout><Events/></PageLayout>}/>
<Route path="/events/:slug" element={<PageLayout><EventDetail/></PageLayout>}/>
<Route path="/academy" element={<PublicCatalogue kind="academy"/>}/>
<Route path="/academy/online" element={<PageLayout><OnlineCourses/></PageLayout>}/>
<Route path="/academy/residential" element={<PageLayout><ResidentialCourses/></PageLayout>}/>
<Route path="/academy/online/:slug" element={<PageLayout><OnlineCourseDetail/></PageLayout>}/>
<Route path="/academy/residential/:slug" element={<ResidentialCourseRedirect/>}/>
<Route path="/academy/certifications/:id" element={<PageLayout><CertificationDetail/></PageLayout>}/>
<Route path="/academy/custom" element={<CustomLearning/>}/>
<Route path="/notices" element={<Notices/>}/><Route path="/notices/:id" element={<Notices/>}/>
<Route path="/resources" element={<PublicCatalogue kind="resources"/>}/>
<Route path="/resources/:slug" element={<PublicDetail kind="resource"/>}/>
<Route path="/people" element={<PageLayout><People/></PageLayout>}/>
<Route path="/people/:slug" element={<PageLayout><PeopleDetail/></PageLayout>}/>
<Route path="/about" element={<About/>}/><Route path="/about/vision-mission" element={<About/>}/>
<Route path="/about/board" element={<PublicCatalogue kind="board"/>}/><Route path="/about/rab" element={<PublicCatalogue kind="rab"/>}/>
<Route path="/profile" element={<PageLayout><Profile/></PageLayout>}/>
<Route path="/admin" element={<PageLayout><AdminPanel/></PageLayout>}/><Route path="/admin/editorial" element={<PageLayout><EditorialDashboard/></PageLayout>}/>
<Route path="/writing" element={<ResourceEditor/>}/>
<Route path="/admin/announcements" element={<PageLayout><HomeBulletins/></PageLayout>}/><Route path="/admin/resources" element={<ResourceEditor/>}/>
<Route path="*" element={<section className="page-heading"><div><p className="eyebrow">CoDIN</p><h1>This page could not be found.</h1><Link to="/">Return to CoDIN →</Link></div></section>}/>
</Routes></Suspense></ConnectedWorkspace></main><Footer/></div>;}
export default function App(){return <AuthProvider><BrowserRouter><LifecycleClock><SiteDataProvider><Shell/></SiteDataProvider></LifecycleClock></BrowserRouter></AuthProvider>;}
