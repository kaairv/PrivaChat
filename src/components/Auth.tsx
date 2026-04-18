import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { UserProfile } from '../types/chat';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Loader2, MessageSquare, LogOut } from 'lucide-react';

interface AuthProps {
  onProfileCreated: (profile: UserProfile) => void;
}

export default function Auth({ onProfileCreated }: AuthProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'login' | 'setup'>('login');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user already has a profile
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        onProfileCreated(docSnap.data() as UserProfile);
      } else {
        setCurrentUser(user);
        setDisplayName(user.displayName || '');
        setStep('setup');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setLoading(true);
    setError('');

    const cleanUsername = username.toLowerCase().trim().replace('@', '');

    try {
      // 1. Check if username is taken
      const usernameRef = doc(db, 'usernames', cleanUsername);
      const usernameSnap = await getDoc(usernameRef);
      
      if (usernameSnap.exists()) {
        setError('This ID is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // 2. Create User Profile
      const userProfile: UserProfile = {
        uid: currentUser.uid,
        username: cleanUsername,
        displayName: displayName || currentUser.displayName || 'User',
        status: 'Available',
        createdAt: serverTimestamp() as any,
        lastSeen: serverTimestamp() as any,
      };

      await setDoc(usernameRef, { uid: currentUser.uid });
      await setDoc(doc(db, 'users', currentUser.uid), userProfile);
      onProfileCreated(userProfile);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Profile creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#00a884] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Shield className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">PrivaChat</h1>
          <p className="text-gray-500 text-center mt-2">
            Secure messaging with unique IDs. <br /> Private by default.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'login' ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-5 h-5 opacity-0 absolute" alt="" />
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.form 
              key="setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleCreateProfile} 
              className="space-y-4"
            >
              <p className="text-sm font-medium text-[#00a884] bg-[#e7f6f2] p-3 rounded-lg border border-[#c4e8e0]">
                Success! Now choose your unique PrivaChat ID.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Choose Your Unique ID
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">@</span>
                  <input
                    autoFocus
                    type="text"
                    required
                    placeholder="handle_name"
                    className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition-all font-mono"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">This is how others will find you.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Elon"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition-all"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
              </button>
              
              <button 
                type="button"
                onClick={() => { auth.signOut(); setStep('login'); }}
                className="w-full py-2 text-gray-400 text-xs flex items-center justify-center gap-1 hover:text-gray-600 transition-all font-medium"
              >
                <LogOut className="w-3 h-3" /> Sign out and start over
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100"
          >
            {error}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
