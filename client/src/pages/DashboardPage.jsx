import { ChatProvider, useChat } from '../context/ChatContext.jsx';
import { ContactsProvider } from '../context/ContactsContext.jsx';
import { PresenceProvider } from '../context/PresenceContext.jsx';
import { ConversationsProvider } from '../context/ConversationsContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ChatPane from '../components/ChatPane.jsx';
import GroupMembershipWatcher from '../components/GroupMembershipWatcher.jsx';

// Two-pane dashboard (SRS 3.1, SAD 4.5): conversation list on the left,
// open conversation on the right. Below 768px only one pane is shown.
function DashboardLayout() {
  const { activeConversation } = useChat();
  return (
    <div className={`dashboard ${activeConversation ? 'has-active' : ''}`}>
      <Sidebar />
      <ChatPane />
      <GroupMembershipWatcher />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ContactsProvider>
      <PresenceProvider>
        <ConversationsProvider>
          <ChatProvider>
            <DashboardLayout />
          </ChatProvider>
        </ConversationsProvider>
      </PresenceProvider>
    </ContactsProvider>
  );
}
