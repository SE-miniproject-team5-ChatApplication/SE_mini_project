import { useState } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import PresenceText from './PresenceText.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import GroupInfoDialog from './GroupInfoDialog.jsx';
import { http, apiError } from '../api/http.js';

export default function ChatHeader({ conversation }) {
  const { closeConversation } = useChat();
  const [showInfo, setShowInfo] = useState(false);
  const isGroup = conversation.type === 'group';

  // REQ-GRP-4: leave the group (SAD 4.5: confirm first).
  const leave = async () => {
    if (!window.confirm(`Leave "${conversation.name}"?`)) return;
    try {
      await http.post(`/groups/${conversation.id}/leave`);
      setShowInfo(false);
      closeConversation();
    } catch (err) {
      window.alert(apiError(err).message);
    }
  };
  return (
    <header className="chat-header">
      <button type="button" className="btn btn-small btn-secondary back-btn" onClick={closeConversation} aria-label="Back to chats">
        ←
      </button>
      <div className="chat-header-title">
        <strong>{conversation.name}</strong>
        <div className="muted small chat-header-status">
          <TypingIndicator conversationId={conversation.id} />{' '}
          {conversation.type === 'direct' && conversation.otherUser && <PresenceText userId={conversation.otherUser.id} />}
        </div>
      </div>
      {isGroup && (
        <button type="button" className="btn btn-small btn-secondary" onClick={() => setShowInfo(true)}>
          Group info
        </button>
      )}
      {isGroup && showInfo && (
        <GroupInfoDialog
          groupId={conversation.id}
          onClose={() => setShowInfo(false)}
          footer={
            <button type="button" className="btn btn-danger" onClick={leave}>
              Leave group
            </button>
          }
        />
      )}
    </header>
  );
}
