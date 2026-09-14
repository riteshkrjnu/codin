/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import { BrutalistLoader } from './components/Loader';

import { AuthProvider } from './context/AuthContext';
import AuthModal from './components/AuthModal';

const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./components/ProjectDetail'));
const CentreDetail = lazy(() => import('./pages/CentreDetail'));
const People = lazy(() => import('./pages/People'));
const PeopleDetail = lazy(() => import('./pages/PeopleDetail'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const AcademyOverview = lazy(() => import('./pages/AcademyOverview'));
const ResidentialCourses = lazy(() => import('./pages/ResidentialCourses'));
const CourseIterationDetail = lazy(() => import('./pages/CourseIterationDetail'));
const OnlineCourses = lazy(() => import('./pages/OnlineCourses'));
const OnlineCourseDetail = lazy(() => import('./pages/OnlineCourseDetail'));
const CertificationDetail = lazy(() => import('./pages/CertificationDetail'));
const CustomCourses = lazy(() => import('./pages/CustomCourses'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const VisionMission = lazy(() => import('./pages/VisionMission'));
const BoardLeadership = lazy(() => import('./pages/BoardLeadership'));
const ResearchAdvisoryBoard = lazy(() => import('./pages/ResearchAdvisoryBoard'));

// extracting the Home component
import Hero from './components/Hero';
import HomeBulletins from './components/HomeBulletins';
import Impact from './components/Impact';
import ProjectShowcase from './components/ProjectShowcase';
import W2MAcademy from './components/W2MAcademy';
import Team from './components/Team';

function HomeContent() {
  return (
    <>
      <Hero />
      <HomeBulletins />
      <Impact />
      <W2MAcademy />
      <ProjectShowcase />      
      
      {/* Philosophy / Living Lab Block */}
      <section id="philosophy" className="py-32 px-6 lg:px-12 bg-white grid-structure border-b border-ink overflow-hidden">
        <div className="max-w-[1600px] mx-auto grid lg:grid-cols-2 gap-24 items-center">
           <div className="relative order-2 lg:order-1">
              <div className="absolute -top-12 -left-12 font-serif text-[15vw] font-black opacity-5 pointer-events-none select-none">LAB</div>
              <img 
                src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=1200" 
                alt="CDI Field Experiment" 
                className="w-full grayscale border border-ink shadow-[20px_20px_0px_var(--color-brand-blue)] relative z-10"
                referrerPolicy="no-referrer"
              />
           </div>
           <div className="order-1 lg:order-2">
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-ink/40 mb-6 flex items-center gap-2">
                <span className="w-12 h-[1px] bg-ink/20" />
                Organic Governance
              </div>
              <h2 className="text-5xl lg:text-7xl font-serif font-black mb-10 leading-tight">
                We Practice <br /> <span className="text-outline">What We Preach</span>
              </h2>
              <p className="font-serif text-2xl font-light italic leading-relaxed text-ink/80 mb-10">
                The Council for Diversity and Innovation is more than a think tank. We are a living-lab demonstration hub where we embed diversity principles throughout our governance, project design, and recruitment.
              </p>
              <div className="grid gap-6">
                 {[
                   { id: "01", t: "IDENTITY INTEGRITY", d: "Embedding diversity principles in our board and team selection." },
                   { id: "02", t: "ARCHITECTURAL HONESTY", d: "Transparent research pipelines accessible to community stake-holders." },
                   { id: "03", t: "AI ETHICS BY DESIGN", d: "Building bias-free models by starting with minoritised data sets." }
                 ].map(item => (
                   <div key={item.id} className="flex gap-6 p-6 border border-ink/10 hover:border-ink hover:bg-brand-acid transition-all group">
                      <div className="font-mono text-xl font-bold group-hover:scale-125 transition-transform">{item.id}</div>
                      <div>
                         <h4 className="font-mono text-xs font-black uppercase tracking-widest mb-1">{item.t}</h4>
                         <p className="text-[10px] text-ink/40 font-bold uppercase tracking-tighter">{item.d}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      <Team />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-paper overflow-x-hidden selection:bg-brand-acid selection:text-ink flex flex-col">
          <Navbar />
          <AuthModal />
          <main className="relative z-10 flex-grow">
          <Suspense fallback={<div className="h-screen flex items-center justify-center"><BrutalistLoader /></div>}>
            <Routes>
              <Route path="/" element={<HomeContent />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:slug" element={<ProjectDetail />} />
              <Route path="/centres/:slug" element={<CentreDetail />} />
              <Route path="/people" element={<People />} />
              <Route path="/about/vision-mission" element={<VisionMission />} />
              <Route path="/about/board" element={<BoardLeadership />} />
              <Route path="/about/rab" element={<ResearchAdvisoryBoard />} />
              <Route path="/people/:slug" element={<PeopleDetail />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:slug" element={<EventDetail />} />
              <Route path="/academy" element={<AcademyOverview />} />
              <Route path="/academy/residential" element={<ResidentialCourses />} />
              <Route path="/academy/residential/:slug" element={<CourseIterationDetail />} />
              <Route path="/academy/online" element={<OnlineCourses />} />
              <Route path="/academy/online/:slug" element={<OnlineCourseDetail />} />
              <Route path="/academy/certifications/:id" element={<CertificationDetail />} />
              <Route path="/academy/custom" element={<CustomCourses />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
    </AuthProvider>
  );
}

