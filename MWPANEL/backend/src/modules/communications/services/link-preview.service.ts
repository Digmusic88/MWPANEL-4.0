import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';

export interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
  favicon: string | null;
}

// Simple in-memory cache (avoids Redis dependency complexity)
const cache = new Map<string, { data: LinkPreviewData; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 500;

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  async getPreview(url: string): Promise<LinkPreviewData> {
    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('URL no válida');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Solo se permiten URLs HTTP/HTTPS');
    }

    // SSRF protection: block private IPs
    const hostname = parsed.hostname;
    if (this.isPrivateHost(hostname)) {
      throw new BadRequestException('URL no permitida');
    }

    // Check cache
    const cached = cache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const response = await axios.get(url, {
        timeout: 5000,
        maxRedirects: 3,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MWPanelBot/1.0; +https://plataforma.mundoworld.school)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        responseType: 'text',
        maxContentLength: 500 * 1024, // 500KB max
      });

      const html: string = typeof response.data === 'string' ? response.data : '';
      const data = this.parseHtml(html, url);

      // Store in cache
      if (cache.size >= MAX_CACHE_SIZE) {
        // Evict oldest entry
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }
      cache.set(url, { data, expiresAt: Date.now() + CACHE_TTL });

      return data;
    } catch (err) {
      this.logger.warn(`Failed to fetch link preview for ${url}: ${err.message}`);
      // Return minimal data on failure
      return {
        title: null,
        description: null,
        image: null,
        siteName: parsed.hostname,
        url,
        favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`,
      };
    }
  }

  private parseHtml(html: string, originalUrl: string): LinkPreviewData {
    const parsed = new URL(originalUrl);

    const ogTitle = this.extractMeta(html, 'og:title');
    const ogDescription = this.extractMeta(html, 'og:description');
    const ogImage = this.extractMeta(html, 'og:image');
    const ogSiteName = this.extractMeta(html, 'og:site_name');

    // Fallbacks
    const title = ogTitle || this.extractTag(html, 'title');
    const description = ogDescription || this.extractMeta(html, 'description', 'name');

    // Resolve relative image URLs
    let image = ogImage;
    if (image && !image.startsWith('http')) {
      try {
        image = new URL(image, originalUrl).href;
      } catch {
        image = null;
      }
    }

    // Favicon
    const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
    let favicon = faviconMatch?.[1] || null;
    if (favicon && !favicon.startsWith('http')) {
      try {
        favicon = new URL(favicon, originalUrl).href;
      } catch {
        favicon = null;
      }
    }
    if (!favicon) {
      favicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
    }

    return {
      title: title ? title.slice(0, 200) : null,
      description: description ? description.slice(0, 300) : null,
      image,
      siteName: ogSiteName || parsed.hostname,
      url: originalUrl,
      favicon,
    };
  }

  private extractMeta(html: string, property: string, attr: string = 'property'): string | null {
    // Match both property="og:X" content="Y" and content="Y" property="og:X" orderings
    const regex = new RegExp(
      `<meta[^>]+(?:${attr}=["']${property}["'][^>]+content=["']([^"']*?)["']|content=["']([^"']*?)["'][^>]+${attr}=["']${property}["'])`,
      'i',
    );
    const match = html.match(regex);
    return match?.[1] || match?.[2] || null;
  }

  private extractTag(html: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
    const match = html.match(regex);
    return match?.[1]?.trim() || null;
  }

  private isPrivateHost(hostname: string): boolean {
    // Block localhost and private ranges
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return true;
    }

    // Block private IP ranges
    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
      if (parts[0] === 169 && parts[1] === 254) return true;
    }

    return false;
  }
}
