import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';

// REQ-GRP-5: if the user is removed from (or leaves) the open group, close it -
// the server already refuses any further reads or sends.
export default function GroupMembershipWatcher() {
  const { user } = useAuth();
  const { activeConversation, closeConversation } = useChat();
  useSocketEvent('group:update', (u) => {
    const stillMember = u.group.members.some((m) => m.userId === user?.id);
    if (!stillMember && activeConversation?.id === u.groupId) closeConversation();
  });
  return null;
}
