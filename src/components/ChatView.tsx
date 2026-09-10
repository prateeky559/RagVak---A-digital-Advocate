import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  BookOpen,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  RotateCcw,
  Scale,
  Globe,
  Mic,
  MicOff,
  Camera,
  Paperclip,
  ArrowUp,
  FileUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, ConversationItem, AttachmentItem } from '../types.js';
import { ApiService } from '../services/api.js';

interface ChatViewProps {
  conversations: ConversationItem[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isAsking: boolean;
  setIsAsking: (val: boolean) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  messages,
  setMessages,
  isAsking,
  setIsAsking,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [topK, setTopK] = useState<number>(5);
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, number>>({});
  const [feedbackComment, setFeedbackComment] = useState<{ [msgId: string]: string }>({});
  const [showCommentBox, setShowCommentBox] = useState<{ [msgId: string]: boolean }>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [attachedFiles, setAttachedFiles] = useState<AttachmentItem[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechBaseTextRef = useRef<string>('');
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Close attach menu on outside click & cleanup speech recognition
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Voice Input (Speech Recognition)
  const toggleVoiceInput = () => {
    setSpeechError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Voice input is not supported in this browser. Try Chrome or Edge.');
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      // Use navigator language or Indian English/US English for best recognition of legal queries
      recognition.lang = navigator.language || 'en-IN';

      // Capture base text before current speech recognition session
      speechBaseTextRef.current = inputQuery.trim();

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        // Safely iterate all results from 0 to length
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) {
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }
        }

        const recognizedCurrent = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
        const base = speechBaseTextRef.current;

        if (base && recognizedCurrent) {
          setInputQuery(`${base} ${recognizedCurrent}`);
        } else if (recognizedCurrent) {
          setInputQuery(recognizedCurrent);
        } else if (base) {
          setInputQuery(base);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice input error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in browser settings.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech detected. Please speak clearly into your mic.');
        } else {
          setSpeechError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError('Could not initialize microphone. Please check permissions.');
      setIsListening(false);
      setTimeout(() => setSpeechError(null), 5000);
    }
  };

