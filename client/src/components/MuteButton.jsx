import { useState } from 'react';
import { http, apiError } from '../api/http.js';

export default function MuteButton({ conversation, onMutedChange }) {
  const [isSaving, setIsSaving] = useState(false);
  const isMuted = conversation?.muted === true;

  async function toggleMute() {
    if (!conversation?.id || isSaving) return;

    const nextMuted = !isMuted;
    setIsSaving(true);

    try {
      await http.put(`/conversations/${conversation.id}/mute`, {
        muted: nextMuted,
      });

      onMutedChange?.(nextMuted);
    } catch (err) {
      window.alert(apiError(err).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-small btn-secondary"
      onClick={toggleMute}
      disabled={isSaving || !conversation?.id}
      aria-pressed={isMuted}
      title={isMuted ? 'Turn notifications back on' : 'Mute notifications'}
    >
      {isSaving ? 'Saving...' : isMuted ? 'Unmute' : 'Mute'}
    </button>
  );
}
