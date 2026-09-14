/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, User as UserIcon, LogOut, ArrowRight, Video, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { BrutalistLoader } from '../components/Loader';

export default function Profile() {
  const { user, login, logout, setShowModal } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourseSlugs, setEnrolledCourseSlugs] = useState<string[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  // Multi-email states
  const [emailToAdd, setEmailToAdd] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      setShowModal(true);
      return;
    }

    const fetchData = async () => {
      try {
         const [enrollRes, coursesRes] = await Promise.all([
           fetch(`/api/lms/enrollments/${user.token}`),
           fetch('/api/lms/courses')
         ]);
         
         const enrollData = await enrollRes.json();
         const coursesData = await coursesRes.json();
         
         if (enrollData.enrolledCourses) {
           setEnrolledCourseSlugs(enrollData.enrolledCourses);
         }
         if (coursesData.courses) {
           setCourses(coursesData.courses);
         }
      } catch (err) {
         console.error(err);
      } finally {
         setLoading(false);
      }
    };
    
    fetchData();
    if (user?.name) {
      setEditName(user.name);
    }
  }, [user, navigate, setShowModal]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setUpdateLoading(true);
    try {
       const res = await fetch('/api/lms/profile', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ userId: user.token, name: editName })
       });
       const data = await res.json();
       if (data.token) {
           login(data.token, data.email, data.name, data.role, data.emails);
           setIsEditing(false);
       } else {
           alert(data.error || 'Failed to update profile');
       }
    } catch (err) {
       console.error(err);
    } finally {
       setUpdateLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!emailToAdd.trim()) return;
    setIsEmailLoading(true);
    setEmailMessage("");
    try {
      const res = await fetch('/api/lms/profile/add-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.token, emailToAdd: emailToAdd.trim() })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        login(data.token, data.email, data.name, data.role, data.emails);
        setEmailToAdd("");
        setEmailMessage("Email details verified and linked successfully!");
      } else {
        setEmailMessage(data.error || "Failed to add email address");
      }
    } catch (err) {
      console.error(err);
      setEmailMessage("API connection error occurred.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    if (!user) return;
    if (confirm(`Are you sure you want to decouple the verification of "${emailToRemove}" from your account?`)) {
      setIsEmailLoading(true);
      setEmailMessage("");
      try {
        const res = await fetch('/api/lms/profile/remove-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.token, emailToRemove })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          login(data.token, data.email, data.name, data.role, data.emails);
          setEmailMessage("Linked email uncoupled successfully");
        } else {
          setEmailMessage(data.error || "Failed to remove the email");
        }
      } catch (err) {
        console.error(err);
        setEmailMessage("API connection error occurred.");
      } finally {
        setIsEmailLoading(false);
      }
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage("Please satisfy all password entry fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("The passwords you typed do not match.");
      return;
    }
    setIsPasswordLoading(true);
    setPasswordMessage("");
    try {
      const res = await fetch('/api/lms/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.token, currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage("Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage(data.error || "Incorrect current password");
      }
    } catch (err) {
      console.error(err);
      setPasswordMessage("API connection error occurred");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (!user) return null;

  const enrolledCourses = courses.filter(c => enrolledCourseSlugs.includes(c.slug));
  const linkedEmails = user.emails || [user.email];

  return (
    <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-8"
        >
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-brand-orange mb-4">
              Learner Dashboard
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-black italic tracking-tighter">
              Welcome back,
              <br />
              <span className="text-brand-blue">{user.name || user.email.split('@')[0]}</span>
            </h1>
          </div>
          <button 
            onClick={() => { logout(); navigate('/'); }}
            className="h-12 px-6 border border-ink flex items-center gap-3 font-mono text-xs font-black uppercase tracking-widest hover:bg-ink hover:text-paper transition-all shrink-0"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Profile Info Sidebar Column */}
          <div className="lg:col-span-1 space-y-8">
             {/* ACCOUNT PROFILE SETTINGS */}
             <div className="border border-ink bg-white/50 p-8 shadow-[10px_10px_0px_rgba(0,0,0,1)] relative">
                <div className="w-16 h-16 bg-brand-acid border border-ink flex items-center justify-center mb-6">
                  <UserIcon className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="font-serif font-black text-2xl mb-2">Account Details</h3>
                {isEditing ? (
                  <div className="space-y-4 font-mono text-xs mt-6">
                    <div>
                      <div className="opacity-50 mb-1">Primary Email (Unchangeable)</div>
                      <input type="text" value={user.email} disabled className="w-full p-3 border border-ink bg-ink/5 focus:outline-none" />
                    </div>
                    <div>
                      <div className="opacity-50 mb-1">Full Name</div>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        className="w-full p-3 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <button 
                        onClick={() => setIsEditing(false)}
                        disabled={updateLoading}
                        className="w-full h-10 border border-ink text-ink font-mono text-[10px] font-black uppercase tracking-widest hover:bg-ink/5 transition-colors"
                      >
                         Cancel
                      </button>
                      <button 
                        onClick={handleUpdateProfile}
                        disabled={updateLoading}
                        className="w-full h-10 bg-brand-blue text-paper font-mono text-[10px] font-black uppercase tracking-widest hover:bg-ink transition-colors disabled:opacity-50"
                      >
                         {updateLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 font-mono text-xs mt-6">
                      <div>
                        <div className="opacity-50 mb-1">Primary Address</div>
                        <div className="font-bold text-ink">{user.email}</div>
                      </div>
                      <div>
                        <div className="opacity-50 mb-1">Full Name</div>
                        <div className="font-bold text-ink">{user.name || 'Not provided'}</div>
                      </div>
                      <div>
                        <div className="opacity-50 mb-1">Membership Tier</div>
                        <div className="font-bold text-brand-orange uppercase">{user.role || 'student'}</div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="mt-8 w-full h-12 border border-ink bg-paper text-ink font-mono text-[10px] font-black uppercase tracking-widest hover:bg-brand-acid transition-colors"
                    >
                       Edit Profile Name
                    </button>
                  </>
                )}
             </div>

             {/* ADDITIONAL EMAILS ACCOUNT SUBSECTION */}
             <div className="border border-ink bg-white/50 p-8 shadow-[10px_10px_0px_rgba(0,0,0,1)] relative">
                <h3 className="font-serif font-black text-2xl mb-2">Linked Emails</h3>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wide opacity-50 mb-6">
                  Manage multiple email addresses to register and sign in easily.
                </p>

                {emailMessage && (
                  <div className="p-3 border border-brand-orange bg-brand-orange/5 text-[11px] font-mono font-bold leading-normal text-ink mb-4">
                    {emailMessage}
                  </div>
                )}

                <div className="space-y-3 font-mono text-xs mb-6">
                  {linkedEmails.map((linked, idx) => (
                    <div key={linked + idx} className="p-3 border border-ink bg-paper flex items-center justify-between">
                      <div className="truncate pr-2">
                        <strong className="text-ink">{linked}</strong>
                        {linked === user.email && (
                          <span className="ml-2 py-0.5 px-2 text-[8px] bg-brand-acid font-black uppercase text-ink">primary</span>
                        )}
                      </div>
                      {linked !== user.email && (
                        <button 
                          onClick={() => handleRemoveEmail(linked)}
                          disabled={isEmailLoading}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                          title="Unlink address"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 font-mono text-xs">
                  <input 
                    type="email" 
                    value={emailToAdd} 
                    onChange={e => setEmailToAdd(e.target.value)} 
                    placeholder="add-email@example.com" 
                    className="w-full p-3 border border-ink bg-white focus:outline-none focus:border-brand-blue" 
                  />
                  <button 
                    onClick={handleAddEmail}
                    disabled={isEmailLoading || !emailToAdd.trim()}
                    className="w-full h-10 bg-brand-blue text-paper font-mono text-[10px] font-black uppercase tracking-widest hover:bg-ink transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Link Email Address
                  </button>
                </div>
             </div>

             {/* CHANGE PASSWORD SUBSECTION */}
             <div className="border border-ink bg-white/50 p-8 shadow-[10px_10px_0px_rgba(0,0,0,1)] relative">
                <h3 className="font-serif font-black text-2xl mb-2">Change Password</h3>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wide opacity-50 mb-6">
                  Update your authentication credentials securely.
                </p>

                {passwordMessage && (
                  <div className={`p-3 border text-[11px] font-mono font-bold text-ink mb-4 ${passwordMessage.includes('successfully') ? 'border-brand-acid bg-brand-acid/10' : 'border-red-500 bg-red-100/10'}`}>
                    {passwordMessage}
                  </div>
                )}

                <div className="space-y-4 font-mono text-xs mb-6">
                   <div>
                     <div className="opacity-50 mb-1">Current Password</div>
                     <input 
                       type="password" 
                       value={currentPassword} 
                       onChange={e => setCurrentPassword(e.target.value)} 
                       placeholder="••••••••" 
                       className="w-full p-3 border border-ink bg-white focus:outline-none focus:border-brand-orange" 
                     />
                   </div>
                   <div>
                     <div className="opacity-50 mb-1">New Password</div>
                     <input 
                       type="password" 
                       value={newPassword} 
                       onChange={e => setNewPassword(e.target.value)} 
                       placeholder="••••••••" 
                       className="w-full p-3 border border-ink bg-white focus:outline-none focus:border-brand-blue" 
                     />
                   </div>
                   <div>
                     <div className="opacity-50 mb-1">Confirm New Password</div>
                     <input 
                       type="password" 
                       value={confirmPassword} 
                       onChange={e => setConfirmPassword(e.target.value)} 
                       placeholder="••••••••" 
                       className="w-full p-3 border border-ink bg-white focus:outline-none focus:border-brand-blue" 
                     />
                   </div>
                </div>

                <button 
                  onClick={handleChangePassword}
                  disabled={isPasswordLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full h-12 bg-ink text-paper font-mono text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue transition-colors disabled:opacity-50"
                >
                   Update Account Password
                </button>
             </div>
          </div>

          {/* Courses Section */}
          <div className="lg:col-span-2">
             <div className="flex items-center gap-4 mb-8 pb-4 border-b border-ink/20">
                <BookOpen className="w-6 h-6 text-brand-blue" />
                <h2 className="text-3xl font-serif font-black italic">My Courses</h2>
                <div className="ml-auto bg-ink text-paper font-mono text-[10px] font-bold px-3 py-1 rounded-full">
                  {loading ? '...' : enrolledCourses.length} Enrolled
                </div>
             </div>

             {loading ? (
               <div className="py-12"><BrutalistLoader /></div>
             ) : enrolledCourses.length > 0 ? (
               <div className="grid gap-6">
                 {enrolledCourses.map((course, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      key={course.slug} 
                      className="group border border-ink bg-paper hover:bg-white transition-colors flex flex-col md:flex-row shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_rgba(0,0,0,1)]"
                    >
                      <div className="w-full md:w-48 h-32 bg-ink overflow-hidden border-b md:border-b-0 md:border-r border-ink">
                         <img src={course.image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1200"} alt={course.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                      </div>
                      <div className="p-6 flex-grow flex flex-col justify-between">
                         <div>
                           <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-brand-orange mb-2">
                             {course.type} • {course.duration}
                           </div>
                           <h3 className="text-xl font-serif font-black mb-2">{course.title}</h3>
                         </div>
                         
                         <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2 font-mono text-[10px] opacity-60">
                              <Video className="w-3 h-3" />
                              <span>Ready to resume</span>
                            </div>
                            <Link 
                              to={`/academy/online/${course.slug}`}
                              className="h-10 px-4 bg-brand-acid border border-ink flex items-center justify-center gap-2 font-mono text-[10px] font-black uppercase tracking-widest hover:bg-ink hover:text-brand-acid transition-all"
                            >
                              Continue <ArrowRight className="w-3 h-3" />
                            </Link>
                         </div>
                      </div>
                    </motion.div>
                 ))}
               </div>
             ) : (
               <div className="border border-ink border-dashed p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-ink/5 flex items-center justify-center mb-6">
                    <BookOpen className="w-8 h-8 opacity-20" />
                  </div>
                  <h4 className="font-serif font-black text-2xl mb-4">No courses yet</h4>
                  <p className="font-mono text-xs opacity-60 max-w-md mb-8">
                    You haven't enrolled in any online courses. Browse our catalog to start learning.
                  </p>
                  <Link 
                    to="/academy/online"
                    className="h-12 px-6 bg-brand-blue text-paper flex items-center justify-center gap-3 font-mono text-xs font-black uppercase tracking-widest hover:bg-ink transition-colors"
                  >
                    Browse Courses <ArrowRight className="w-4 h-4" />
                  </Link>
               </div>
             )}
          </div>
        </div>
    </div>
  );
}
