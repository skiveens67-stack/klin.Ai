"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  Archive, Menu, MessageSquare, Plus, RefreshCw, Send, Sparkles, SquarePen, X,
} from "lucide-react";

type Conversation = {
  id: string;
  title: string;
  assistant_key: string;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status?: string;
  created_at: string;
};

type ConversationResponse = { conversation: Conversation; messages: ChatMessage[] };
type ApiError = { error?: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as T & ApiError;
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

function newLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function KlinieChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [composerHeight, setComposerHeight] = useState(24);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async (archived = false) => {
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const result = await api<{ conversations: Conversation[] }>(
        `/api/conversations?archived=${archived ? "true" : "false"}`,
      );
      setConversations(result.conversations ?? []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Could not load chat history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const openConversation = useCallback(async (id: string) => {
    setLoadingConversation(true);
    setHistoryError("");
    setNotice("");
    try {
      const result = await api<ConversationResponse>(`/api/conversations/${id}`);
      setActiveId(id);
      setMessages(result.messages ?? []);
      setMobileHistoryOpen(false);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Could not open this conversation.");
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [messages.length]);

  const startConversation = async () => {
    setHistoryError("");
    setNotice("");
    try {
      const result = await api<{ conversation: Conversation }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "New conversation" }),
      });
      setConversations((current) => [result.conversation, ...current.filter((item) => item.id !== result.conversation.id)]);
      setActiveId(result.conversation.id);
      setMessages([]);
      setMobileHistoryOpen(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Could not create a conversation.");
    }
  };

  const archiveConversation = async (conversation: Conversation) => {
    try {
      await api(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: !showArchived }),
      });
      setConversations((current) => current.filter((item) => item.id !== conversation.id));
      if (activeId === conversation.id) {
        setActiveId(null);
        setMessages([]);
      }
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Could not update this conversation.");
    }
  };

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setHistoryError("");
    setNotice("");
    setSending(true);
    let conversationId = activeId;

    try {
      if (!conversationId) {
        const created = await api<{ conversation: Conversation }>("/api/conversations", {
          method: "POST",
          body: JSON.stringify({ title: content.slice(0, 80) || "New conversation" }),
        });
        conversationId = created.conversation.id;
        setActiveId(conversationId);
        setConversations((current) => [created.conversation, ...current]);
      }

      const optimistic: ChatMessage = {
        id: newLocalId(),
        role: "user",
        content,
        status: "sending",
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, optimistic]);
      setInput("");
      setComposerHeight(24);
      if (textareaRef.current) textareaRef.current.style.height = "24px";

      const saved = await api<{
        message: ChatMessage;
        assistant?: { status?: string; detail?: string };
      }>(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });

      setMessages((current) => current.map((message) =>
        message.id === optimistic.id ? saved.message : message,
      ));
      if (saved.assistant?.status === "not_connected") {
        setNotice("Your message was saved to chat history. Klinie's AI response service has not been connected yet.");
      }
      await loadHistory(showArchived);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = "24px";
        }
      });
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Message could not be saved.");
      setMessages((current) => current.map((message) =>
        message.status === "sending" ? { ...message, status: "failed" } : message,
      ));
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const onInputChange = (value: string) => {
    setInput(value);
    const element = textareaRef.current;
    if (element) {
      element.style.height = "24px";
      const nextHeight = Math.min(element.scrollHeight, 160);
      element.style.height = `${nextHeight}px`;
      setComposerHeight(nextHeight);
    }
  };

  const activeConversation = conversations.find((item) => item.id === activeId);
  const visibleMessages = messages;

  return (
    <section className="flex h-full min-h-0 w-full overflow-hidden bg-[#070B16] text-slate-100">
      {mobileHistoryOpen && (
        <button aria-label="Close chat history" onClick={() => setMobileHistoryOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden" />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[290px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0A1020] transition-transform md:relative md:z-0 md:translate-x-0 ${mobileHistoryOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[68px] items-center justify-between border-b border-white/[0.07] px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/20">
              <Sparkles size={17} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide">Klinie</div>
              <div className="text-[10px] text-slate-500">Klin AI assistant</div>
            </div>
          </div>
          <button onClick={() => setMobileHistoryOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 md:hidden" aria-label="Close history"><X size={18} /></button>
        </div>

        <div className="p-3">
          <button onClick={() => void startConversation()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-3 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-400/15">
            <Plus size={17} /> New chat
          </button>
        </div>

        <div className="flex items-center justify-between px-4 pb-2 pt-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {showArchived ? "Archived chats" : "Recent chats"}
          </span>
          <button onClick={() => { setShowArchived((value) => !value); void loadHistory(!showArchived); }}
            className="text-[11px] text-slate-500 transition hover:text-cyan-300">
            {showArchived ? "Show recent" : "Archived"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {loadingHistory ? (
            <div className="flex items-center gap-2 px-3 py-5 text-xs text-slate-500"><RefreshCw size={13} className="animate-spin" /> Loading history…</div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-6 text-xs leading-5 text-slate-500">Your saved conversations will appear here.</div>
          ) : conversations.map((conversation) => (
            <div key={conversation.id} className={`group mb-1 flex items-center gap-1 rounded-xl px-2 py-1 ${activeId === conversation.id ? "bg-white/[0.08]" : "hover:bg-white/[0.045]"}`}>
              <button onClick={() => void openConversation(conversation.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-1 py-2 text-left">
                <MessageSquare size={15} className={activeId === conversation.id ? "shrink-0 text-cyan-300" : "shrink-0 text-slate-500"} />
                <span className="truncate text-xs text-slate-300">{conversation.title || "New conversation"}</span>
              </button>
              <button title={showArchived ? "Restore conversation" : "Archive conversation"}
                aria-label={showArchived ? "Restore conversation" : "Archive conversation"}
                onClick={() => void archiveConversation(conversation)}
                className="rounded-md p-1.5 text-slate-600 opacity-0 transition hover:bg-white/10 hover:text-slate-200 group-hover:opacity-100">
                {showArchived ? <RefreshCw size={13} /> : <Archive size={13} />}
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.07] p-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300"><Sparkles size={14} className="text-cyan-300" /> Klinie workspace</div>
            <p className="mt-1.5 text-[10px] leading-4 text-slate-500">Your conversations are saved to your Klin account.</p>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/[0.07] px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileHistoryOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 md:hidden" aria-label="Open chat history"><Menu size={19} /></button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-100">{activeConversation?.title || "New conversation"}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> AI connection pending</div>
            </div>
          </div>
          <button onClick={() => void startConversation()} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><SquarePen size={14} /> <span className="hidden sm:inline">New chat</span></button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {loadingConversation ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500"><RefreshCw size={16} className="animate-spin" /> Opening conversation…</div>
          ) : visibleMessages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/15 to-indigo-500/15 shadow-2xl shadow-cyan-950/30"><Sparkles size={28} className="text-cyan-200" /></div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Klin AI</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">What can I help you build?</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Start a conversation with Klinie. Your chats will be saved in your history.</p>
              <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                {["Help me plan a project", "Explain something clearly", "Write or improve an idea", "Help me solve a problem"].map((prompt) => (
                  <button key={prompt} onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-left text-xs text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-400/[0.06]">{prompt}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-7 px-4 py-8 sm:px-6">
              {visibleMessages.map((message) => (
                <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role !== "user" && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500"><Sparkles size={15} /></div>}
                  <div className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-3 ${message.role === "user" ? "rounded-br-md border border-cyan-300/15 bg-cyan-400/[0.09]" : "rounded-bl-md border border-white/[0.07] bg-white/[0.035]"}`}>
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">{message.content}</p>
                    <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-slate-600">{message.status === "failed" ? "Not saved" : formatTime(message.created_at)}</div>
                  </div>
                  {message.role === "user" && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[10px] font-semibold text-slate-300">You</div>}
                </article>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/[0.06] bg-[#070B16] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {(historyError || notice) && <div role="status" className={`mb-3 rounded-xl border px-3 py-2 text-xs leading-5 ${historyError ? "border-rose-400/20 bg-rose-400/[0.06] text-rose-200" : "border-amber-300/20 bg-amber-300/[0.06] text-amber-100"}`}>{historyError || notice}</div>}
            <form onSubmit={(event) => void sendMessage(event)} className="relative rounded-2xl border border-white/[0.12] bg-[#101827] p-2 shadow-xl shadow-black/20 transition focus-within:border-cyan-300/35">
              <textarea ref={textareaRef} value={input} onChange={(event) => onInputChange(event.target.value)} onKeyDown={onComposerKeyDown}
                placeholder="Message Klinie…" rows={1} disabled={sending}
                style={{ height: composerHeight }}
                className="block max-h-40 min-h-6 w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
                aria-label="Message Klinie" />
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="pl-2 text-[10px] text-slate-600">Enter to send · Shift + Enter for a new line</span>
                <button type="submit" disabled={!input.trim() || sending}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-white shadow-lg shadow-cyan-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Send message">
                  {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </form>
            <p className="mt-2 text-center text-[10px] text-slate-600">Klinie can make mistakes. Check important information.</p>
          </div>
        </div>
      </main>
    </section>
  );
}
