export type BibleVersion = 'BSB' | 'eng_kjv';

export interface BibleVersionMeta {
  id: BibleVersion;
  label: string;
  fullName: string;
  license: string;
}

export const BIBLE_VERSIONS: Record<BibleVersion, BibleVersionMeta> = {
  BSB: {
    id: 'BSB',
    label: 'BSB',
    fullName: 'Berean Standard Bible',
    license: 'Public Domain (CC0)',
  },
  eng_kjv: {
    id: 'eng_kjv',
    label: 'KJV',
    fullName: 'King James Version',
    license: 'Public Domain',
  },
};

export interface BibleBookMeta {
  id: string;
  name: string;
  shortName: string;
  chapters: number;
  testament: 'OT' | 'NT';
  aliases: string[];
}

export const BIBLE_BOOKS: BibleBookMeta[] = [
  // Old Testament
  { id: 'GEN', name: 'Genesis', shortName: 'Gen', chapters: 50, testament: 'OT', aliases: ['gen', 'ge', 'gn'] },
  { id: 'EXO', name: 'Exodus', shortName: 'Exod', chapters: 40, testament: 'OT', aliases: ['exo', 'exod', 'ex'] },
  { id: 'LEV', name: 'Leviticus', shortName: 'Lev', chapters: 27, testament: 'OT', aliases: ['lev', 'le', 'lv'] },
  { id: 'NUM', name: 'Numbers', shortName: 'Num', chapters: 36, testament: 'OT', aliases: ['num', 'nu', 'nm', 'nb'] },
  { id: 'DEU', name: 'Deuteronomy', shortName: 'Deut', chapters: 34, testament: 'OT', aliases: ['deut', 'deu', 'dt'] },
  { id: 'JOS', name: 'Joshua', shortName: 'Josh', chapters: 24, testament: 'OT', aliases: ['josh', 'jos', 'jsh'] },
  { id: 'JDG', name: 'Judges', shortName: 'Judg', chapters: 21, testament: 'OT', aliases: ['judg', 'jdg', 'jg', 'jdgs'] },
  { id: 'RUT', name: 'Ruth', shortName: 'Ruth', chapters: 4, testament: 'OT', aliases: ['ruth', 'rut', 'ru'] },
  { id: '1SA', name: '1 Samuel', shortName: '1 Sam', chapters: 31, testament: 'OT', aliases: ['1sam', '1sa', '1s', 'isam', 'firstsamuel'] },
  { id: '2SA', name: '2 Samuel', shortName: '2 Sam', chapters: 24, testament: 'OT', aliases: ['2sam', '2sa', '2s', 'iisam', 'secondsamuel'] },
  { id: '1KI', name: '1 Kings', shortName: '1 Kgs', chapters: 22, testament: 'OT', aliases: ['1kgs', '1ki', '1k', 'ikings', 'firstkings'] },
  { id: '2KI', name: '2 Kings', shortName: '2 Kgs', chapters: 25, testament: 'OT', aliases: ['2kgs', '2ki', '2k', 'iikings', 'secondkings'] },
  { id: '1CH', name: '1 Chronicles', shortName: '1 Chr', chapters: 29, testament: 'OT', aliases: ['1chr', '1ch', '1chron', 'firstchronicles'] },
  { id: '2CH', name: '2 Chronicles', shortName: '2 Chr', chapters: 36, testament: 'OT', aliases: ['2chr', '2ch', '2chron', 'secondchronicles'] },
  { id: 'EZR', name: 'Ezra', shortName: 'Ezra', chapters: 10, testament: 'OT', aliases: ['ezra', 'ezr'] },
  { id: 'NEH', name: 'Nehemiah', shortName: 'Neh', chapters: 13, testament: 'OT', aliases: ['neh', 'ne'] },
  { id: 'EST', name: 'Esther', shortName: 'Esth', chapters: 10, testament: 'OT', aliases: ['esth', 'est', 'es'] },
  { id: 'JOB', name: 'Job', shortName: 'Job', chapters: 42, testament: 'OT', aliases: ['job', 'jb'] },
  { id: 'PSA', name: 'Psalms', shortName: 'Ps', chapters: 150, testament: 'OT', aliases: ['psalms', 'psalm', 'psa', 'ps', 'psm', 'pss'] },
  { id: 'PRO', name: 'Proverbs', shortName: 'Prov', chapters: 31, testament: 'OT', aliases: ['prov', 'pro', 'prv', 'pr'] },
  { id: 'ECC', name: 'Ecclesiastes', shortName: 'Eccl', chapters: 12, testament: 'OT', aliases: ['eccl', 'ecc', 'eccles', 'ec'] },
  { id: 'SNG', name: 'Song of Solomon', shortName: 'Song', chapters: 8, testament: 'OT', aliases: ['songofsolomon', 'songofsongs', 'song', 'sos', 'sng', 'ss', 'canticles'] },
  { id: 'ISA', name: 'Isaiah', shortName: 'Isa', chapters: 66, testament: 'OT', aliases: ['isa', 'is'] },
  { id: 'JER', name: 'Jeremiah', shortName: 'Jer', chapters: 52, testament: 'OT', aliases: ['jer', 'je', 'jr'] },
  { id: 'LAM', name: 'Lamentations', shortName: 'Lam', chapters: 5, testament: 'OT', aliases: ['lam', 'la'] },
  { id: 'EZK', name: 'Ezekiel', shortName: 'Ezek', chapters: 48, testament: 'OT', aliases: ['ezek', 'ezk', 'eze'] },
  { id: 'DAN', name: 'Daniel', shortName: 'Dan', chapters: 12, testament: 'OT', aliases: ['dan', 'da', 'dn'] },
  { id: 'HOS', name: 'Hosea', shortName: 'Hos', chapters: 14, testament: 'OT', aliases: ['hos', 'ho'] },
  { id: 'JOL', name: 'Joel', shortName: 'Joel', chapters: 3, testament: 'OT', aliases: ['joel', 'jol', 'jl'] },
  { id: 'AMO', name: 'Amos', shortName: 'Amos', chapters: 9, testament: 'OT', aliases: ['amos', 'amo', 'am'] },
  { id: 'OBA', name: 'Obadiah', shortName: 'Obad', chapters: 1, testament: 'OT', aliases: ['obad', 'oba', 'ob'] },
  { id: 'JON', name: 'Jonah', shortName: 'Jonah', chapters: 4, testament: 'OT', aliases: ['jonah', 'jon', 'jnh'] },
  { id: 'MIC', name: 'Micah', shortName: 'Mic', chapters: 7, testament: 'OT', aliases: ['mic', 'mc'] },
  { id: 'NAM', name: 'Nahum', shortName: 'Nah', chapters: 3, testament: 'OT', aliases: ['nah', 'nam', 'na'] },
  { id: 'HAB', name: 'Habakkuk', shortName: 'Hab', chapters: 3, testament: 'OT', aliases: ['hab', 'hb'] },
  { id: 'ZEP', name: 'Zephaniah', shortName: 'Zeph', chapters: 3, testament: 'OT', aliases: ['zeph', 'zep', 'zp'] },
  { id: 'HAG', name: 'Haggai', shortName: 'Hag', chapters: 2, testament: 'OT', aliases: ['hag', 'hg'] },
  { id: 'ZEC', name: 'Zechariah', shortName: 'Zech', chapters: 14, testament: 'OT', aliases: ['zech', 'zec', 'zc'] },
  { id: 'MAL', name: 'Malachi', shortName: 'Mal', chapters: 4, testament: 'OT', aliases: ['mal', 'ml'] },

  // New Testament
  { id: 'MAT', name: 'Matthew', shortName: 'Matt', chapters: 28, testament: 'NT', aliases: ['matt', 'mat', 'mt'] },
  { id: 'MRK', name: 'Mark', shortName: 'Mark', chapters: 16, testament: 'NT', aliases: ['mark', 'mrk', 'mk', 'mr'] },
  { id: 'LUK', name: 'Luke', shortName: 'Luke', chapters: 24, testament: 'NT', aliases: ['luke', 'luk', 'lk'] },
  { id: 'JHN', name: 'John', shortName: 'John', chapters: 21, testament: 'NT', aliases: ['john', 'jhn', 'jn', 'joh'] },
  { id: 'ACT', name: 'Acts', shortName: 'Acts', chapters: 28, testament: 'NT', aliases: ['acts', 'act', 'ac'] },
  { id: 'ROM', name: 'Romans', shortName: 'Rom', chapters: 16, testament: 'NT', aliases: ['rom', 'ro', 'rm'] },
  { id: '1CO', name: '1 Corinthians', shortName: '1 Cor', chapters: 16, testament: 'NT', aliases: ['1cor', '1co', 'icor', 'firstcorinthians'] },
  { id: '2CO', name: '2 Corinthians', shortName: '2 Cor', chapters: 13, testament: 'NT', aliases: ['2cor', '2co', 'iicor', 'secondcorinthians'] },
  { id: 'GAL', name: 'Galatians', shortName: 'Gal', chapters: 6, testament: 'NT', aliases: ['gal', 'ga'] },
  { id: 'EPH', name: 'Ephesians', shortName: 'Eph', chapters: 6, testament: 'NT', aliases: ['eph', 'ephes'] },
  { id: 'PHP', name: 'Philippians', shortName: 'Phil', chapters: 4, testament: 'NT', aliases: ['phil', 'php', 'pp'] },
  { id: 'COL', name: 'Colossians', shortName: 'Col', chapters: 4, testament: 'NT', aliases: ['col', 'co'] },
  { id: '1TH', name: '1 Thessalonians', shortName: '1 Thess', chapters: 5, testament: 'NT', aliases: ['1thess', '1thes', '1th', 'firstthessalonians'] },
  { id: '2TH', name: '2 Thessalonians', shortName: '2 Thess', chapters: 3, testament: 'NT', aliases: ['2thess', '2thes', '2th', 'secondthessalonians'] },
  { id: '1TI', name: '1 Timothy', shortName: '1 Tim', chapters: 6, testament: 'NT', aliases: ['1tim', '1ti', '1tm', 'firsttimothy'] },
  { id: '2TI', name: '2 Timothy', shortName: '2 Tim', chapters: 4, testament: 'NT', aliases: ['2tim', '2ti', '2tm', 'secondtimothy'] },
  { id: 'TIT', name: 'Titus', shortName: 'Titus', chapters: 3, testament: 'NT', aliases: ['titus', 'tit', 'ti'] },
  { id: 'PHM', name: 'Philemon', shortName: 'Phlm', chapters: 1, testament: 'NT', aliases: ['phlm', 'phm', 'philem'] },
  { id: 'HEB', name: 'Hebrews', shortName: 'Heb', chapters: 13, testament: 'NT', aliases: ['heb', 'he'] },
  { id: 'JAS', name: 'James', shortName: 'Jas', chapters: 5, testament: 'NT', aliases: ['jas', 'jam', 'jm'] },
  { id: '1PE', name: '1 Peter', shortName: '1 Pet', chapters: 5, testament: 'NT', aliases: ['1pet', '1pe', '1pt', 'firstpeter'] },
  { id: '2PE', name: '2 Peter', shortName: '2 Pet', chapters: 3, testament: 'NT', aliases: ['2pet', '2pe', '2pt', 'secondpeter'] },
  { id: '1JN', name: '1 John', shortName: '1 John', chapters: 5, testament: 'NT', aliases: ['1john', '1jn', '1jhn', '1jo', 'firstjohn'] },
  { id: '2JN', name: '2 John', shortName: '2 John', chapters: 1, testament: 'NT', aliases: ['2john', '2jn', '2jhn', '2jo', 'secondjohn'] },
  { id: '3JN', name: '3 John', shortName: '3 John', chapters: 1, testament: 'NT', aliases: ['3john', '3jn', '3jhn', '3jo', 'thirdjohn'] },
  { id: 'JUD', name: 'Jude', shortName: 'Jude', chapters: 1, testament: 'NT', aliases: ['jude', 'jud', 'jd'] },
  { id: 'REV', name: 'Revelation', shortName: 'Rev', chapters: 22, testament: 'NT', aliases: ['rev', 're', 'revelations'] },
];

