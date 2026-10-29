import { useAuth } from '../context/AuthContext.jsx';

// SAD 4.4: "Reconnecting..." while the WebSocket is down. Messages typed in the
// meantime wait in the outbox and are sent automatically (REQ-MSG-7).
export default function ConnectionBanner() {
  const { socket, connected } = useAuth();
  if (!socket || connected) return null;
  return (
    <div className="connection-banner" role="status">
      Reconnecting… your messages will be sent when the connection is back.
    </div>
  );
}
