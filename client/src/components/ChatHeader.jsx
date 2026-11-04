
import { useState } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import PresenceText from './PresenceText.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import GroupInfoDialog from './GroupInfoDialog.jsx';
import { http, apiError } from '../api/http.js';
import { downloadFile } from '../utils/download.js';

export default function ChatHeader({ conversation }) {
  const { closeConversation } = useChat();
  const [showInfo, setShowInfo] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const isGroup = conversation.type === 'group';

  // REQ-HIS-5: export this conversation's history as a CSV report.
  const exportHistory = async () => {
    setIsExporting(true);
    try {
      const safeName = String(conversation.name || 'conversation')
        .replace(/[^A-Za-z0-9_-]+/g, '_');

      await downloadFile(
        `/api/conversations/${conversation.id}/export`,
        `chat-${safeName}.csv`
      );
    } catch (err) {
      window.alert(apiError(err).message);
    } finally {
      setIsExporting(false);
    }
  };

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
      <button
        type="button"
        className="btn btn-small btn-secondary back-btn"
        onClick={closeConversation}
        aria-label="Back to chats"
      >
        ←
      </button>

      <div className="chat-header-title">
        <strong>{conversation.name}</strong>
        <div className="muted small chat-header-status">
          <TypingIndicator conversationId={conversation.id} />{' '}
          {conversation.type === 'direct' && conversation.otherUser && (
            <PresenceText userId={conversation.otherUser.id} />
          )}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-small btn-secondary"
        title="Download this chat as a CSV file"
        onClick={exportHistory}
        disabled={isExporting}
      >
        {isExporting ? 'Exporting...' : 'Export'}
      </button>

      {isGroup && (
        <button
          type="button"
          className="btn btn-small btn-secondary"
          onClick={() => setShowInfo(true)}
        >
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
