import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatAction } from '../types';
import { Bot, User, Send, Sparkles, Check, Trash2, ArrowRight, CornerDownLeft } from 'lucide-react';

interface ChatPaneProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  onClearChat: () => void;
  suggestedPrompts: string[];
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  messages,
  onSendMessage,
  isLoading,
  onClearChat,
  suggestedPrompts,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText('');
    onSendMessage(text);
  };

  const handlePromptClick = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  return (
    <div id="right-chat-pane" className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Chat Pane Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                SplitSmart Assistant
              </h2>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                Gemini
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Natural language bill splitting &amp; math
            </p>
          </div>
        </div>

        {messages.length > 1 && (
          <button
            type="button"
            onClick={onClearChat}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Clear chat history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Messages Thread */}
      <div id="chat-messages-thread" className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            id={`chat-msg-${msg.id}`}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 text-sm shadow-xs ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-xs'
                  : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/50'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

              {/* Display Applied Actions Badges */}
              {msg.actionsApplied && msg.actionsApplied.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Applied Changes
                  </div>
                  {msg.actionsApplied.map((act, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg"
                    >
                      <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>{act.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Follow-up suggestion pills */}
              {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1.5">
                    Suggested follow-up:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestedFollowups.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePromptClick(sug)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors shadow-2xs"
                      >
                        <span>{sug}</span>
                        <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start items-center text-slate-400 text-xs">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 rounded-2xl rounded-tl-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-1 text-slate-500">Updating bill...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Commands Carousel */}
      <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Try:
          </span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePromptClick(prompt)}
              disabled={isLoading}
              className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors shadow-2xs"
            >
              &quot;{prompt}&quot;
            </button>
          ))}
        </div>
      </div>

      {/* Input Form Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              id="chat-command-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='Try "Dhruv had the nachos" or "Sarah & Sue shared the pizza"...'
              disabled={isLoading}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hidden sm:inline">
              ↵
            </span>
          </div>

          <button
            type="submit"
            id="btn-send-chat"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-medium transition-colors shadow-sm shrink-0 flex items-center justify-center"
            title="Send command"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