  // Image Upload Handler
  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setSpeechError('Please select a valid image file (PNG, JPG, WebP).');
        setTimeout(() => setSpeechError(null), 4000);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setSpeechError('Image exceeds 10MB size limit.');
        setTimeout(() => setSpeechError(null), 4000);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const newItem: AttachmentItem = {
          id: `att_img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          size: file.size,
          type: 'image',
          mimeType: file.type,
          previewUrl: reader.result as string,
        };
        setAttachedFiles(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    }

    if (imageInputRef.current) imageInputRef.current.value = '';
    setShowAttachMenu(false);
  };

  // Document Upload Handler
  const handleDocSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        setSpeechError('Document exceeds 15MB size limit.');
        setTimeout(() => setSpeechError(null), 4000);
        continue;
      }

      let extractedText = '';
      try {
        if (
          file.type.includes('text') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.csv')
        ) {
          extractedText = await file.text();
        } else {
          // Extract text representation from binary document
          const buffer = await file.arrayBuffer();
          const raw = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          const matches = raw.match(/\(([^()]+)\)\s*T[jJ]/g);
          if (matches && matches.length > 0) {
            extractedText = matches
              .map(m => m.replace(/^\(/, '').replace(/\)\s*T[jJ]$/, ''))
              .join(' ')
              .slice(0, 3000);
          } else {
            const clean = raw.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
            extractedText = clean.length > 40 ? clean.slice(0, 2500) : `Document: ${file.name}`;
          }
        }
      } catch (err) {
        extractedText = `Attached legal document: ${file.name}`;
      }

      const newItem: AttachmentItem = {
        id: `att_doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        size: file.size,
        type: 'document',
        mimeType: file.type || 'application/octet-stream',
        extractedText: extractedText.trim(),
      };
      setAttachedFiles(prev => [...prev, newItem]);
    }

    if (docInputRef.current) docInputRef.current.value = '';
    setShowAttachMenu(false);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachedFiles(prev => prev.filter(item => item.id !== id));
  };

  const samplePrompts = [
    {
      label: 'Attempt to Murder (IPC 307 / BNS 109)',
      prompt: 'What are the essential ingredients, punishment, and bailable status for Attempt to Murder under Section 307 IPC and Section 109 BNS?',
    },
    {
      label: 'Anticipatory & Regular Bail',
      prompt: 'How does anticipatory bail work under Section 438 CrPC / 482 BNSS compared to regular bail under Section 439 CrPC / 483 BNSS?',
    },
    {
      label: 'Cheque Bounce (NI Act 138)',
      prompt: 'What is the statutory procedure, legal notice timeline, and punishment for cheque bounce under Section 138 of the Negotiable Instruments Act?',
    },
    {
      label: 'GDPR Right to Erasure',
      prompt: 'Under GDPR Article 17, what are the specific grounds and exceptions for the right to erasure?',
    },
    {
      label: 'CCPA Right to Delete',
      prompt: 'What are the consumer rights to delete personal information under CCPA Section 1798.105?',
    },
    {
      label: 'Mandatory FIR Registration',
      prompt: 'Under Section 154 CrPC and Section 173 BNSS, when is registration of an FIR mandatory for police?',
    },
    {
      label: 'UCC Implied Warranty',
      prompt: 'Explain the implied warranty of merchantability under UCC Section 2-314.',
    },
    {
      label: 'Murder vs Culpable Homicide',
      prompt: 'Explain the distinction and prescribed punishment for Murder under Section 302 IPC / Section 103 BNS.',
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAsking]);

  const handleSend = async (textToSend?: string) => {
    const rawQuestion = (textToSend !== undefined ? textToSend : inputQuery).trim();
    if ((!rawQuestion && attachedFiles.length === 0) || isAsking) return;

    const currentAttachments = [...attachedFiles];
    const questionText =
      rawQuestion ||
      (currentAttachments.some(f => f.type === 'image')
        ? 'Please analyze this attached legal notice / document image under relevant laws and explain its key provisions, obligations, and legal implications.'
        : 'Please analyze this attached legal document, summarize key clauses, and highlight relevant legal rights and liabilities.');

    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      conversation_id: currentConversationId || undefined,
      role: 'user',
      content: questionText,
      created_at: new Date().toISOString(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setAttachedFiles([]);
    setIsAsking(true);

    try {
      // Build combined context with attached document text if available
      let promptWithContext = questionText;
      const docsWithText = currentAttachments.filter(a => a.extractedText);
      if (docsWithText.length > 0) {
        const textSnippets = docsWithText
          .map(d => `\n\n[Attached Document: "${d.name}"]:\n${d.extractedText?.slice(0, 2500)}`)
          .join('\n');
        promptWithContext += textSnippets;
      }

      const response = await ApiService.ask({
        question: promptWithContext,
        conversation_id: currentConversationId || undefined,
        top_k: topK,
        jurisdiction_filter: jurisdictionFilter || undefined,
        attachments: currentAttachments,
      });

      const assistantMessage: ChatMessage = {
        id: response.message_id,
        conversation_id: response.conversation_id,
        role: 'assistant',
        content: response.answer,
        created_at: new Date().toISOString(),
        citations: response.citations,
        safety_classification: response.safety_classification,
        latency_ms: response.latency_ms,
        disclaimer: response.disclaimer,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.conversation_id && !currentConversationId) {
        onSelectConversation(response.conversation_id);
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to retrieve legal answer. Please try again.'}`,
        created_at: new Date().toISOString(),
        safety_classification: 'ERROR',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleFeedback = async (messageId: string, rating: 1 | -1) => {
    try {
      const comment = feedbackComment[messageId];
      await ApiService.submitFeedback(messageId, rating, comment);
      setFeedbackSubmitted(prev => ({ ...prev, [messageId]: rating }));
      setShowCommentBox(prev => ({ ...prev, [messageId]: false }));
    } catch (err) {
      console.error('Failed to submit feedback', err);
    }
  };

  const toggleCitation = (msgId: string) => {
    setExpandedCitations(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const currentConvTitle =
    conversations.find(c => c.id === currentConversationId)?.title || 'New Legal Inquiry';

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)] bg-transparent text-zinc-900 relative">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar (Responsive on Desktop and Mobile) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 sm:w-80 liquid-glass border-r border-white/70 flex flex-col shrink-0 transition-transform duration-200 ease-in-out shadow-[4px_0_30px_rgba(0,0,0,0.02)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Sidebar Header & New Chat Button */}
        <div className="p-3 border-b border-white/60 flex items-center justify-between gap-2 liquid-glass-subtle">
          <button
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 768) setIsSidebarOpen(false);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl liquid-glass-dark hover:brightness-110 text-white font-semibold text-xs transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Legal Inquiry</span>
          </button>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 rounded-xl text-zinc-500 hover:text-zinc-900 liquid-glass-subtle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Retrieval Controls */}
        <div className="p-3.5 border-b border-white/60 liquid-glass-subtle space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span className="font-medium flex items-center gap-1.5 text-zinc-800">
              <Sliders className="w-3.5 h-3.5 text-zinc-900" />
              Retrieval Top-K
            </span>
            <span className="font-mono text-zinc-900 liquid-glass-pill px-2 py-0.5 rounded-lg border border-white/80">
              {topK} Chunks
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="10"
            value={topK}
            onChange={e => setTopK(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-300/60 rounded-lg appearance-none cursor-pointer accent-zinc-900"
          />

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-600 flex items-center gap-1">
              <Globe className="w-3 h-3 text-zinc-500" />
              Jurisdiction Filter
            </label>
            <select
              value={jurisdictionFilter}
              onChange={e => setJurisdictionFilter(e.target.value)}
              className="w-full text-xs liquid-glass-subtle text-zinc-800 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 border border-white/80"
            >
              <option value="">All Jurisdictions (Global)</option>
              <option value="European Union">European Union (GDPR)</option>
              <option value="United States (California)">United States (California / CCPA)</option>
              <option value="United States (Uniform State Law)">United States (UCC State Law)</option>
              <option value="United States (Federal)">United States (Federal / DMCA)</option>
            </select>
          </div>
        </div>

        {/* Saved Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-mono tracking-widest uppercase text-zinc-500 flex items-center justify-between">
            <span>Inquiry History</span>
            <span className="text-zinc-500">({conversations.length})</span>
          </div>
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-400">
              No previous conversations. Start a new inquiry above.
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => {
                  onSelectConversation(conv.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                  currentConversationId === conv.id
                    ? 'liquid-glass-card border-white/90 text-zinc-950 font-semibold shadow-xs'
                    : 'text-zinc-700 hover:bg-white/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-zinc-500 group-hover:text-zinc-900" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-zinc-900 text-zinc-400 hover:bg-white/60 rounded-lg transition"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden bg-transparent">
        {/* Desktop & Mobile Chat Header Bar */}
        <div className="h-12 border-b border-white/60 liquid-glass px-3 sm:px-6 flex items-center justify-between gap-2 shrink-0 shadow-xs">
          {/* Left: Sidebar Toggle & Conversation Title */}
          <div className="flex items-center gap-2.5 truncate">
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-1.5 rounded-xl text-zinc-600 hover:text-zinc-900 liquid-glass-pill transition flex items-center gap-1 text-xs"
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
              <span className="hidden sm:inline text-[11px] font-mono">
                {isSidebarOpen ? 'Hide' : 'History'}
              </span>
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 hidden sm:block"></span>
              <span className="text-xs font-semibold text-zinc-900 truncate">
                {currentConvTitle}
              </span>
            </div>
          </div>

          {/* Right: Quick Desktop Controls (Jurisdiction, Top-K, Reset) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Jurisdiction Selector visible on Desktop Screen */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs liquid-glass-pill px-2.5 py-1 rounded-xl">
              <Globe className="w-3 h-3 text-zinc-500" />
              <select
                value={jurisdictionFilter}
                onChange={e => setJurisdictionFilter(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-700 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-white text-zinc-800">Global (All)</option>
                <option value="European Union" className="bg-white text-zinc-800">EU (GDPR)</option>
                <option value="United States (California)" className="bg-white text-zinc-800">California (CCPA)</option>
                <option value="United States (Uniform State Law)" className="bg-white text-zinc-800">UCC State Law</option>
                <option value="United States (Federal)" className="bg-white text-zinc-800">US Federal</option>
              </select>
            </div>

            {/* Quick Top-K Selector visible on Desktop Screen */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs liquid-glass-pill px-2.5 py-1 rounded-xl font-mono text-[11px] text-zinc-700">
              <Sliders className="w-3 h-3 text-zinc-500" />
              <span>Top-K:</span>
              <select
                value={topK}
                onChange={e => setTopK(parseInt(e.target.value, 10))}
                className="bg-transparent text-zinc-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="3" className="bg-white text-zinc-900">3</option>
                <option value="5" className="bg-white text-zinc-900">5</option>
                <option value="7" className="bg-white text-zinc-900">7</option>
                <option value="10" className="bg-white text-zinc-900">10</option>
              </select>
            </div>

            {/* New Inquiry Button */}
            <button
              onClick={onNewConversation}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl liquid-glass-pill hover:bg-white/80 text-zinc-700 text-xs transition"
              title="Start fresh inquiry"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Reset</span>
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
              {/* Minimalist Monochromatic Liquid Glass Hero Banner */}
              <div className="liquid-glass-card p-6 sm:p-8 rounded-3xl text-center space-y-3 shadow-lg border border-white/80">
                <div className="inline-flex items-center justify-center p-3.5 rounded-2xl liquid-glass-dark text-white shadow-md ring-1 ring-white/20">
                  <Scale className="w-7 h-7 stroke-[2]" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                  Verified Legal Document Assistant
                </h1>
                <p className="text-xs sm:text-sm text-zinc-600 max-w-xl mx-auto leading-relaxed">
                  Grounded in statutory criminal codes, commercial law, and privacy regulations with strict citation verification and anti-clutter synthesis.
                </p>
              </div>

              {/* Sample Legal Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {samplePrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    className="flex flex-col items-start p-4 rounded-2xl liquid-glass-card border border-white/80 text-left transition group shadow-xs"
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-xs font-semibold text-zinc-900 group-hover:text-black">
                        {item.label}
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 transition" />
                    </div>
                    <p className="text-xs text-zinc-600 group-hover:text-zinc-800 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>

              {/* Guardrails Notice */}
              <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/70 text-xs text-zinc-600 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 font-medium text-zinc-900">
                  <ShieldCheck className="w-4 h-4 text-zinc-900" />
                  <span>Verified Grounding & Safety Guardrails</span>
                </div>
                <p className="text-[11px] text-zinc-600">
                  Dual-layer retrieval pipeline verifies exact statutory ingredients, prescribed penalties, and court jurisdictions with numbered source citations.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Message Bubble Container */}
                  <div
                    className={`max-w-3xl p-5 sm:p-6 text-sm ${
                      msg.role === 'user'
                        ? 'liquid-glass-dark text-white font-medium rounded-3xl rounded-br-md shadow-lg border border-white/20 ring-1 ring-white/10'
                        : 'liquid-glass-card text-zinc-900 rounded-3xl rounded-bl-md shadow-md border border-white/90'
                    }`}
                  >
                    {/* Assistant Header & Badges */}
                    {msg.role === 'assistant' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-200/70">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 text-xs tracking-wide">
                            LexiRAG Assistant
                          </span>
                          {msg.safety_classification && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider liquid-glass-pill text-zinc-800 border border-white/80">
                              {msg.safety_classification.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>

                        {msg.latency_ms !== undefined && (
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {msg.latency_ms}ms
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message Body (Monochromatic Markdown) */}
                    {msg.role === 'assistant' ? (
                      <div className="text-zinc-800 text-sm leading-relaxed space-y-2">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-base font-bold text-zinc-900 mt-4 mb-2 pb-1 border-b border-zinc-200">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-sm font-bold text-zinc-900 mt-3.5 mb-1.5 pb-1 border-b border-zinc-200">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 mt-4 mb-1.5 flex items-center gap-2 pb-1 border-b border-zinc-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 inline-block shrink-0"></span>
                                <span>{children}</span>
                              </h3>
                            ),
                            h4: ({ children }) => (
                              <h4 className="text-xs font-bold text-zinc-800 mt-3 mb-1 uppercase tracking-wide">
                                {children}
                              </h4>
                            ),
                            p: ({ children }) => (
                              <p className="text-sm text-zinc-800 leading-relaxed my-1.5">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="space-y-1.5 my-2 pl-4 text-sm text-zinc-800 list-disc list-outside marker:text-zinc-500">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="space-y-1.5 my-2 pl-4 text-sm text-zinc-800 list-decimal list-outside marker:text-zinc-900 font-medium">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-relaxed pl-1 text-zinc-800 font-normal">
                                {children}
                              </li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-zinc-950">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="text-zinc-800 not-italic font-medium">
                                {children}
                              </em>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-2 border-zinc-400 pl-3.5 my-2.5 text-zinc-700 italic text-xs bg-zinc-50 py-2 rounded-r-md">
                                {children}
                              </blockquote>
                            ),
                            code: ({ children }) => (
                              <code className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 font-mono text-xs">
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.attachments.map(att => (
                              <div
                                key={att.id}
                                className="rounded-xl overflow-hidden bg-zinc-800/90 border border-zinc-700 p-2 flex items-center gap-2.5 max-w-xs"
                              >
                                {att.type === 'image' && att.previewUrl ? (
                                  <img
                                    src={att.previewUrl}
                                    alt={att.name}
                                    className="w-12 h-12 object-cover rounded-lg shrink-0 border border-zinc-700"
                                  />
                                ) : (
                                  <div className="p-2 rounded-lg bg-zinc-700 text-zinc-200 shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="text-[11px] text-zinc-200 truncate min-w-0">
                                  <div className="font-semibold truncate">{att.name}</div>
                                  <div className="text-[10px] text-zinc-400 font-mono">
                                    {(att.size / 1024).toFixed(1)} KB • {att.type === 'image' ? 'Image' : 'Document'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    )}

                    {/* Legal Disclaimer Footer */}
                    {msg.role === 'assistant' && msg.disclaimer && (
                      <div className="mt-4 pt-3 border-t border-zinc-200 flex items-start gap-2 text-[11px] text-zinc-500">
                        <AlertTriangle className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                        <span>{msg.disclaimer}</span>
                      </div>
                    )}

                    {/* Retrieved Citations Section */}
                    {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-200/60">
                        <button
                          onClick={() => toggleCitation(msg.id)}
                          className="flex items-center justify-between w-full text-xs font-semibold text-zinc-800 hover:text-zinc-950 transition"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-zinc-900" />
                            <span>Retrieved Authorities ({msg.citations.length} Sources Used)</span>
                          </div>
                          {expandedCitations[msg.id] ? (
                            <ChevronUp className="w-4 h-4 text-zinc-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                          )}
                        </button>

                        {expandedCitations[msg.id] && (
                          <div className="mt-3 space-y-2">
                            {msg.citations.map((cite, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-3.5 rounded-xl liquid-glass-subtle border border-white/80 text-xs space-y-1.5 shadow-2xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white bg-zinc-900 px-2 py-0.5 rounded-md text-[11px]">
                                      [{cIdx + 1}]
                                    </span>
                                    <span className="font-semibold text-zinc-900 truncate">
                                      {cite.document_title}
                                    </span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono liquid-glass-pill text-zinc-800 border border-white/80">
                                    {Math.round(cite.score * 100)}% Match
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-500 flex items-center gap-3">
                                  <span>Section: <strong className="text-zinc-700">{cite.section || 'General'}</strong></span>
                                  <span>Page: <strong className="text-zinc-700">{cite.page || '1'}</strong></span>
                                  <span>Jurisdiction: <strong className="text-zinc-700">{cite.jurisdiction || 'Federal'}</strong></span>
                                </div>
                                <p className="text-zinc-800 bg-white/80 backdrop-blur-xs p-2.5 rounded-lg font-mono text-[11px] border border-white/80 leading-normal">
                                  "{cite.snippet}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions & Feedback Row */}
                    {msg.role === 'assistant' && (
                      <div className="mt-4 pt-3 border-t border-zinc-200/60 flex items-center justify-between text-xs text-zinc-500">
                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 transition liquid-glass-pill px-2.5 py-1 rounded-lg"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-zinc-900" />
                              <span className="text-zinc-900 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Answer</span>
                            </>
                          )}
                        </button>

                        {/* Feedback Controls */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-500">Helpful?</span>
                          <button
                            onClick={() => handleFeedback(msg.id, 1)}
                            disabled={feedbackSubmitted[msg.id] !== undefined}
                            className={`p-1.5 rounded-xl border transition ${
                              feedbackSubmitted[msg.id] === 1
                                ? 'liquid-glass-dark text-white border-zinc-800'
                                : 'liquid-glass-pill hover:bg-white/80 text-zinc-700'
                            }`}
                            title="Helpful legal answer"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setShowCommentBox(prev => ({ ...prev, [msg.id]: !prev[msg.id] }));
                            }}
                            disabled={feedbackSubmitted[msg.id] !== undefined}
                            className={`p-1.5 rounded-xl border transition ${
                              feedbackSubmitted[msg.id] === -1
                                ? 'liquid-glass-dark text-white border-zinc-800'
                                : 'liquid-glass-pill hover:bg-white/80 text-zinc-700'
                            }`}
                            title="Unhelpful or missing citations"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Feedback Comment Box */}
                    {showCommentBox[msg.id] && (
                      <div className="mt-3 p-3.5 rounded-2xl liquid-glass-subtle border border-white/80 space-y-2">
                        <textarea
                          placeholder="Tell us what was missing or incorrect..."
                          value={feedbackComment[msg.id] || ''}
                          onChange={e =>
                            setFeedbackComment({ ...feedbackComment, [msg.id]: e.target.value })
                          }
                          className="w-full text-xs bg-white/90 backdrop-blur-xs border border-white/80 text-zinc-900 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none h-16"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              setShowCommentBox(prev => ({ ...prev, [msg.id]: false }))
                            }
                            className="px-3 py-1 text-xs text-zinc-500 hover:text-zinc-900 liquid-glass-pill rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, -1)}
                            className="px-3.5 py-1 text-xs liquid-glass-dark text-white rounded-lg font-semibold"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAsking && (
                <div className="flex items-center gap-3 p-4 rounded-2xl liquid-glass-card max-w-sm shadow-md border border-white/90">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-900 opacity-50"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-900"></span>
                  </div>
                  <span className="text-xs text-zinc-700 font-medium">
                    Retrieving legal documents & synthesizing citations...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Quick Sample Prompts Carousel Bar */}
        <div className="px-3 sm:px-6 py-2 liquid-glass-subtle border-t border-white/60 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-zinc-900" /> Quick:
          </span>
          {samplePrompts.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(item.prompt)}
              className="text-xs px-3 py-1 rounded-xl liquid-glass-pill hover:bg-white/90 text-zinc-700 transition whitespace-nowrap shrink-0 shadow-2xs"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-5 border-t border-white/70 liquid-glass shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.03)]">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Hidden File Inputs for Image and Document */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelected}
            />
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.txt,.docx,.doc,.json,.csv,.md"
              multiple
              className="hidden"
              onChange={handleDocSelected}
            />

            {/* Attached Items Preview Tray */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
                {attachedFiles.map(att => (
                  <div
                    key={att.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-pill text-xs text-zinc-900 shadow-2xs border border-white/80"
                  >
                    {att.type === 'image' && att.previewUrl ? (
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="w-5 h-5 object-cover rounded-full"
                      />
                    ) : (
                      <FileText className="w-4 h-4 text-zinc-700" />
                    )}
                    <span className="font-medium max-w-[160px] truncate">{att.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      ({(att.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="p-0.5 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-white/80 transition"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Active Voice Listening Banner */}
            {isListening && (
              <div className="flex items-center justify-between px-4 py-2.5 mb-2 rounded-2xl liquid-glass-dark text-white text-xs shadow-lg animate-pulse border border-white/20">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </div>
                  <span className="font-semibold">Listening...</span>
                  <span className="text-zinc-300 hidden sm:inline">
                    Speak your legal question clearly into the microphone
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className="px-2.5 py-1 rounded-lg liquid-glass-pill hover:bg-white/20 text-[11px] font-semibold text-white border border-white/30 transition"
                >
                  Done / Stop
                </button>
              </div>
            )}

            {/* Speech Notice or Error Alert */}
            {speechError && (
              <div className="flex items-center justify-between px-4 py-2 mb-2 rounded-xl liquid-glass-subtle border border-white/80 text-xs text-zinc-800 shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-zinc-800 shrink-0" />
                  <span>{speechError}</span>
                </div>
                <button
                  onClick={() => setSpeechError(null)}
                  className="text-zinc-500 hover:text-zinc-900 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Google-Style Pill Search Input Bar with Liquid Glass */}
            <div className="relative flex items-center liquid-glass-input rounded-full px-2 sm:px-3 py-1.5 sm:py-2 transition-all">
              {/* Left: Plus (+) Button for Upload Menu */}
              <div className="relative" ref={attachMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(prev => !prev)}
                  className={`p-2 sm:p-2.5 rounded-full text-zinc-700 hover:text-zinc-950 hover:bg-white/60 transition shrink-0 ${
                    showAttachMenu ? 'bg-white/80 text-zinc-950 rotate-45' : ''
                  }`}
                  title="Attach legal document or image"
                >
                  <Plus className="w-5 h-5 stroke-[2.2] transition-transform duration-150" />
                </button>

                {/* Popover Upload Menu */}
                {showAttachMenu && (
                  <div className="absolute bottom-full left-0 mb-3 w-60 rounded-2xl liquid-glass-card shadow-2xl p-2 z-50 space-y-1 text-xs border border-white/90">
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                      Attach to Inquiry
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        docInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-zinc-800 hover:bg-white/80 hover:text-zinc-950 transition font-medium"
                    >
                      <FileUp className="w-4 h-4 text-zinc-900 shrink-0" />
                      <div>
                        <div>Legal Document</div>
                        <div className="text-[10px] text-zinc-500 font-normal">
                          PDF, TXT, DOCX, CSV
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        imageInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-zinc-800 hover:bg-white/80 hover:text-zinc-950 transition font-medium"
                    >
                      <Camera className="w-4 h-4 text-zinc-900 shrink-0" />
                      <div>
                        <div>Legal Notice / Image</div>
                        <div className="text-[10px] text-zinc-500 font-normal">
                          PNG, JPG, Screenshot, Scan
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Center: Query Input Field with placeholder 'Ask question' */}
              <input
                type="text"
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask question"
                maxLength={3000}
                className="flex-1 bg-transparent border-0 text-sm sm:text-base text-zinc-900 placeholder-zinc-500 focus:outline-none px-3 py-1 font-normal"
              />

              {/* Right Side: Microphone (Voice), Camera (Image), Paperclip (Document), and Send */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Voice Input (Microphone) */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2 sm:p-2.5 rounded-full transition shrink-0 ${
                    isListening
                      ? 'liquid-glass-dark text-white shadow-md'
                      : 'text-zinc-700 hover:text-zinc-950 hover:bg-white/60'
                  }`}
                  title={isListening ? 'Stop voice recording' : 'Voice input (Speak inquiry)'}
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5 text-red-500 animate-bounce" />
                  ) : (
                    <Mic className="w-5 h-5 stroke-[2.2]" />
                  )}
                </button>

                {/* Camera / Image Upload */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 sm:p-2.5 rounded-full text-zinc-700 hover:text-zinc-950 hover:bg-white/60 transition shrink-0"
                  title="Upload image / contract scan"
                >
                  <Camera className="w-5 h-5 stroke-[2.2]" />
                </button>

                {/* Direct Document Upload */}
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="p-2 sm:p-2.5 rounded-full text-zinc-700 hover:text-zinc-950 hover:bg-white/60 transition shrink-0"
                  title="Upload document (PDF, TXT, DOCX)"
                >
                  <Paperclip className="w-5 h-5 stroke-[2.2]" />
                </button>

                {/* Send Button (Active when text or attachment exists) */}
                {(inputQuery.trim() || attachedFiles.length > 0) && (
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={isAsking}
                    className="p-2 sm:p-2.5 rounded-full liquid-glass-dark hover:brightness-110 disabled:opacity-30 text-white transition shrink-0 shadow-md ml-0.5"
                    title="Send inquiry (Enter)"
                  >
                    <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 px-3 font-mono">
              <span className="hidden sm:inline">
                Press <strong>Enter</strong> to send • Speak or attach documents
              </span>
              <span className="sm:hidden">Tap send icon or mic</span>
              <span>{inputQuery.length} / 3000</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
