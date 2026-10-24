
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import MessageBubble from './MessageBubble.jsx';

export default function MessageList() {
  const {
    activeConversation,
    messages,
    loadOlderMessages,
    isLoadingMessages,
    isLoadingOlderMessages,
    hasMoreMessages,
    messageHistoryError,
  } = useChat();

  const { user } = useAuth();

  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const previousConversationIdRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);
  const shouldScrollToBottomRef = useRef(false);
  const loadingOlderRef = useRef(false);

  const conversationId = activeConversation?.id;

  const handleScroll = useCallback(() => {
    const list = listRef.current;

    if (!list || !conversationId) return;
    if (loadingOlderRef.current || isLoadingOlderMessages) return;
    if (isLoadingMessages || !hasMoreMessages) return;

    if (list.scrollTop <= 40) {
      loadingOlderRef.current = true;
      previousScrollHeightRef.current = list.scrollHeight;
      shouldRestoreScrollRef.current = true;

      Promise.resolve(loadOlderMessages(conversationId)).finally(() => {
        loadingOlderRef.current = false;
      });
    }
  }, [
    conversationId,
    hasMoreMessages,
    isLoadingMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
  ]);

  // Reset scroll handling when switching conversations.
  useEffect(() => {
    if (previousConversationIdRef.current !== conversationId) {
      previousConversationIdRef.current = conversationId;
      previousMessageCountRef.current = 0;
      shouldRestoreScrollRef.current = false;
      shouldScrollToBottomRef.current = true;
    }
  }, [conversationId]);

  // Preserve the viewport when older messages are prepended.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    if (shouldRestoreScrollRef.current && !isLoadingOlderMessages) {
      const addedHeight =
        list.scrollHeight - previousScrollHeightRef.current;

      if (addedHeight > 0) {
        list.scrollTop += addedHeight;
      }

      shouldRestoreScrollRef.current = false;
    } else if (
      shouldScrollToBottomRef.current &&
      !isLoadingMessages
    ) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
      shouldScrollToBottomRef.current = false;
    } else if (
      messages.length > previousMessageCountRef.current &&
      !isLoadingOlderMessages
    ) {
      // Keep new messages visible when the user is already near the bottom.
      const distanceFromBottom =
        list.scrollHeight - list.scrollTop - list.clientHeight;

      if (distanceFromBottom < 150) {
        bottomRef.current?.scrollIntoView({ block: 'end' });
      }
    }

    previousMessageCountRef.current = messages.length;
  }, [messages, isLoadingMessages, isLoadingOlderMessages]);

  return (
    <div
      className="message-list"
      ref={listRef}
      onScroll={handleScroll}
    >
      {isLoadingMessages && messages.length === 0 && (
        <p className="muted empty-hint">Loading messages...</p>
      )}

      {messageHistoryError && (
        <p className="muted empty-hint" role="alert">
          {messageHistoryError}
        </p>
      )}

      {hasMoreMessages && (
        <div className="history-status">
          {isLoadingOlderMessages ? 'Loading older messages...' : null}
        </div>
      )}

      {!isLoadingMessages && messages.length === 0 && !messageHistoryError && (
        <p className="muted empty-hint">No messages yet. Say hello!</p>
      )}

      {messages.map((message) => (
        <MessageBubble
          key={message.clientMsgId || message.id}
          message={message}
          mine={message.mine || message.senderId === user?.id}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
