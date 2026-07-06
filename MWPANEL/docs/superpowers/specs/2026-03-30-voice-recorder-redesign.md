# Voice Recorder Redesign — WhatsApp/Telegram Style
**Date:** 2026-03-30
**Status:** Approved

---

## Problem

The current voice recording UX has three issues:
1. **Fragmented code**: Two nearly-identical inline components (`ConversationVoiceRecorderInline` in ConversationsPage, `VoiceRecorderWrapper` in GroupChatsPage) with duplicated logic.
2. **Invisible feedback**: The `recording` state is never shown (auto-lock fires immediately), so the user sees no visual transition — just a bland locked bar with no animated feedback.
3. **No waveform animation**: The recording bar has a pulsing dot and a timer, but nothing that communicates "your voice is being captured right now."

---

## Goal

A single unified `VoiceRecorderButton` component that looks and feels like WhatsApp Web/Telegram Desktop voice recording: clear visual feedback, animated waveform, obvious cancel and send controls, zero learning curve.

**Role constraint**: Only `teacher` and `admin` can record. Students and families never see the mic button.

---

## Architecture

```
useAudioRecorder.ts        (unchanged — hook already works correctly)
    └── VoiceRecorderButton.tsx    (new unified component)
            ├── ConversationsPage  (replaces ConversationVoiceRecorderInline)
            ├── GroupChatsPage     (replaces VoiceRecorderWrapper)
            └── MessagesPage       (added if missing)
```

### Props

```typescript
interface VoiceRecorderButtonProps {
  onSend: (file: File, duration: number) => void;
  onStateChange?: (isRecording: boolean) => void;
  disabled?: boolean;
}
```

`isMobile` is removed — the component detects it internally via `window.innerWidth`.

---

## States & UX Flow

```
IDLE ──[tap mic]──► RECORDING ──[tap ✓]──► send + IDLE
                         │
                         └──[tap 🗑️]──► cancel + IDLE
```

The `locked` state from `useAudioRecorder` is used internally (auto-locked on start) but **exposed as a single RECORDING state** to the UI — no distinction shown to the user.

### State: IDLE
- Round mic button (40×40px), color `#579172` (green brand)
- Hover: light green background (`#f0faf4`)
- Tap → calls `startRecording()` then immediately `lockRecording()` → transitions to RECORDING

### State: RECORDING
Full-width bar that replaces the input area:

```
[ 🗑️ ]  ● 00:03  ▁▃▅▇▅▃▁▄▆▄▂▅  →→ desliza para cancelar  [ ✓ ]
  red    pulse    waveform bars      (fades after 3s, mobile)   green
```

Elements (left to right):
- **🗑️ cancel button** (red, 36×36px) — discards recording, resets to IDLE
- **● pulse dot** — red, 10px, CSS pulse animation (scale 1→1.3→1, 800ms loop)
- **00:03 timer** — monospace font, red color, updates every second
- **Waveform** — 28 SVG `<rect>` bars, each animating height independently with random phase offset (simulates audio level). Heights cycle between 4px and 24px.
- **"→ desliza para cancelar"** — gray hint text, visible 3s then fades out via CSS opacity transition. Only shown on first recording or on mobile.
- **✓ send button** (green `#579172`, 36×36px) — stops recording, builds File, calls `onSend`, resets to IDLE

### Transition IDLE → RECORDING
- Mic button: scale 1 → 1.15 → 1 (150ms, ease-out) then the bar slides in from right (translateX(20px)→0, opacity 0→1, 250ms ease-out)

### Transition RECORDING → IDLE (send or cancel)
- Bar: opacity 1→0, translateX(0→-10px), 200ms ease-in

---

## Waveform Animation

28 bars rendered as SVG, width 2px, gap 2px, height animated with CSS keyframes.
Each bar gets a unique `animation-delay` from 0ms to 700ms (spread evenly) so they animate out of phase, creating a natural ripple effect.

```css
@keyframes waveBar {
  0%, 100% { height: 4px;  }
  50%       { height: 24px; }
}
```

Bars are centered vertically in a 28px tall container. Color: `#ef4444` (red).

---

## CSS Animations (global or scoped)

```css
@keyframes voicePulseDot {
  0%, 100% { transform: scale(1);   opacity: 1;   }
  50%      { transform: scale(1.35); opacity: 0.7; }
}

@keyframes voiceBarAnim {
  0%, 100% { height: 4px;  }
  50%      { height: 24px; }
}
```

These are added to the component via a `<style>` tag injected once, or in the global CSS file.

---

## Integration

### ConversationsPage
- Delete `ConversationVoiceRecorderInline` component (lines 184–338)
- Replace usage with `<VoiceRecorderButton>` inside the `(user?.role === 'teacher' || user?.role === 'admin')` guard
- `onSend` signature: `(file, _duration) => sendVoiceMessage(file)` (duration not used here)

### GroupChatsPage
- Delete `VoiceRecorderWrapper` component (lines 1289–1458)
- Replace usage with `<VoiceRecorderButton>`
- `onSend` signature: `(file, duration) => handleSendVoice(file, duration)`

### MessagesPage
- Audit for existing voice recording; add `<VoiceRecorderButton>` in the message input bar if missing
- Same role guard: `user?.role === 'teacher' || user?.role === 'admin'`

---

## Role Guard (enforced in every integration point)

```tsx
{(user?.role === 'teacher' || user?.role === 'admin') && (
  <VoiceRecorderButton
    onSend={handleSendVoice}
    onStateChange={setVoiceRecordingActive}
    disabled={sending}
  />
)}
```

Students (`student`) and families (`family`) never see or have access to the component.

---

## Error Handling

- Microphone permission denied → `antMessage.error(error)` (existing behavior from hook, unchanged)
- Recording too short (<1s, blob size ≈ 0) → silently discard, reset to IDLE
- Send failure → handled by the parent page's `onSend` implementation

---

## Files Changed

| File | Action |
|------|--------|
| `src/components/communications/VoiceRecorderButton.tsx` | **Create** — new unified component |
| `src/pages/communications/ConversationsPage.tsx` | **Edit** — delete inline component, use VoiceRecorderButton |
| `src/pages/communications/GroupChatsPage.tsx` | **Edit** — delete inline component, use VoiceRecorderButton |
| `src/pages/communications/MessagesPage.tsx` | **Edit** — audit & add VoiceRecorderButton |
| `src/components/communications/VoiceRecorder.tsx` | **Delete** — standalone component no longer used |

`useAudioRecorder.ts`, `VoiceNotePlayer.tsx` — **no changes**.
