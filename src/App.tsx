import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { ChatView } from './components/ChatView.js';
import { DocumentsView } from './components/DocumentsView.js';
import { AdminView } from './components/AdminView.js';
import { MetricsView } from './components/MetricsView.js';
import { AuthModal } from './components/AuthModal.js';
import { UserProfile, ConversationItem, ChatMessage } from './types.js';
import { ApiService } from './services/api.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'admin' | 'metrics'>('chat');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [readyStatus, setReadyStatus] = useState<any>(null);

  // Chat State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  // Initialize user & ready status
  useEffect(() => {
    const init = async () => {
      try {
        const [user, ready] = await Promise.all([
          ApiService.getMe(),
          ApiService.getReadyStatus(),
        ]);
        if (user) {
          setCurrentUser(user);
        }
        setReadyStatus(ready);
      } catch (err) {
        console.error('Initialization error', err);
      }
    };
    init();
  }, []);

  // Fetch conversations when user changes
  useEffect(() => {
    const loadConversations = async () => {
      if (currentUser) {
        try {
          const convs = await ApiService.getConversations();
          setConversations(convs);
        } catch (err) {
          console.error('Failed to load conversations', err);
        }
      } else {
        setConversations([]);
      }
    };
    loadConversations();
  }, [currentUser]);

  // Load conversation messages when currentConversationId changes
  useEffect(() => {
    const loadMessages = async () => {
      if (currentConversationId) {
        try {
          const msgs = await ApiService.getConversationMessages(currentConversationId);
          setMessages(msgs);
        } catch (err) {
          console.error('Failed to load conversation messages', err);
        }
      }
    };
    loadMessages();
  }, [currentConversationId]);

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setActiveTab('chat');
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setActiveTab('chat');
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await ApiService.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setCurrentUser(null);
    setConversations([]);
    setCurrentConversationId(null);
    setMessages([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f1f5] text-zinc-900 selection:bg-zinc-900 selection:text-white font-sans antialiased relative overflow-hidden">
      {/* Ambient Liquid Orbs Layer behind Glass */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-36 -left-32 w-[620px] h-[620px] rounded-full bg-gradient-to-br from-slate-300/50 via-zinc-200/40 to-transparent blur-3xl animate-liquid-1" />
        <div className="absolute top-1/4 -right-32 w-[680px] h-[680px] rounded-full bg-gradient-to-bl from-zinc-300/45 via-slate-200/35 to-transparent blur-3xl animate-liquid-2" />
        <div className="absolute -bottom-44 left-1/3 w-[560px] h-[560px] rounded-full bg-gradient-to-tr from-slate-300/40 via-stone-200/30 to-transparent blur-3xl animate-liquid-3" />
        {/* Subtle Liquid Prismatic Highlights */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[400px] rounded-[100%] bg-gradient-to-r from-white/30 via-slate-100/20 to-white/40 blur-2xl" />
      </div>

      {/* Top Navbar */}
      <div className="relative z-40">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          readyStatus={readyStatus}
        />
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {activeTab === 'chat' && (
          <ChatView
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            messages={messages}
            setMessages={setMessages}
            isAsking={isAsking}
            setIsAsking={setIsAsking}
          />
        )}

        {activeTab === 'documents' && <DocumentsView />}

        {activeTab === 'admin' && (
          <AdminView
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'metrics' && (
          <MetricsView
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
}
