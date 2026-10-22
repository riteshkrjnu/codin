import { apiUrl } from './apiUrl';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('gdrive_access_token') : null;
let cachedEmail: string | null = typeof window !== 'undefined' ? localStorage.getItem('gdrive_email') : null;

export const signInWithGoogle = async (): Promise<{ accessToken: string; email: string }> => {
  return new Promise((resolve, reject) => {
    // Create the modal overlay container
    const overlay = document.createElement('div');
    overlay.id = 'google-auth-overlay-modal';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.backdropFilter = 'blur(4px)';

    // Modal Content template in robust brutalist style matching LMS
    overlay.innerHTML = `
      <div style="background-color: #faf8f5; border: 4px solid #000000; padding: 28px; max-width: 440px; width: 90%; box-shadow: 8px 8px 0px #000000; font-family: Inter, system-ui, -apple-system, sans-serif; box-sizing: border-box; text-align: left;">
        <div style="margin-bottom: 20px;">
          <span style="font-family: monospace; font-weight: bold; background: #bef264; color: #1e293b; padding: 4px 8px; border: 1.5px solid #000; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
            ⚡ Google API Gateway
          </span>
          <h2 style="font-family: monospace; font-size: 20px; font-weight: 900; color: #000; margin: 14px 0 6px; text-transform: uppercase; tracking: -0.02em;">
            Connect Google Services
          </h2>
          <p style="font-size: 13px; line-height: 1.5; color: #374151; margin: 0;">
            Connect your profile to schedule Live Google Meet classrooms, create scheduled YouTube Broadcasts, and sync study recordings to Google Drive.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
          <!-- Real Google Account Option -->
          <button id="btn-real-google-auth" style="background: #ffffff; border: 2.5px solid #000; padding: 14px; text-align: left; cursor: pointer; transition: all 0.1s ease; box-shadow: 3px 3px 0px #000; outline: none; width: 100%;">
            <div style="font-family: monospace; font-weight: 950; font-size: 13px; text-transform: uppercase; color: #000; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 15px;">🔑</span> Sign in with Google (Live)
            </div>
            <div style="font-size: 11px; color: #4b5563; line-height: 1.4;">
              Authorizes real API requests securely using standard Google Client flow. Useful when Client ID is configured in settings.
            </div>
          </button>
        </div>

        <div style="margin-bottom: 20px; padding: 12px; border: 2px dashed #000; background: #fffbeb; font-size: 11px; line-height: 1.4; color: #78350f; font-family: monospace;">
          <strong>📋 Google Console Setup:</strong>
          <div style="margin-top: 6px;">
            1. Authorized Redirect URI:<br/>
            <code id="google-redirect-indicator" style="background: #fef3c7; display: block; border: 1px solid #f59e0b; padding: 4px; font-weight: bold; word-break: break-all; margin-top: 2px; text-transform: none; color: #000;">...</code>
          </div>
          <div style="margin-top: 6px;">
            2. Google App Publishing status is "Testing" by default. You MUST add your active Gmail address to the <strong>Test Users</strong> list in the OAuth Consent Screen of your Google Cloud Console, otherwise Google will block authorization.
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button id="btn-cancel-google-auth" style="background: #ffffff; border: 2px solid #000; padding: 6px 12px; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; cursor: pointer;">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const redirectIndicator = document.getElementById('google-redirect-indicator');
    if (redirectIndicator) {
      redirectIndicator.innerText = new URL(apiUrl('/api/google-oauth-callback'), window.location.origin).href;
    }

    const cleanup = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    const btnReal = document.getElementById('btn-real-google-auth') as HTMLButtonElement | null;
    const btnCancel = document.getElementById('btn-cancel-google-auth') as HTMLButtonElement | null;

    if (btnReal) {
      btnReal.onmouseover = () => {
        btnReal.style.backgroundColor = '#f8fafc';
        btnReal.style.transform = 'translate(1px, 1px)';
        btnReal.style.boxShadow = '2px 2px 0px #000';
      };
      btnReal.onmouseout = () => {
        btnReal.style.backgroundColor = '#ffffff';
        btnReal.style.transform = 'translate(0px, 0px)';
        btnReal.style.boxShadow = '3px 3px 0px #000';
      };
    }

    if (btnCancel) {
      btnCancel.onmouseover = () => btnCancel.style.backgroundColor = '#f1f5f9';
      btnCancel.onmouseout = () => btnCancel.style.backgroundColor = '#ffffff';
      btnCancel.onclick = () => {
        cleanup();
        reject(new Error('Google Auth cancelled.'));
      };
    }

    if (btnReal) {
      btnReal.onclick = async () => {
        try {
          if (btnReal) {
            btnReal.disabled = true;
            btnReal.innerHTML = '<div style="font-family: monospace; font-weight: bold; font-size: 13px;">🔄 Loading Google Popup...</div>';
          }
          
          const targetPopup = window.open(
            'about:blank',
            'google_oauth_popup',
            'width=600,height=700,status=no,toolbar=no,menubar=no,location=yes'
          );
          
          if (!targetPopup) {
            cleanup();
            reject(new Error('Popup blocked! Please allow popups for this site to complete live Google login.'));
            return;
          }

          let client_id = '';
          try {
            const idRes = await fetch('/api/google-client-id');
            if (idRes.ok) {
              const idData = await idRes.json();
              client_id = idData.clientId;
            }
          } catch (e) {
            console.warn('Failed to fetch client ID', e);
          }
          
          if (!client_id || client_id === 'dummy_client_id_for_preview') {
            client_id = '810054501192-clvsh6i0mca0sm4id2e6cl3h3ms9g2p8.apps.googleusercontent.com';
          }

          const redirectUri = new URL(apiUrl('/api/google-oauth-callback'), window.location.origin).href;
          const scopes = [
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/meetings.space.created',
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.file'
          ].join(' ');

          const params = new URLSearchParams({
            client_id: client_id,
            redirect_uri: redirectUri,
            response_type: 'token',
            scope: scopes
          });

          const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
          targetPopup.location.href = authUrl;

          const handleAuthMessage = (event: MessageEvent) => {
            const origin = event.origin;
            if (origin !== new URL(apiUrl('/api'), window.location.origin).origin || event.source !== targetPopup) {
              return;
            }

            if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
              window.removeEventListener('message', handleAuthMessage);
              cleanup();

              const token = event.data.accessToken;
              const email = event.data.email || 'authorized-google@gmail.com';

              cachedAccessToken = token;
              cachedEmail = email;
              localStorage.setItem('gdrive_access_token', token);
              localStorage.setItem('gdrive_email', email);

              resolve({ accessToken: token, email: email });
            } else if (event.data?.type === 'GOOGLE_OAUTH_FAILURE') {
              window.removeEventListener('message', handleAuthMessage);
              cleanup();
              reject(new Error(event.data.error || 'Google Authorization cancelled.'));
            }
          };

          window.addEventListener('message', handleAuthMessage);

          const checkClosed = setInterval(() => {
            if (targetPopup.closed) {
              clearInterval(checkClosed);
              window.removeEventListener('message', handleAuthMessage);
              cleanup();
              reject(new Error('Auth popup closed before completion.'));
            }
          }, 1000);

        } catch (err: any) {
          cleanup();
          reject(err);
        }
      };
    }
  });
};

export const getCachedToken = () => cachedAccessToken;
export const getCachedEmail = () => cachedEmail;

export const clearCachedToken = () => {
  cachedAccessToken = null;
  cachedEmail = null;
  localStorage.removeItem('gdrive_access_token');
  localStorage.removeItem('gdrive_email');
};

export const disconnectGoogle = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
  }
  clearCachedToken();
};
