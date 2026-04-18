import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Chat as ChatType, Message } from '../types/chat';
import { Send, MoreVertical, Search, Paperclip, Smile, Phone, Video, ArrowLeft, Camera, Image, FileText, Headphones, MapPin, X } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface ChatWindowProps {
  chat: ChatType;
  currentUser: UserProfile;
  onBack?: () => void;
}

export default function ChatWindow({ chat, currentUser, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInputText(prev => prev + emojiData.emoji);
  };

  useEffect(() => {
    // Fetch other user's profile
    const otherUid = chat.memberUids.find(uid => uid !== currentUser.uid);
    if (otherUid) {
      getDoc(doc(db, 'users', otherUid)).then(snap => {
        if (snap.exists()) setOtherProfile(snap.data() as UserProfile);
      });
    }

    // Subscribe to messages
    const q = query(
      collection(db, 'chats', chat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chat, currentUser.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText;
    setInputText('');

    try {
      const msgData = {
        senderId: currentUser.username,
        senderUid: currentUser.uid,
        text,
        type: 'text',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'chats', chat.id, 'messages'), msgData);
      
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: {
          text,
          senderId: currentUser.username,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative">
      {/* Chat Header */}
      <div className="h-16 flex items-center justify-between px-2 md:px-4 bg-[#f0f2f5] border-b border-gray-200">
        <div className="flex items-center gap-1 md:gap-3 flex-1 min-w-0">
          {/* Back button on mobile */}
          <button 
            onClick={onBack}
            className="md:hidden p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold overflow-hidden flex-shrink-0">
            {otherProfile?.displayName ? otherProfile.displayName[0] : chat.members.find(m => m !== currentUser.username)?.[0].toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden">
            <h3 className="font-semibold text-gray-900 leading-tight truncate">
              {otherProfile?.displayName || chat.members.find(m => m !== currentUser.username)}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {otherProfile?.status || 'Active'}
            </p>
          </div>
        </div>
        <div className="flex gap-4 md:gap-5 text-gray-500 flex-shrink-0">
          <div className="hidden sm:flex gap-5">
            <Video className="w-5 h-5 cursor-not-allowed opacity-50" />
            <Phone className="w-5 h-5 cursor-not-allowed opacity-50" />
          </div>
          <Search className="w-5 h-5 cursor-pointer hover:text-gray-700 hidden xs:block" />
          <MoreVertical className="w-5 h-5 cursor-pointer hover:text-gray-700" />
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:px-16 lg:px-24 flex flex-col gap-1 custom-scrollbar"
        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}
      >
        <div className="flex justify-center my-4">
          <span className="bg-[#E1F3FB] text-[#54656F] text-[11px] px-3 py-1 rounded-lg uppercase font-medium shadow-sm">
            End-to-End Encrypted Identity
          </span>
        </div>

        {messages.map((msg, index) => {
          const isMine = msg.senderUid === currentUser.uid;
          const showDate = index === 0 || 
            (msg.createdAt && messages[index-1].createdAt && 
             format(msg.createdAt.toDate(), 'yyyy-MM-dd') !== format(messages[index-1].createdAt.toDate(), 'yyyy-MM-dd'));

          return (
            <div key={msg.id}>
              {showDate && msg.createdAt && (
                <div className="flex justify-center my-4">
                  <span className="bg-white text-gray-500 text-[11px] px-3 py-1 rounded shadow-sm font-medium">
                    {format(msg.createdAt.toDate(), 'MMMM d, yyyy')}
                  </span>
                </div>
              )}
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`max-w-[85%] sm:max-w-[70%] px-2 py-1.5 rounded-lg shadow-sm relative group ${
                    isMine ? 'bg-[#dcf8c6] rounded-tr-none ml-10' : 'bg-white rounded-tl-none mr-10'
                  }`}
                >
                  <p className="text-[14.5px] text-gray-900 leading-relaxed pr-8 whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                  <div className="absolute right-1 bottom-1 flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">
                      {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '--:--'}
                    </span>
                    {isMine && <span className="text-[10px] text-blue-500">✓✓</span>}
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-3 relative">
        <div className="relative">
          <button 
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachmentMenu(false);
            }}
            className={`p-1 rounded-full transition-colors ${showEmojiPicker ? 'text-[#00a884]' : 'text-gray-500'}`}
          >
            {showEmojiPicker ? <X className="w-6 h-6" /> : <Smile className="w-6 h-6" />}
          </button>
          
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-16 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden"
              >
                <EmojiPicker 
                  onEmojiClick={onEmojiClick} 
                  autoFocusSearch={false}
                  theme={Theme.LIGHT}
                  width={320}
                  height={400}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button 
            type="button"
            onClick={() => {
              setShowAttachmentMenu(!showAttachmentMenu);
              setShowEmojiPicker(false);
            }}
            className={`p-1 rounded-full transition-colors ${showAttachmentMenu ? 'text-[#00a884]' : 'text-gray-500'} -rotate-45`}
          >
            <Paperclip className="w-6 h-6" />
          </button>

          <AnimatePresence>
            {showAttachmentMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-16 left-0 z-50 bg-white rounded-2xl shadow-2xl p-4 flex flex-col gap-4 min-w-[200px]"
              >
                <AttachmentOption icon={<FileText className="text-purple-500" />} label="Document" color="bg-purple-50" />
                <AttachmentOption icon={<Camera className="text-pink-500" />} label="Camera" color="bg-pink-50" />
                <AttachmentOption icon={<Image className="text-blue-500" />} label="Gallery" color="bg-blue-50" />
                <AttachmentOption icon={<Headphones className="text-orange-500" />} label="Audio" color="bg-orange-50" />
                <AttachmentOption icon={<MapPin className="text-green-500" />} label="Location" color="bg-green-50" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form onSubmit={handleSendMessage} className="flex-1 flex gap-3">
          <input
            type="text"
            placeholder="Type a message"
            className="flex-1 bg-white border-none outline-none rounded-lg px-4 py-2.5 text-[15px] shadow-sm"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => {
              setShowEmojiPicker(false);
              setShowAttachmentMenu(false);
            }}
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${
              inputText.trim() ? 'bg-[#00a884] shadow-md active:scale-95' : 'bg-transparent text-gray-500'
            }`}
          >
            <Send className={`w-5 h-5 ${inputText.trim() ? 'text-white' : ''}`} />
          </button>
        </form>
      </div>
    </div>
  );
}

function AttachmentOption({ icon, label, color }: { icon: React.ReactNode, label: string, color: string }) {
  return (
    <button className="flex items-center gap-4 group w-full text-left">
      <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}
