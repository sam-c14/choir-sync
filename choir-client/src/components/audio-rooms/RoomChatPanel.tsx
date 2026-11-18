import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MessageSquare, Send, X, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { UserAvatar } from '../ui/user-avatar';
import type { RoomChatMessage } from '../../hooks/use-audio-room';

interface RoomChatPanelProps {
  messages: RoomChatMessage[];
  currentUserId?: string;
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

function formatMessageTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function renderMessageText(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 text-purple-600 dark:text-purple-300 hover:opacity-80 break-all"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const RoomChatPanel = React.memo(function RoomChatPanel({
  messages,
  currentUserId,
  onSendMessage,
  onClose,
}: RoomChatPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    stickToBottomRef.current = true;
    onSendMessage(trimmed);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const groupedMessages = useMemo(() => {
    return messages.map((msg, idx) => {
      const prev = idx > 0 ? messages[idx - 1] : null;
      const isGrouped =
        Boolean(prev) &&
        prev!.userId === msg.userId &&
        msg.timestamp - prev!.timestamp < 2 * 60 * 1000;
      return { msg, isGrouped };
    });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-card text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-300 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-tight truncate">Room Chat</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
          title="Close Chat"
          aria-label="Close Chat"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Google Meet style privacy / ephemerality notice */}
      <div className="mx-3.5 mt-3 mb-1 px-3 py-2 rounded-xl bg-muted/60 border border-border/60 flex items-start gap-2 text-[11px] text-muted-foreground shrink-0">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-600 dark:text-purple-300" />
        <span>
          Messages can only be seen by people in the room and are cleared when everyone leaves.
        </span>
      </div>

      {/* Scrollable Messages Viewport */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 py-3 space-y-1.5"
      >
        {groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center px-4 text-muted-foreground space-y-1.5">
            <MessageSquare className="w-7 h-7 opacity-40" />
            <p className="text-xs font-medium text-foreground/80">No messages yet</p>
            <p className="text-[11px]">
              Send a message to share notes, lyrics, or encouragement with the room.
            </p>
          </div>
        ) : (
          groupedMessages.map(({ msg, isGrouped }) => {
            const isSelf = msg.userId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} ${
                  isGrouped ? 'mt-0.5' : 'mt-3 first:mt-0'
                }`}
              >
                {!isGrouped && (
                  <div
                    className={`flex items-center gap-1.5 mb-1 ${
                      isSelf ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <UserAvatar
                      name={msg.senderName}
                      email={msg.senderName}
                      src={msg.senderAvatar || null}
                      className="w-5 h-5"
                    />
                    <span className="text-[11px] font-semibold text-foreground/90">
                      {isSelf ? 'You' : msg.senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-xs ${
                    isSelf
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted/80 text-foreground border border-border/50 rounded-tl-sm'
                  }`}
                >
                  {renderMessageText(msg.text)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t bg-background/95 flex items-end gap-2 shrink-0"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={1000}
          placeholder="Send a message to everyone..."
          className="flex-1 min-h-[40px] max-h-24 resize-none rounded-xl border border-input bg-background px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!draft.trim()}
          className="h-10 w-10 rounded-xl shrink-0"
          title="Send message"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
});