export interface ParsedScriptureRef {
  book: BibleBookMeta;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

function normalizeBookToken(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getBookById(bookId: string): BibleBookMeta | undefined {
  return BIBLE_BOOKS.find((b) => b.id === bookId);
}

/**
 * Parse natural scripture citations such as:
 * "John 3:16", "Jn 3:16-18", "Ps 23", "1 Cor 13:4-7", "1cor 13", "Jude 24"
 */
export function parseScriptureReference(input: string): ParsedScriptureRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match optional leading book number + book name, then chapter and optional :verse or :verse-verse
  const match = trimmed.match(/^([1-3]?\s*[a-zA-Z.\s]+?)\s+(\d+)(?:\s*[:.\s]\s*(\d+)(?:\s*[-–—]\s*(\d+))?)?$/);
  if (!match) {
    // Allow matching just a book name (jumps to chapter 1)
    const token = normalizeBookToken(trimmed);
    const bookOnly = BIBLE_BOOKS.find(
      (b) => normalizeBookToken(b.name) === token || b.aliases.includes(token) || normalizeBookToken(b.name).startsWith(token)
    );
    if (bookOnly && token.length >= 2) {
      return { book: bookOnly, chapter: 1 };
    }
    return null;
  }

  const rawBook = normalizeBookToken(match[1]);
  const num1 = parseInt(match[2], 10);
  const num2 = match[3] ? parseInt(match[3], 10) : undefined;
  const num3 = match[4] ? parseInt(match[4], 10) : undefined;

  if (!rawBook || Number.isNaN(num1)) return null;

  // Exact match first, then alias match, then prefix match
  const book =
    BIBLE_BOOKS.find((b) => normalizeBookToken(b.name) === rawBook || b.id.toLowerCase() === rawBook) ||
    BIBLE_BOOKS.find((b) => b.aliases.includes(rawBook)) ||
    BIBLE_BOOKS.find((b) => normalizeBookToken(b.name).startsWith(rawBook));

  if (!book) return null;

  // For single-chapter books (e.g., "Jude 24" vs "Jude 1:24"), treat num1 > 1 as verse number in chapter 1
  if (book.chapters === 1 && num2 === undefined && num1 > 1) {
    return {
      book,
      chapter: 1,
      verseStart: num1,
      verseEnd: num1,
    };
  }

  const chapter = Math.min(Math.max(1, num1), book.chapters);
  const verseStart = num2 !== undefined && !Number.isNaN(num2) ? Math.max(1, num2) : undefined;
  const verseEnd =
    num3 !== undefined && !Number.isNaN(num3) && verseStart !== undefined
      ? Math.max(verseStart, num3)
      : verseStart;

  return { book, chapter, verseStart, verseEnd };
}

export interface BibleVerseSegment {
  text: string;
  wordsOfJesus?: boolean;
  poem?: number;
  descriptive?: boolean;
  lineBreakBefore?: boolean;
}

export type BibleChapterBlock =
  | { type: 'heading'; text: string }
  | { type: 'line_break' }
  | { type: 'verse'; number: number; segments: BibleVerseSegment[] };

export interface BibleChapterData {
  version: BibleVersion;
  bookId: string;
  bookName: string;
  chapter: number;
  blocks: BibleChapterBlock[];
  totalVerses: number;
}

function parseHelloAoChapter(
  version: BibleVersion,
  bookId: string,
  chapter: number,
  raw: any
): BibleChapterData {
  const book = getBookById(bookId);
  const content: any[] = Array.isArray(raw?.chapter?.content) ? raw.chapter.content : [];
  const blocks: BibleChapterBlock[] = [];
  let totalVerses = 0;

  for (const item of content) {
    if (!item || !item.type) continue;

    if (item.type === 'heading' && Array.isArray(item.content)) {
      const text = item.content
        .map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
        .join(' ')
        .trim();
      if (text) {
        blocks.push({ type: 'heading', text });
      }
    } else if (item.type === 'hebrew_subtitle' && Array.isArray(item.content)) {
      const text = item.content
        .map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
        .join(' ')
        .trim();
      if (text) {
        blocks.push({ type: 'heading', text });
      }
    } else if (item.type === 'line_break') {
      blocks.push({ type: 'line_break' });
    } else if (item.type === 'verse' && typeof item.number === 'number') {
      const segments: BibleVerseSegment[] = [];
      let pendingBreak = false;

      for (const part of item.content || []) {
        if (typeof part === 'string') {
          if (part) {
            segments.push({ text: part, lineBreakBefore: pendingBreak });
            pendingBreak = false;
          }
        } else if (part && typeof part === 'object') {
          if (part.lineBreak) {
            pendingBreak = true;
          } else if (typeof part.text === 'string' && part.text.length > 0) {
            segments.push({
              text: part.text,
              wordsOfJesus: Boolean(part.wordsOfJesus),
              poem: typeof part.poem === 'number' ? part.poem : undefined,
              descriptive: Boolean(part.descriptive),
              lineBreakBefore: pendingBreak,
            });
            pendingBreak = false;
          }
          // Ignore { noteId } footnote markers to keep reading uncluttered
        }
      }

      if (segments.length > 0) {
        totalVerses = Math.max(totalVerses, item.number);
        blocks.push({ type: 'verse', number: item.number, segments });
      }
    }
  }

  return {
    version,
    bookId,
    bookName: book?.name || raw?.book?.name || bookId,
    chapter,
    blocks,
    totalVerses,
  };
}

export async function fetchBibleChapter(
  version: BibleVersion,
  bookId: string,
  chapter: number
): Promise<BibleChapterData> {
  const url = `https://bible.helloao.org/api/${version}/${bookId}/${chapter}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Unable to load ${bookId} ${chapter} (${BIBLE_VERSIONS[version].label})`);
  }
  const json = await res.json();
  return parseHelloAoChapter(version, bookId, chapter, json);
}

export function formatReferenceLabel(
  bookName: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number,
  version?: BibleVersion
): string {
  let ref = `${bookName} ${chapter}`;
  if (verseStart) {
    ref += verseEnd && verseEnd !== verseStart ? `:${verseStart}-${verseEnd}` : `:${verseStart}`;
  }
  if (version) {
    ref += ` (${BIBLE_VERSIONS[version].label})`;
  }
  return ref;
}

export function getVersesPlainText(
  data: BibleChapterData,
  verseStart: number,
  verseEnd?: number
): string {
  const end = verseEnd ?? verseStart;
  const lines: string[] = [];
  for (const block of data.blocks) {
    if (block.type === 'verse' && block.number >= verseStart && block.number <= end) {
      const verseText = block.segments
        .map((s) => s.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      lines.push(`${block.number} ${verseText}`);
    }
  }
  const ref = formatReferenceLabel(data.bookName, data.chapter, verseStart, end, data.version);
  return `${lines.join('\n')}\n— ${ref}`;
}
