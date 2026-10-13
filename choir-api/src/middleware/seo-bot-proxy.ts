import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

// Known social media / link-preview bots that don't execute JavaScript.
// These need server-side OG tag injection to produce rich previews.
const BOT_UA_PATTERNS = [
  /WhatsApp/i,
  /facebookexternalhit/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /TelegramBot/i,
  /Discordbot/i,
  /iMessageBot/i,
  /Googlebot/i,        // Also catches Google's link preview renderer
  /bingbot/i,
];

/** Returns true when the User-Agent belongs to a known link-preview bot. */
function isBot(userAgent: string): boolean {
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

/** Format a date as "Oct 12, 2026" for human-readable OG descriptions. */
function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Escape characters that could break an HTML attribute value. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Build the raw OG tag HTML block for a song page. */
function buildSongOgTags(song: {
  title: string;
  composer: string | null;
  originalKey: string | null;
  complexity: string;
}): string {
  const title = escapeHtml(`DGC Resound — ${song.title}`);
  const parts: string[] = [];
  if (song.composer) parts.push(`By ${song.composer}`);
  if (song.originalKey) parts.push(`Key: ${song.originalKey}`);
  parts.push(`Complexity: ${song.complexity}`);
  const description = escapeHtml(parts.join(' · '));
  const imageUrl = 'https://choir-sync.vercel.app/icon-512x512.png';

  return `
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="DGC Resound" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />`.trim();
}

/** Build the raw OG tag HTML block for a playlist page. */
function buildPlaylistOgTags(playlist: {
  title: string;
  description: string | null;
  serviceDate: Date | null;
}): string {
  const title = escapeHtml(`DGC Resound — ${playlist.title}`);
  const parts: string[] = [];
  if (playlist.serviceDate) parts.push(`Service: ${formatDate(playlist.serviceDate)}`);
  if (playlist.description) parts.push(playlist.description);
  const description = escapeHtml(
    parts.length > 0 ? parts.join(' · ') : 'Choir playlist on DGC Resound'
  );
  const imageUrl = 'https://choir-sync.vercel.app/icon-512x512.png';

  return `
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="DGC Resound" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />`.trim();
}

/** Read and cache the built index.html so we don't hit the filesystem on every bot request. */
let cachedIndexHtml: string | null = null;

function getIndexHtml(): string {
  if (cachedIndexHtml) return cachedIndexHtml;

  // In production the static files are served from the dist folder next to the built API.
  // Adjust this path to match your Dockerfile / Render deployment layout.
  const candidates = [
    path.join(__dirname, '../../dist/choir-client/index.html'),
    path.join(__dirname, '../../../dist/choir-client/index.html'),
    path.join(process.cwd(), 'dist/choir-client/index.html'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      cachedIndexHtml = fs.readFileSync(candidate, 'utf-8');
      return cachedIndexHtml;
    }
  }

  throw new Error('index.html not found — build the frontend before starting the server.');
}

/** Inject OG tags into the raw HTML string and send it to the bot. */
function sendWithOgTags(res: Response, ogTagsHtml: string): void {
  const html = getIndexHtml();
  const modified = html.replace('<!-- __OG_TAGS__ -->', `<!-- __OG_TAGS__ -->\n    ${ogTagsHtml}`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(modified);
}

/**
 * SEO Bot Proxy Middleware
 *
 * Intercepts requests from social-media link-preview bots on dynamic routes.
 * Fetches the relevant record from Prisma and returns a server-rendered HTML
 * response with page-specific Open Graph meta tags.
 *
 * All non-bot requests (real users) pass straight through via next().
 */
export async function seoBotProxy(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ua = req.headers['user-agent'] ?? '';

  // Fast path: not a bot → hand off to the normal pipeline
  if (!isBot(ua)) {
    return next();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

  try {
    // /songs/:id
    const songMatch = pathname.match(/^\/songs\/([^/]+)$/);
    if (songMatch) {
      const songId = songMatch[1];
      const song = await prisma.song.findUnique({
        where: { id: songId },
        select: { title: true, composer: true, originalKey: true, complexity: true },
      });

      if (!song) {
        return next(); // Unknown id — fall through to SPA 404 handling
      }

      logger.info({ message: 'SEO bot served song OG tags', songId, ua });
      sendWithOgTags(res, buildSongOgTags(song));
      return;
    }

    // /playlists/:id
    const playlistMatch = pathname.match(/^\/playlists\/([^/]+)$/);
    if (playlistMatch) {
      const playlistId = playlistMatch[1];
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        select: { title: true, description: true, serviceDate: true },
      });

      if (!playlist) {
        return next();
      }

      logger.info({ message: 'SEO bot served playlist OG tags', playlistId, ua });
      sendWithOgTags(res, buildPlaylistOgTags(playlist));
      return;
    }

    // Route not eligible for dynamic OG tags → pass through
    next();
  } catch (err) {
    logger.error({ message: 'seoBotProxy error', error: (err as Error).message, pathname, ua });
    // On error, fall through so the bot at least gets the default index.html
    next();
  }
}
