# Video Playback in Chat Messages — Design Spec

**Date:** 2026-03-30
**Status:** Approved

## Summary

Add video playback support to group chats, private messages, and conversations, following the same pattern as images. Videos currently fall through to the generic file download UI despite being uploadable (mp4, webm, mov). This spec adds inline video players in chat bubbles and a unified media gallery modal that handles both images and videos.

## Architecture

### 1. MediaGalleryModal (replaces ImageGalleryModal)

**File:** `frontend/src/components/communications/MediaGalleryModal.tsx`

Rename and extend `ImageGalleryModal` to handle both images and videos in a single navigable gallery.

**Interface:**
```typescript
interface GalleryMediaItem {
  id: string;
  filename: string;
  sender: string;
  date: string;
  type: 'image' | 'video';
}

interface MediaGalleryModalProps {
  visible: boolean;
  media: GalleryMediaItem[];
  initialIndex: number;
  onClose: () => void;
}
```

**Behavior:**
- Images: identical to current behavior (zoom 0.5x–4x, pan/drag, mouse wheel zoom, keyboard shortcuts)
- Videos: HTML5 `<video>` with native controls, source via `/api/communications/attachments/{id}/stream` (supports Range requests for seeking). No zoom/pan for videos.
- Navigation arrows cycle through all media (images + videos interleaved chronologically)
- Download button works for both types
- Zoom controls hidden when current item is video
- Keyboard: arrow keys navigate, Escape closes (same as current)
- Loading state: Spin for images (blob fetch), native video loading for videos

### 2. Inline Video Player in Chat Bubbles

Add video detection alongside existing image and audio detection in message rendering.

**Detection:**
```typescript
const isVideo = att.mimeType?.startsWith('video/');
```

**Rendering:**
```html
<video
  controls
  preload="metadata"
  src={`/api/communications/attachments/${att.id}/stream`}
  style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'pointer' }}
  onClick={() => openGallery(att.id)}
/>
```

- Styled to match image bubbles (same max dimensions, border radius)
- Shows filename and size below, same style as images
- Click opens media gallery modal at that item
- `preload="metadata"` loads just enough to show duration/thumbnail without downloading full file

### 3. Gallery Collection Rename

In all 3 pages, rename `allGalleryImages` → `allGalleryMedia` and collect both image and video attachments:

```typescript
const allGalleryMedia = React.useMemo(() => {
  const media: GalleryMediaItem[] = [];
  messages.forEach((msg) => {
    msg.attachments?.forEach((att) => {
      if (att.mimeType?.startsWith('image/')) {
        media.push({ id: att.id, filename: ..., sender: ..., date: ..., type: 'image' });
      } else if (att.mimeType?.startsWith('video/')) {
        media.push({ id: att.id, filename: ..., sender: ..., date: ..., type: 'video' });
      }
    });
  });
  return media;
}, [messages]);
```

### 4. Pages Affected

All 3 communication pages need identical changes:

| Page | File | Changes |
|------|------|---------|
| Group Chats | `pages/communications/GroupChatsPage.tsx` | renderMessage: add isVideo branch, gallery collection rename, import MediaGalleryModal |
| Conversations | `pages/communications/ConversationsPage.tsx` | renderMessage: add isVideo branch, gallery collection rename, import MediaGalleryModal |
| Messages | `pages/communications/MessagesPage.tsx` | Main message + replies: add isVideo branch, gallery collection rename, import MediaGalleryModal |

### 5. Backend

**No changes required.**
- `/communications/attachments/:id/view` — serves files inline with correct Content-Type
- `/communications/attachments/:id/stream` — supports Range requests for video seeking
- `/communications/attachments/:id/download` — works for all file types
- Multer config already accepts video/mp4, video/webm, video/quicktime

## File Changes Summary

| Action | File |
|--------|------|
| Replace | `components/communications/ImageGalleryModal.tsx` → `MediaGalleryModal.tsx` |
| Modify | `pages/communications/GroupChatsPage.tsx` |
| Modify | `pages/communications/ConversationsPage.tsx` |
| Modify | `pages/communications/MessagesPage.tsx` |

## Error Handling

- Video load failure: show error message with download fallback link (same pattern as image error in current gallery)
- Unsupported codec: browser's native `<video>` handles this with its own error UI
- Large files: `preload="metadata"` prevents full download; streaming via Range requests handles playback

## Testing

- Upload mp4, webm, mov files in group chat → verify inline player renders
- Upload video in private conversation → verify inline player renders
- Upload video in message thread → verify inline player in replies
- Click inline video → verify gallery opens at correct index
- Navigate gallery with mixed images + videos → verify correct rendering per type
- Verify video seeking works (Range requests)
- Verify download button works for videos in gallery
- Verify zoom controls hidden for videos, shown for images
- Test on mobile viewport
