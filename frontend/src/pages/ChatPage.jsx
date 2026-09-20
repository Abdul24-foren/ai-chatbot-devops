import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquarePlus, Search, LogOut, Menu, X, Send, Square, Pencil, Trash2, Copy, RotateCcw, Sparkles, User, ArrowUpRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const suggestionPrompts = [
  'Explain a concept',
  'Write code',
  'Debug code',
  'Create a plan',
];

const groupByDate = (conversations) => {
  const groups = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };

  const now = new Date();

  conversations.forEach((conversation) => {
    const difference = Math.floor((now - new Date(conversation.updatedAt)) / (1000 * 60 * 60 * 24));

    if (difference === 0) groups['Today'].push(conversation);
    else if (difference === 1) groups['Yesterday'].push(conversation);
    else if (difference <= 7) groups['Previous 7 Days'].push(conversation);
    else groups['Older'].push(conversation);
  });

  return Object.entries(groups).filter(([, items]) => items.length > 0);
};

const MessageBubble = ({ message, onCopy, onRetry, onRegenerate }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-3xl rounded-2xl border p-4 ${isUser ? 'border-violet-500/20 bg-violet-500/10 text-white' : 'border-zinc-800 bg-zinc-900/70 text-zinc-100'}`}>
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.12em] text-zinc-400">
          <span>{isUser ? 'You' : 'Assistant'}</span>
          {message.content ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onCopy(message.content)} className="inline-flex items-center gap-1 hover:text-violet-300">
                <Copy size={14} /> Copy
              </button>
              {!isUser && (
                <>
                  <button type="button" onClick={() => onRetry(message)} className="inline-flex items-center gap-1 hover:text-violet-300">
                    <RotateCcw size={14} /> Retry
                  </button>
                  <button type="button" onClick={() => onRegenerate(message)} className="inline-flex items-center gap-1 hover:text-violet-300">
                    <Sparkles size={14} /> Regenerate
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="prose prose-invert max-w-none text-[15px] leading-7">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');

                return !inline ? (
                  <div className="my-4 overflow-hidden rounded-xl border border-zinc-700 bg-[#0b1020]">
                    <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-900 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                      <span>{match ? match[1] : 'Code'}</span>
                      <button
                        type="button"
                        onClick={() => onCopy(codeString)}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:border-violet-500 hover:text-violet-200"
                      >
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                    <SyntaxHighlighter style={oneDark} language={match ? match[1] : 'javascript'} PreTag="div" customStyle={{ margin: 0, background: 'transparent' }}>
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={className} {...props}>{children}</code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [composerValue, setComposerValue] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');
  const composerRef = useRef(null);

  const groupedConversations = useMemo(() => groupByDate(conversations), [conversations]);

  const fetchConversations = async (term = '') => {
    try {
      setLoadingConversations(true);
      const response = await api.get(`/conversations${term ? `/search?q=${encodeURIComponent(term)}` : ''}`);
      setConversations(response.data.data.conversations || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to fetch conversations.');
    } finally {
      setLoadingConversations(false);
    }
  };

  const openConversation = async (conversationId) => {
    setSelectedConversationId(conversationId);
    setSidebarOpen(false);
    setLoadingMessages(true);

    try {
      const response = await api.get(`/conversations/${conversationId}`);
      setMessages(response.data.data.conversation.messages || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to open conversation.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const createConversation = async () => {
    try {
      const response = await api.post('/conversations', {});
      const newConversation = response.data.data.conversation;
      setSelectedConversationId(newConversation.id);
      setMessages([]);
      await fetchConversations(searchQuery);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create conversation.');
    }
  };

  const deleteConversation = async (conversationId) => {
    try {
      await api.delete(`/conversations/${conversationId}`);
      if (conversationId === selectedConversationId) {
        setSelectedConversationId(null);
        setMessages([]);
      }
      await fetchConversations(searchQuery);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to delete conversation.');
    }
  };

  const renameConversation = async (conversationId) => {
    const current = conversations.find((entry) => entry.id === conversationId);
    const nextTitle = window.prompt('New conversation title', current?.title || '');
    if (!nextTitle || !nextTitle.trim()) return;

    try {
      await api.patch(`/conversations/${conversationId}`, { title: nextTitle.trim() });
      await fetchConversations(searchQuery);
      if (selectedConversationId === conversationId) {
        setMessages((currentMessages) => currentMessages);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to rename conversation.');
    }
  };

  const sendMessage = async () => {
    if (!composerValue.trim() || !selectedConversationId || isSending) return;

    const trimmedMessage = composerValue.trim();
    setMessages((current) => [...current, { id: `temp-${Date.now()}`, role: 'user', content: trimmedMessage, createdAt: new Date().toISOString() }]);
    setComposerValue('');
    setIsSending(true);
    setIsStreaming(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ai_chatbot_token')}`,
        },
        body: JSON.stringify({ content: trimmedMessage }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Something went wrong.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.replace(/^data:\s*/, '').trim();
          if (!payload || payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === 'delta' && parsed.content) {
              streamedText += parsed.content;
              setMessages((current) => {
                const lastAssistant = current.slice().reverse().find((item) => item.role === 'assistant');
                if (lastAssistant) {
                  return current.map((item) => item.id === lastAssistant.id ? { ...item, content: (item.content || '') + parsed.content } : item);
                }
                return [
                  ...current,
                  { id: `assistant-${Date.now()}`, role: 'assistant', content: parsed.content, createdAt: new Date().toISOString() },
                ];
              });
            }
            if (parsed.type === 'message') {
              setMessages((current) => current.map((item) => (item.id?.startsWith('assistant-') ? { ...item, id: parsed.message.id, content: parsed.message.content } : item)));
            }
            if (parsed.type === 'done') {
              setIsStreaming(false);
              setIsSending(false);
            }
            if (parsed.type === 'error') {
              setError(parsed.message || 'Something went wrong.');
              setIsStreaming(false);
              setIsSending(false);
            }
          } catch (error) {
            // ignore incomplete SSE fragments
          }
        }
      }

      await fetchConversations(searchQuery);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setIsStreaming(false);
      setIsSending(false);
    } finally {
      setIsSending(false);
      setIsStreaming(false);
    }
  };

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(content.slice(0, 20));
      setTimeout(() => setCopiedMessage(''), 1500);
    } catch (error) {
      setError('Clipboard access failed.');
    }
  };

  const handleRetry = async (message) => {
    if (!selectedConversationId) return;
    const userMessage = messages.filter((item) => item.role === 'user').at(-1);
    if (userMessage) {
      const regenerated = message.content || 'Retrying response.';
      setMessages((current) => current.map((item) => (item.id === message.id ? { ...item, content: regenerated } : item)));
    }
  };

  const handleRegenerate = async (message) => {
    try {
      const response = await api.post(`/messages/${message.id}/regenerate`);
      const updated = response.data.data.message;
      setMessages((current) => current.map((item) => (item.id === message.id ? { ...item, content: updated.content } : item)));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to regenerate response.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      fetchConversations(searchQuery);
    } else {
      fetchConversations();
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedConversationId) {
      openConversation(selectedConversationId);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (composerRef.current) {
      composerRef.current.style.height = 'auto';
      composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, 180)}px`;
    }
  }, [composerValue]);

  return (
    <div className="flex min-h-screen bg-[#02060d] text-white">
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-30 w-80 border-r border-zinc-800 bg-[#0b0d12] p-4 transition-transform md:static md:translate-x-0`}>
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-lg font-semibold"><MessageSquarePlus className="text-violet-300" size={18} /> AI Chat</div>
          <button type="button" className="md:hidden" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20"
          onClick={createConversation}
        >
          <MessageSquarePlus size={16} /> New Chat
        </button>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-3 text-zinc-500" size={16} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-violet-500"
            placeholder="Search conversations"
          />
        </div>

        <div className="mt-5 space-y-5 overflow-y-auto pb-6">
          {loadingConversations ? (
            <div className="text-sm text-zinc-400">Loading conversations...</div>
          ) : groupedConversations.length === 0 ? (
            <div className="text-sm text-zinc-500">No conversations yet</div>
          ) : (
            groupedConversations.map(([groupName, groupItems]) => (
              <div key={groupName}>
                <div className="mb-2 pl-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">{groupName}</div>
                <div className="space-y-2">
                  {groupItems.map((conversation) => (
                    <div key={conversation.id} className={`group flex items-center justify-between rounded-xl border p-2 transition ${selectedConversationId === conversation.id ? 'border-violet-500/40 bg-violet-500/10' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}`}>
                      <button type="button" onClick={() => openConversation(conversation.id)} className="flex-1 truncate text-left text-sm text-zinc-100">
                        {conversation.title}
                      </button>
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button type="button" aria-label="Rename conversation" onClick={() => renameConversation(conversation.id)} className="rounded-md p-1 text-zinc-400 hover:text-white"><Pencil size={14} /></button>
                        <button type="button" aria-label="Delete conversation" onClick={() => deleteConversation(conversation.id)} className="rounded-md p-1 text-zinc-400 hover:text-red-300"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-auto border-t border-zinc-800 pt-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/20 text-violet-200"><User size={16} /></div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user?.name || 'User'}</div>
              <div className="truncate text-xs text-zinc-500">{user?.email || ''}</div>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-zinc-800 bg-[#090b10]/80 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>
            <div className="text-lg font-semibold">{selectedConversationId ? conversations.find((c) => c.id === selectedConversationId)?.title || 'Conversation' : 'AI Chat'}</div>
          </div>
          <button type="button" onClick={createConversation} className="hidden items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 md:inline-flex">
            <MessageSquarePlus size={16} /> New chat
          </button>
        </header>

        <main className="flex h-[calc(100vh-78px)] flex-col px-4 py-4 md:px-8">
          {!selectedConversationId ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="max-w-2xl text-center">
                <div className="mb-6 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 p-3 text-violet-300"><Sparkles size={24} /></div>
                <h1 className="text-4xl font-semibold tracking-tight text-white">How can I help you today?</h1>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {suggestionPrompts.map((prompt) => (
                    <button key={prompt} type="button" className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-left text-sm text-zinc-200 hover:border-violet-500/40 hover:bg-violet-500/10" onClick={() => setComposerValue(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4 md:p-6">
              {loadingMessages ? <div className="text-sm text-zinc-400">Loading messages...</div> : messages.length === 0 ? <div className="text-sm text-zinc-500">No messages yet.</div> : messages.map((message) => <MessageBubble key={message.id} message={message} onCopy={handleCopy} onRetry={handleRetry} onRegenerate={handleRegenerate} />)}
            </div>
          )}

          {error ? <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 shadow-glow">
            <textarea
              ref={composerRef}
              value={composerValue}
              onChange={(event) => setComposerValue(event.target.value)}
              rows={1}
              placeholder="Message AI..."
              className="w-full resize-none bg-transparent px-2 py-2 text-base text-white outline-none placeholder:text-zinc-500"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              disabled={!selectedConversationId || isSending}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-500">{composerValue.length}/2000</div>
              <div className="flex items-center gap-2">
                {isStreaming ? (
                  <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20" onClick={() => setIsStreaming(false)}>
                    <Square size={14} /> Stop
                  </button>
                ) : null}
                <button type="button" disabled={!composerValue.trim() || !selectedConversationId || isSending} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60" onClick={sendMessage}>
                  <Send size={16} /> Send
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
