/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { BrutalistLoader } from './Loader';

export default function AuthModal() {
  const { showModal, setShowModal, login } = useAuth();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // OTP addition states
  const [otpSent, setOtpSent] = useState(false);
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [availableEmails, setAvailableEmails] = useState<{email: string, masked: string}[] | null>(null);
  const [selectedEmail, setSelectedEmail] = useState("");

  // Reset all states
  const resetForm = () => {
    setIsSignUpMode(false);
    setIsForgotPasswordMode(false);
    setEmail("");
    setPassword("");
    setNewPassword("");
    setName("");
    setOtpCode("");
    setOtpSent(false);
    setResetOtpSent(false);
    setMessage("");
    setAvailableEmails(null);
    setSelectedEmail("");
  };

  const handleAuth = async () => {
    setMessage("");
    
    if (!email) {
      alert("Please enter email address");
      return;
    }

    setLoading(true);

    try {
      // 1. Forgot Password Flow
      if (isForgotPasswordMode) {
        if (!availableEmails && !resetOtpSent) {
          // Fetch emails
          const res = await fetch('/api/lms/forgot-password-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();
          if (res.ok && data.emails) {
            setAvailableEmails(data.emails.map((e: string, i: number) => ({ email: e, masked: data.maskedEmails[i] })));
            setMessage("Please select the email where you want to receive the OTP.");
          } else {
            alert(data.error || 'Failed to find account.');
          }
        } else if (availableEmails && !resetOtpSent) {
          if (!selectedEmail) {
            alert("Please select an email address.");
            setLoading(false);
            return;
          }
          // Request OTP
          const res = await fetch('/api/lms/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, selectedEmail })
          });
          const data = await res.json();
          if (res.ok) {
            setResetOtpSent(true);
            setMessage(data.message || 'OTP verification code sent.');
          } else {
            alert(data.error || 'Failed to request password reset code.');
          }
        } else {
          // Confirm OTP and Reset
          if (!otpCode || !newPassword) {
            alert("Please provide the OTP code and your new password.");
            setLoading(false);
            return;
          }
          const res = await fetch('/api/lms/reset-password-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: selectedEmail || email, otp: otpCode, newPassword })
          });
          const data = await res.json();
          if (res.ok) {
            alert(data.message || 'Password successfully updated.');
            resetForm();
          } else {
            alert(data.error || 'Invalid or expired OTP code.');
          }
        }
        setLoading(false);
        return;
      }

      // 2. Manual Sign Up Flow
      if (isSignUpMode) {
        if (!otpSent) {
          if (!password || !name) {
            alert("Please input your name and desired password.");
            setLoading(false);
            return;
          }
          // Request Registration OTP
          const res = await fetch('/api/lms/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
          });
          const data = await res.json();
          if (res.ok) {
            setOtpSent(true);
            setMessage(data.message || 'A 6-digit verification code was sent.');
          } else {
            alert(data.error || 'Registration failed');
          }
        } else {
          // Confirm Registration OTP
          if (!otpCode) {
            alert("Please enter the 6-digit confirmation code.");
            setLoading(false);
            return;
          }
          const res = await fetch('/api/lms/register-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp: otpCode })
          });
          const data = await res.json();
          if (res.ok && data.token) {
            login(data.token, data.email, data.name, data.role, data.emails);
            setShowModal(false);
            resetForm();
          } else {
            alert(data.error || 'Validation failed. Enter a valid code.');
          }
        }
        setLoading(false);
        return;
      }

      // 3. Regular Login Flow
      const res = await fetch('/api/lms/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        login(data.token, data.email, data.name, data.role, data.emails);
        setShowModal(false);
        resetForm();
      } else {
        alert(data.error || 'Invalid credentials');
      }
    } catch (e) {
      console.error(e);
      setMessage("An backend error occurred");
    }
    setLoading(false);
  };

  const handleGoogleSSO = async () => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/api/lms/auth/google/callback`;
      const response = await fetch(`/api/lms/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
    }
    setLoading(false);
  };

  const handleGitHubSSO = async () => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/api/lms/auth/github/callback`;
      const response = await fetch(`/api/lms/auth/github/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const payload = event.data.payload;
        login(payload.token, payload.email, payload.name, payload.role, payload.emails);
        setShowModal(false);
        resetForm();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [login, setShowModal]);

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 backdrop-blur-sm px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-paper border border-ink p-12 max-w-md w-full shadow-[20px_20px_0px_rgba(0,0,0,1)] relative"
          >
            <button 
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="absolute top-6 right-6 font-mono text-[10px] uppercase font-bold hover:text-brand-orange"
            >
              Close
            </button>
            <h3 className="text-3xl font-serif font-black italic mb-2">
              {isForgotPasswordMode ? 'Reset Password' : isSignUpMode ? 'Create Account' : 'Login'}
            </h3>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-50 mb-8">
              {isForgotPasswordMode 
                ? 'Enter your email to reset password.' 
                : isSignUpMode ? 'Sign up to access courses.' : 'Please log in to continue.'}
            </p>
            
            {loading ? (
              <div className="py-8"><BrutalistLoader /></div>
            ) : (
              <>
                {message && (
                  <div className="mb-6 p-4 border border-brand-acid bg-brand-acid/10 text-xs font-mono font-bold text-ink">
                    {message}
                  </div>
                )}
                <div className="space-y-4 font-mono text-xs mb-6">
                   {/* Normal manual sign up - step 1 */}
                   {isSignUpMode && !isForgotPasswordMode && !otpSent && (
                     <>
                       <input 
                         type="text" 
                         value={name} 
                         onChange={e => setName(e.target.value)} 
                         placeholder="Full Name" 
                         className="w-full p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue" 
                       />
                       <input 
                         type="email" 
                         value={email} 
                         onChange={e => setEmail(e.target.value)} 
                         placeholder="Email Address" 
                         className="w-full p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue" 
                       />
                       <input 
                         type="password" 
                         value={password} 
                         onChange={e => setPassword(e.target.value)} 
                         placeholder="Password" 
                         className="w-full p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue" 
                       />
                     </>
                   )}

                   {/* Forgot password - step 1 */}
                   {isForgotPasswordMode && !availableEmails && !resetOtpSent && (
                     <input 
                       type="email" 
                       value={email} 
                       onChange={e => setEmail(e.target.value)} 
                       placeholder="Email Address" 
                       className="w-full p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue" 
                     />
                   )}

                   {/* Forgot password - step 2 (Select Email) */}
                   {isForgotPasswordMode && availableEmails && !resetOtpSent && (
                     <div className="space-y-3">
                       <p className="font-bold opacity-80 mb-2">Select destination email:</p>
                       {availableEmails.map((e, idx) => (
                         <label key={idx} className="block p-3 border border-ink/20 hover:border-brand-blue cursor-pointer bg-white/50 flex items-center gap-3">
                           <input 
                             type="radio" 
                             name="selectedEmail" 
                             value={e.email}
                             checked={selectedEmail === e.email}
                             onChange={() => setSelectedEmail(e.email)}
                             className="accent-brand-blue"
                           />
                           <span>{e.masked}</span>
                         </label>
                       ))}
                     </div>
                   )}

                   {/* Standard sign in form */}
                   {!isSignUpMode && !isForgotPasswordMode && (
                     <>
                       <input 
                         type="email" 
                         value={email} 
                         onChange={e => setEmail(e.target.value)} 
                         placeholder="Email Address" 
                         className="w-full p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue" 
                       />
                       <input 
                         type="password" 
                         value={password} 
                         onChange={e => setPassword(e.target.value)} 
                         placeholder="Password" 
                         className="w-full p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue" 
                       />
                     </>
                   )}

                   {/* OTP confirm stage (for verification on signup or reset) */}
                   {(otpSent || resetOtpSent) && (
                     <div className="space-y-4">
                       <p className="text-[11px] uppercase tracking-wider text-brand-orange leading-relaxed bg-brand-orange/5 p-3 border border-brand-orange/20 font-bold">
                         A verification code has been generated.
                       </p>
                       {false && (
                         <div className="p-3 border-2 border-dashed border-brand-blue bg-brand-blue/5 text-ink flex flex-col gap-1">
                           <div className="flex items-center justify-between">
                             <span>Preview Verification Code:</span>
                             <strong className="text-sm font-black tracking-widest bg-brand-blue/20 px-2 py-0.5">"N/A"</strong>
                           </div>
                           <p className="text-[9px] text-ink/60 lowercase italic">use this code directly to bypass and verify instantly</p>
                         </div>
                       )}
                       <input 
                         type="text" 
                         maxLength={6}
                         value={otpCode} 
                         onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                         placeholder="6-Digit OTP" 
                         className="w-full p-4 border border-ink bg-white focus:outline-none focus:border-brand-orange font-black tracking-widest text-center text-lg" 
                       />
                       {resetOtpSent && (
                         <input 
                           type="password" 
                           value={newPassword} 
                           onChange={e => setNewPassword(e.target.value)} 
                           placeholder="Enter New Password" 
                           className="w-full p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue font-bold text-center" 
                         />
                       )}
                     </div>
                   )}
                </div>

                <button 
                  onClick={handleAuth}
                  disabled={loading}
                  className="w-full h-14 bg-brand-blue text-paper font-mono font-black uppercase tracking-widest text-xs hover:bg-ink transition-colors disabled:opacity-50 mb-4"
                >
                  {isForgotPasswordMode 
                    ? (resetOtpSent ? 'Save Password' : availableEmails ? 'Send Verification OTP' : 'Find Account') 
                    : isSignUpMode 
                      ? (otpSent ? 'Confirm Registration' : 'Register Account') 
                      : 'Sign In'}
                </button>

                {!isForgotPasswordMode && !otpSent && (
                  <>
                    <div className="relative flex items-center justify-center mb-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink/20"></div></div>
                      <div className="relative bg-paper px-4 font-mono text-[9px] font-black uppercase tracking-widest text-ink/40">or</div>
                    </div>

                    <button 
                      onClick={handleGoogleSSO}
                      disabled={loading}
                      className="w-full h-14 border border-ink bg-paper text-ink font-mono font-black uppercase tracking-widest text-xs hover:bg-brand-acid transition-colors disabled:opacity-50 flex items-center justify-center gap-3 mb-3"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </button>

                    <button 
                      onClick={handleGitHubSSO}
                      disabled={loading}
                      className="w-full h-14 border border-ink bg-paper text-ink font-mono font-black uppercase tracking-widest text-xs hover:bg-brand-acid transition-colors disabled:opacity-50 flex items-center justify-center gap-3 mb-6"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 11.996c0 4.42 2.865 8.163 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.907-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.024A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.293 2.747-1.024 2.747-1.024.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.155 22 16.417 22 11.996 22 6.477 17.522 2 12 2z" />
                      </svg>
                      Continue with GitHub
                    </button>
                  </>
                )}

                <div className="text-center font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 flex flex-col gap-2">
                  {!isForgotPasswordMode && !isSignUpMode && (
                    <button 
                      onClick={() => setIsForgotPasswordMode(true)}
                      className="text-brand-orange hover:underline font-extrabold"
                    >
                      Forgot your password?
                    </button>
                  )}
                  {isForgotPasswordMode ? (
                    <button 
                      onClick={() => {
                        resetForm();
                      }}
                      className="text-brand-blue hover:underline text-ink mt-2 font-extrabold"
                    >
                      Back to Login
                    </button>
                  ) : (
                    <div>
                      {isSignUpMode ? 'Already have an account? ' : 'Need an account? '}
                      <button 
                        onClick={() => {
                          const wasSignup = isSignUpMode;
                          resetForm();
                          setIsSignUpMode(!wasSignup);
                        }}
                        className="text-brand-blue hover:underline text-ink font-extrabold"
                      >
                        {isSignUpMode ? 'Sign In' : 'Sign Up'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
