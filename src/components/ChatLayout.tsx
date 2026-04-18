import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  doc,
  setDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile, Chat as ChatType } from '../types/chat';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import { MessageSquare, LogOut, UserPlus, Shield, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatLayoutProps {
  currentUser: UserProfile;
}

export default function ChatLayout({ currentUser }: ChatLayoutProps) {
  const [chats, setChats] = useState<ChatType[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    // Listen to user's chats
    const q = query(
      collection(db, 'chats'),
      where('memberUids', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatType[];
      
      // Sort in memory to avoid missing index errors
      const sorted = chatList.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });

      setChats(sorted);
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);
    setSearchError('');

    try {
      const targetId = searchId.toLowerCase().replace('@', '');
      
      if (targetId === currentUser.username) {
        setSearchError("You can't message yourself!");
        setSearchLoading(false);
        return;
      }

      // Check if username exists
      const usernameDoc = await getDoc(doc(db, 'usernames', targetId));
      if (!usernameDoc.exists()) {
        setSearchError("User ID not found.");
        setSearchLoading(false);
        return;
      }

      const targetUid = usernameDoc.data().uid;

      // Check if chat already exists
      const chatId = [currentUser.uid, targetUid].sort().join('_');
      const chatDoc = await getDoc(doc(db, 'chats', chatId));

      if (!chatDoc.exists()) {
        await setDoc(doc(db, 'chats', chatId), {
          memberUids: [currentUser.uid, targetUid],
          members: [currentUser.username, targetId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setSelectedChatId(chatId);
      setIsAddingContact(false);
      setSearchId('');
    } catch (err) {
      console.error(err);
      setSearchError("Failed to add contact.");
    } finally {
      setSearchLoading(false);
    }
  };

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden relative">
      {/* Sidebar - Hidden on mobile when a chat is selected */}
      <div className={`
        ${selectedChatId ? 'hidden md:flex' : 'flex'} 
        w-full md:w-[30%] md:min-w-[320px] md:max-w-[450px] flex-col border-r border-gray-300 bg-white
      `}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 bg-[#f0f2f5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold shadow-sm">
              {currentUser.displayName[0]}
            </div>
            <div className="flex flex-col md:hidden">
              <span className="font-semibold text-sm">Chats</span>
            </div>
          </div>
          <div className="flex gap-2 text-gray-600">
            <button 
              onClick={() => setIsAddingContact(true)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Add Contact"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <ChatSidebar 
          chats={chats} 
          currentUser={currentUser} 
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
        />
      </div>

      {/* Main Content - Full screen on mobile when selected, hidden when not */}
      <div className={`
        ${selectedChatId ? 'flex' : 'hidden md:flex'} 
        flex-1 flex flex-col bg-[#efeae2] relative
      `}>
        {selectedChat ? (
          <ChatWindow 
            chat={selectedChat} 
            currentUser={currentUser} 
            onBack={() => setSelectedChatId(null)}
          />
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#f0f2f5]">
            <div className="w-64 h-64 opacity-20 mb-8">
              <MessageSquare className="w-full h-full text-[#00a884]" />
            </div>
            <h1 className="text-3xl font-light text-gray-600">WhatsApp for the Privacy-Conscious</h1>
            <p className="text-gray-500 mt-4 max-w-sm">
              Send and receive messages without sharing your phone number. 
              Search for friends by their unique ID to start chatting.
            </p>
            <div className="mt-10 pt-10 border-t border-gray-200 w-full max-w-lg">
              <p className="text-xs text-gray-400 flex items-center justify-center gap-2">
                <Shield className="w-3 h-3" /> End-to-end encrypted feel with PrivaChat IDs
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {isAddingContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingContact(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            >
              <h2 className="text-xl font-bold mb-4">Add Contact</h2>
              <form onSubmit={handleAddContact} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Enter unique ID"
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                  />
                </div>
                {searchError && <p className="text-red-500 text-sm">{searchError}</p>}
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsAddingContact(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={searchLoading}
                    className="flex-1 py-3 bg-[#00a884] text-white rounded-xl hover:bg-[#008f6f] transition-colors flex items-center justify-center"
                  >
                    {searchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Chat'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
