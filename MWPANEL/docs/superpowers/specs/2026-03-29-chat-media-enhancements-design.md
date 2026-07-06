# Chat Media Enhancements - Design Spec

**Date**: 2026-03-29
**Status**: Approved

## Overview

Enhance the MW Panel messaging system (both private messages and group chats) with:
1. Image gallery modal with zoom and navigation
2. Automatic link detection with Open Graph preview cards
3. YouTube video player modal

All features apply to `ConversationView.tsx` which handles both private and group conversations.

## Component 1: ImageGalleryModal

**File**: `frontend/src/components/communications/ImageGalleryModal.tsx`

**Props**:
- `visible: boolean`
- `images: Array<{ id: string; url: string; filename: string; sender: string; date: string }>`
- `initialIndex: number`
- `onClose: () => void`

**Behavior**:
- Fullscreen dark overlay modal
- Image centered, scaled to fit viewport
- Left/right arrows to navigate between all images in the conversation
- Zoom controls: +/- buttons, mouse scroll wheel, pinch on mobile
- Keyboard: Escape closes, Arrow Left/Right navigates, +/- zoom
- Bottom bar: filename, sender name, date, download button, counter "3 de 12"
- Click outside image closes modal
- Uses `ImageWithAuth` pattern (JWT authenticated blob fetch) for loading images

**Integration in ConversationView.tsx**:
- Collect all image attachments from loaded messages into an array
- Replace current `window.open()` click handler with `setState({ galleryVisible: true, galleryIndex: N })`
- Render `<ImageGalleryModal>` at bottom of component

## Component 2: LinkPreviewCard

**File**: `frontend/src/components/communications/LinkPreviewCard.tsx`

**Props**:
- `url: string`
- `onYouTubeClick: (videoId: string, title: string) => void`

**Behavior**:
- Fetches preview data from backend endpoint
- Renders card with: thumbnail (left), title, description (2-line truncate), domain + favicon
- Subtle border, slightly different background from message bubble
- YouTube URLs: play icon overlay on thumbnail, click triggers `onYouTubeClick` instead of opening new tab
- Non-YouTube URLs: click opens new tab
- Loading skeleton while fetching
- Graceful fallback: if fetch fails, show simple link with domain name
- Caches fetched data in component state to avoid re-fetching on re-render

**URL Detection**:
- Utility function `extractUrls(htmlContent: string): string[]`
- Parses href attributes from `<a>` tags and detects bare URLs in text
- Filters duplicates
- Max 3 previews per message to avoid spam

**Integration in ConversationView.tsx**:
- After rendering message content HTML, extract URLs
- Render `<LinkPreviewCard>` for each detected URL below the message content

## Component 3: YouTubePlayerModal

**File**: `frontend/src/components/communications/YouTubePlayerModal.tsx`

**Props**:
- `visible: boolean`
- `videoId: string`
- `title: string`
- `onClose: () => void`

**Behavior**:
- Centered modal with 16:9 responsive iframe
- Uses `youtube-nocookie.com` embed URL for privacy
- Video title above player
- Close button (X) and Escape key
- "Abrir en YouTube" button to open original URL
- On close: destroys iframe (removes from DOM) to stop playback

**YouTube URL Patterns**:
- `youtube.com/watch?v=VIDEO_ID`
- `youtu.be/VIDEO_ID`
- `youtube.com/shorts/VIDEO_ID`
- `youtube.com/embed/VIDEO_ID`
- Utility function `extractYouTubeId(url: string): string | null`

## Backend: Link Preview Endpoint

**Controller**: `backend/src/modules/communications/controllers/link-preview.controller.ts`
**Service**: `backend/src/modules/communications/services/link-preview.service.ts`

**Endpoint**: `GET /api/communications/link-preview?url=<encoded_url>`

**Auth**: JWT required (any authenticated user)

**Response**:
```json
{
  "title": "Page Title",
  "description": "Page description text",
  "image": "https://example.com/og-image.jpg",
  "siteName": "Example",
  "url": "https://example.com/page",
  "favicon": "https://example.com/favicon.ico"
}
```

**Implementation**:
- HTTP fetch of the URL server-side (avoids CORS)
- Parse HTML to extract Open Graph tags (`og:title`, `og:description`, `og:image`, `og:site_name`)
- Fallback to `<title>` and `<meta name="description">` if no OG tags
- Extract favicon from `<link rel="icon">`
- Redis cache with 24h TTL keyed by URL
- 5-second timeout on fetch
- URL validation: must be http/https, reject private IPs (SSRF protection)
- Return 400 for invalid URLs, 422 if page can't be fetched

**Registration**: Add controller and service to `CommunicationsModule`

## Files Modified

1. `frontend/src/components/communications/ConversationView.tsx`
   - Add state for gallery modal (visible, index)
   - Add state for YouTube modal (visible, videoId, title)
   - Collect image attachments into gallery array
   - Replace `window.open()` with gallery open
   - Add LinkPreviewCard rendering after message content
   - Add ImageGalleryModal and YouTubePlayerModal at component bottom

## Files Created

1. `frontend/src/components/communications/ImageGalleryModal.tsx`
2. `frontend/src/components/communications/LinkPreviewCard.tsx`
3. `frontend/src/components/communications/YouTubePlayerModal.tsx`
4. `backend/src/modules/communications/controllers/link-preview.controller.ts`
5. `backend/src/modules/communications/services/link-preview.service.ts`

## Dependencies

No new npm packages. Uses:
- Ant Design Modal (existing)
- CSS transforms for zoom
- YouTube iframe embed API (no library needed)
- Node.js native `fetch` or `axios` (existing in backend) for link preview
- Redis (existing) for caching
