import React, { useEffect, useState } from 'react';
import { UserProfile, Chat as ChatType } from '../types/chat';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Search } from 'lucide-react';

interface ChatSidebarProps {
  chats: ChatType[];
  currentUser: UserProfile;
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
}

export default function ChatSidebar({ chats, currentUser, selectedChatId, onSelectChat }: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = chats.filter(chat => {
    const otherMember = chat.members.find(m => m !== currentUser.username);
    return otherMember?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="p-2">
        <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-3 py-1.5 focus-within:bg-white focus-within:shadow-sm transition-all border border-transparent focus-within:border-gray-100">
          <Search className="w-4 h-4 text-gray-400 mr-3" />
          <input 
            type="text"
            placeholder="Search or start new chat"
            className="bg-transparent border-none outline-none text-sm w-full py-1 h-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {searchTerm ? 'No results found' : 'No chats yet. Add a contact to start messaging!'}
          </div>
        ) : (
          filteredChats.map(chat => (
            <ChatItem 
              key={chat.id} 
              chat={chat} 
              currentUser={currentUser} 
              isActive={chat.id === selectedChatId}
              onClick={() => onSelectChat(chat.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChatItem({ chat, currentUser, isActive, onClick }: { 
  chat: ChatType, 
  currentUser: UserProfile, 
  isActive: boolean,
  onClick: () => void,
  key?: string
}) {
  const otherUsername = chat.members.find(m => m !== currentUser.username);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const otherUid = chat.memberUids.find(uid => uid !== currentUser.uid);
      if (otherUid) {
        const docSnap = await getDoc(doc(db, 'users', otherUid));
        if (docSnap.exists()) {
          setOtherProfile(docSnap.data() as UserProfile);
        }
      }
    };
    fetchProfile();
  }, [chat, currentUser.uid]);

  const lastMessageTime = chat.updatedAt?.toDate();

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 gap-3 transition-colors ${
        isActive ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
      }`}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500 text-xl font-semibold">
        {otherProfile?.displayName ? otherProfile.displayName[0] : otherUsername?.[0].toUpperCase()}
      </div>
      
      <div className="flex-1 min-w-0 border-b border-gray-100 py-1 text-left">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className="font-semibold text-gray-900 truncate">
            {otherProfile?.displayName || otherUsername}
          </h3>
          {lastMessageTime && (
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(lastMessageTime, { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center h-5">
          <p className="text-sm text-gray-500 truncate pr-2">
            {chat.lastMessage ? chat.lastMessage.text : <span className="italic">No messages yet</span>}
          </p>
          {chat.lastMessage && chat.lastMessage.senderId === currentUser.username && (
             <span className="text-[10px] text-[#00a884] font-bold">SENT</span>
          )}
        </div>
      </div>
    </button>
  );
}
