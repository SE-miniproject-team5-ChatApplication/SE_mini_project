import { ChatProvider, useChat } from '../context/ChatContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ChatPane from '../components/ChatPane.jsx';

// Two-pane dashboard (SRS 3.1, SAD 4.5): conversation list on the left,
// open conversation on the right. Below 768px only one pane is shown.
function DashboardLayout() {
  const { activeConversation } = useChat();
  return (
    <div className={`dashboard ${activeConversation ? 'has-active' : ''}`}>
      <Sidebar />
      <ChatPane />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ChatProvider>
      <DashboardLayout />
    </ChatProvider>
  );
}
