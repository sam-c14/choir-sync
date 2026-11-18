import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Copy,
  Check,
  Radio,
  Loader2,
  AlertCircle,
  ChevronDown,
  Minus,
  Plus,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  BIBLE_BOOKS,
  BIBLE_VERSIONS,
  BibleVersion,
  fetchBibleChapter,
  formatReferenceLabel,
  getBookById,
  getVersesPlainText,
  parseScriptureReference,
} from '../../lib/bible';
import type { CalledBibleReference } from '../../hooks/use-audio-room';

interface BibleReaderPanelProps {
  onClose: () => void;
  canBroadcast?: boolean;
  calledReference?: CalledBibleReference | null;
  jumpTarget?: {
    bookId: string;
    chapter: number;
    verseStart?: number;
    verseEnd?: number;
    version?: BibleVersion;
    nonce: number;
  } | null;
  onShareReference?: (ref: {
    bookId: string;
    bookName: string;
    chapter: number;
    verseStart?: number;
    verseEnd?: number;
    version: BibleVersion;
  }) => void;
}

const FONT_SIZES = ['text-sm', 'text-base', 'text-lg', 'text-xl'] as const;

export function BibleReaderPanel({
  onClose,
  canBroadcast = false,
  calledReference,
  jumpTarget,
  onShareReference,
}: BibleReaderPanelProps) {
  const [version, setVersion] = useState<BibleVersion>(() => {
    const saved = localStorage.getItem('choir_bible_version');
    return saved === 'eng_kjv' || saved === 'BSB' ? saved : 'BSB';
  });
  const [bookId, setBookId] = useState<string>('PSA');
  const [chapter, setChapter] = useState<number>(23);
  const [selectedStart, setSelectedStart] = useState<number | undefined>(undefined);
  const [selectedEnd, setSelectedEnd] = useState<number | undefined>(undefined);
  const [fontIdx, setFontIdx] = useState<number>(() => {
    const saved = Number(localStorage.getItem('choir_bible_font_idx'));
    return Number.isInteger(saved) && saved >= 0 && saved < FONT_SIZES.length ? saved : 1;
  });

  const [refQuery, setRefQuery] = useState('');
  const [refError, setRefError] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<'none' | 'book' | 'chapter'>('none');
  const [bookFilter, setBookFilter] = useState('');
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [copied, setCopied] = useState(false);
  const [justShared, setJustShared] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pendingScrollVerseRef = useRef<number | undefined>(undefined);

  const activeBook = useMemo(() => getBookById(bookId) || BIBLE_BOOKS[18], [bookId]);

  useEffect(() => {
    localStorage.setItem('choir_bible_version', version);
  }, [version]);

  useEffect(() => {
    localStorage.setItem('choir_bible_font_idx', String(fontIdx));
  }, [fontIdx]);

  // Apply external jump targets (e.g. clicking "Open Bible" on a called scripture banner)
  useEffect(() => {
    if (!jumpTarget) return;
    if (jumpTarget.version) {
      setVersion(jumpTarget.version);
    }
    setBookId(jumpTarget.bookId);
    setChapter(jumpTarget.chapter);
    setSelectedStart(jumpTarget.verseStart);
    setSelectedEnd(jumpTarget.verseEnd ?? jumpTarget.verseStart);
    pendingScrollVerseRef.current = jumpTarget.verseStart;
    setPickerMode('none');
    setRefError(null);
  }, [jumpTarget]);

  const {
    data: chapterData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bible-chapter', version, bookId, chapter],
    queryFn: () => fetchBibleChapter(version, bookId, chapter),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 2,
  });

  // Scroll to target verse once chapter renders
  useEffect(() => {
    if (!chapterData) return;
    const targetVerse = pendingScrollVerseRef.current;
    if (targetVerse) {
      const timer = setTimeout(() => {
        const el = verseRefs.current.get(targetVerse);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        pendingScrollVerseRef.current = undefined;
      }, 60);
      return () => clearTimeout(timer);
    } else if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }
  }, [chapterData]);

  const handleReferenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseScriptureReference(refQuery);
    if (!parsed) {
      setRefError('Try e.g. "John 3:16", "Ps 23:1-6", or "1 Cor 13"');
      return;
    }
    setRefError(null);
    setBookId(parsed.book.id);
    setChapter(parsed.chapter);
    setSelectedStart(parsed.verseStart);
    setSelectedEnd(parsed.verseEnd);
    pendingScrollVerseRef.current = parsed.verseStart;
    setPickerMode('none');
    setRefQuery('');
  };

  const navigateChapter = (delta: number) => {
    const currentIdx = BIBLE_BOOKS.findIndex((b) => b.id === activeBook.id);
    const nextChap = chapter + delta;

    setSelectedStart(undefined);
    setSelectedEnd(undefined);
    pendingScrollVerseRef.current = undefined;

    if (nextChap >= 1 && nextChap <= activeBook.chapters) {
      setChapter(nextChap);
    } else if (nextChap < 1 && currentIdx > 0) {
      const prevBook = BIBLE_BOOKS[currentIdx - 1];
      setBookId(prevBook.id);
      setChapter(prevBook.chapters);
    } else if (nextChap > activeBook.chapters && currentIdx < BIBLE_BOOKS.length - 1) {
      const nextBook = BIBLE_BOOKS[currentIdx + 1];
      setBookId(nextBook.id);
      setChapter(1);
    }
  };

  const handleVerseClick = (verseNum: number) => {
    if (selectedStart === undefined) {
      setSelectedStart(verseNum);
      setSelectedEnd(verseNum);
    } else if (selectedStart === verseNum && selectedEnd === verseNum) {
      setSelectedStart(undefined);
      setSelectedEnd(undefined);
    } else if (selectedStart === selectedEnd) {
      const min = Math.min(selectedStart, verseNum);
      const max = Math.max(selectedStart, verseNum);
      setSelectedStart(min);
      setSelectedEnd(max);
    } else {
      setSelectedStart(verseNum);
      setSelectedEnd(verseNum);
    }
  };

  const handleCopySelection = async () => {
    if (!chapterData || selectedStart === undefined) return;
    const text = getVersesPlainText(chapterData, selectedStart, selectedEnd);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const handleBroadcastSelection = () => {
    if (!onShareReference) return;
    onShareReference({
      bookId: activeBook.id,
      bookName: activeBook.name,
      chapter,
      verseStart: selectedStart,
      verseEnd: selectedEnd,
      version,
    });
    setJustShared(true);
    setTimeout(() => setJustShared(false), 2000);
  };

  const filteredBooks = useMemo(() => {
    const q = bookFilter.trim().toLowerCase();
    return BIBLE_BOOKS.filter((b) => {
      if (testamentFilter !== 'ALL' && b.testament !== testamentFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.shortName.toLowerCase().includes(q) ||
        b.aliases.some((a) => a.includes(q.replace(/\s+/g, '')))
      );
    });
  }, [bookFilter, testamentFilter]);

  const currentIdx = BIBLE_BOOKS.findIndex((b) => b.id === activeBook.id);
  const canGoPrev = !(currentIdx === 0 && chapter === 1);
  const canGoNext = !(currentIdx === BIBLE_BOOKS.length - 1 && chapter === activeBook.chapters);

  const selectionLabel =
    selectedStart !== undefined
      ? formatReferenceLabel(activeBook.name, chapter, selectedStart, selectedEnd, version)
      : null;

  return (
    <div className="flex flex-col h-full bg-card text-foreground overflow-hidden">
      {/* Reader Header: Title, KJV/BSB Switcher, Font Size, Close */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-tight truncate">Scripture Reader</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {BIBLE_VERSIONS[version].fullName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* KJV / BSB Version Segmented Control */}
          <div
            className="inline-flex rounded-lg bg-muted p-0.5 border"
            role="group"
            aria-label="Bible Version"
          >
            {(['BSB', 'eng_kjv'] as BibleVersion[]).map((v) => {
              const active = version === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVersion(v)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={BIBLE_VERSIONS[v].fullName}
                >
                  {BIBLE_VERSIONS[v].label}
                </button>
              );
            })}
          </div>

          {/* Font Size Controls */}
          <div className="hidden sm:inline-flex items-center rounded-lg border bg-background">
            <button
              type="button"
              onClick={() => setFontIdx((i) => Math.max(0, i - 1))}
              disabled={fontIdx === 0}
              className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-35"
              title="Decrease text size"
              aria-label="Decrease text size"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-semibold px-1 text-muted-foreground">A</span>
            <button
              type="button"
              onClick={() => setFontIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
              disabled={fontIdx === FONT_SIZES.length - 1}
              className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-35"
              title="Increase text size"
              aria-label="Increase text size"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            title="Close Bible Reader"
            aria-label="Close Bible Reader"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Reference Search + Book/Chapter Selector Controls */}
      <div className="px-3.5 py-2.5 border-b space-y-2 bg-background/60 shrink-0">
        <form onSubmit={handleReferenceSubmit} className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={refQuery}
              onChange={(e) => {
                setRefQuery(e.target.value);
                if (refError) setRefError(null);
              }}
              placeholder='Jump to scripture (e.g. "John 3:16", "Ps 23")'
              className="h-8 pl-8 pr-2 text-xs rounded-lg"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-8 px-3 text-xs font-semibold">
            Go
          </Button>
        </form>

        {refError && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 px-0.5">{refError}</p>
        )}

        {/* Book + Chapter Navigation Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Button
              type="button"
              variant={pickerMode === 'book' ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-2.5 text-xs font-semibold gap-1 max-w-[165px]"
              onClick={() => setPickerMode((m) => (m === 'book' ? 'none' : 'book'))}
            >
              <span className="truncate">{activeBook.name}</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
            </Button>

            <Button
              type="button"
              variant={pickerMode === 'chapter' ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-2.5 text-xs font-semibold gap-1"
              onClick={() => setPickerMode((m) => (m === 'chapter' ? 'none' : 'chapter'))}
            >
              <span>Ch {chapter}</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
            </Button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Mobile font size buttons */}
            <div className="inline-flex sm:hidden items-center rounded-lg border bg-background mr-1">
              <button
                type="button"
                onClick={() => setFontIdx((i) => Math.max(0, i - 1))}
                disabled={fontIdx === 0}
                className="p-1.5 text-muted-foreground disabled:opacity-35"
                aria-label="Smaller text"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setFontIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
                disabled={fontIdx === FONT_SIZES.length - 1}
                className="p-1.5 text-muted-foreground disabled:opacity-35"
                aria-label="Larger text"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {canBroadcast && onShareReference && (
              <Button
                type="button"
                size="sm"
                variant={justShared ? 'default' : 'outline'}
                className="h-8 px-2 text-xs gap-1"
                onClick={handleBroadcastSelection}
                title="Share current chapter or selected verses with everyone in the room"
              >
                {justShared ? <Check className="w-3.5 h-3.5" /> : <Radio className="w-3.5 h-3.5 text-primary" />}
                <span className="hidden xl:inline">{justShared ? 'Called' : 'Call'}</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!canGoPrev}
              onClick={() => navigateChapter(-1)}
              title="Previous chapter"
              aria-label="Previous chapter"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!canGoNext}
              onClick={() => navigateChapter(1)}
              title="Next chapter"
              aria-label="Next chapter"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Inline Called Scripture Quick Jump Strip (when looking elsewhere) */}
      {calledReference &&
        (calledReference.bookId !== bookId ||
          calledReference.chapter !== chapter ||
          (calledReference.verseStart && calledReference.verseStart !== selectedStart)) && (
          <div className="px-3.5 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-2 text-xs shrink-0">
            <span className="truncate font-medium text-foreground">
              Called by {calledReference.sharedByName || 'Speaker'}:{' '}
              <strong className="text-purple-700 dark:text-purple-300">
                {formatReferenceLabel(
                  calledReference.bookName,
                  calledReference.chapter,
                  calledReference.verseStart,
                  calledReference.verseEnd,
                  calledReference.version
                )}
              </strong>
            </span>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-6 px-2.5 text-[11px] shrink-0"
              onClick={() => {
                setVersion(calledReference.version);
                setBookId(calledReference.bookId);
                setChapter(calledReference.chapter);
                setSelectedStart(calledReference.verseStart);
                setSelectedEnd(calledReference.verseEnd ?? calledReference.verseStart);
                pendingScrollVerseRef.current = calledReference.verseStart;
                setPickerMode('none');
              }}
            >
              Jump
            </Button>
          </div>
        )}

      {/* Main Body: Book Picker, Chapter Grid, or Scripture Text */}
      <div ref={viewportRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 relative">
        {pickerMode === 'book' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 sticky top-0 bg-card pb-2 z-10 border-b">
              <Input
                value={bookFilter}
                onChange={(e) => setBookFilter(e.target.value)}
                placeholder="Filter books (e.g. Psalms, Romans)..."
                className="h-8 text-xs flex-1"
                autoFocus
              />
              <div className="inline-flex rounded-lg bg-muted p-0.5 border shrink-0">
                {(['ALL', 'OT', 'NT'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTestamentFilter(t)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md ${
                      testamentFilter === t
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {filteredBooks.map((b) => {
                const isSelected = b.id === activeBook.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBookId(b.id);
                      setChapter(1);
                      setSelectedStart(undefined);
                      setSelectedEnd(undefined);
                      setBookFilter('');
                      setPickerMode('chapter');
                    }}
                    className={`text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border/60 text-foreground'
                    }`}
                  >
                    <div className="truncate">{b.name}</div>
                    <div
                      className={`text-[10px] ${
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      }`}
                    >
                      {b.chapters} {b.chapters === 1 ? 'ch' : 'chs'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : pickerMode === 'chapter' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {activeBook.name} — Select Chapter
              </h4>
              <button
                type="button"
                onClick={() => setPickerMode('none')}
                className="text-xs text-primary font-medium hover:underline"
              >
                Done
              </button>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
              {Array.from({ length: activeBook.chapters }, (_, i) => i + 1).map((chNum) => {
                const active = chNum === chapter;
                return (
                  <button
                    key={chNum}
                    type="button"
                    onClick={() => {
                      setChapter(chNum);
                      setSelectedStart(undefined);
                      setSelectedEnd(undefined);
                      pendingScrollVerseRef.current = undefined;
                      setPickerMode('none');
                    }}
                    className={`h-10 rounded-lg text-sm font-semibold border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background hover:bg-muted border-border/60 text-foreground'
                    }`}
                  >
                    {chNum}
                  </button>
                );
              })}
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-2.5 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs">
              Loading {activeBook.name} {chapter} ({BIBLE_VERSIONS[version].label})...
            </p>
          </div>
        ) : error || !chapterData ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3 text-center px-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
            <div>
              <p className="text-sm font-semibold">Failed to load scripture</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check your internet connection and try again.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pb-16">
            <div className="flex items-baseline justify-between border-b pb-2">
              <h2 className="text-lg font-bold tracking-tight">
                {chapterData.bookName} {chapterData.chapter}
              </h2>
              <span className="text-[11px] font-medium text-muted-foreground">
                {BIBLE_VERSIONS[version].label} {isFetching ? '· Syncing...' : ''}
              </span>
            </div>

            <div className={`space-y-1.5 leading-relaxed ${FONT_SIZES[fontIdx]}`}>
              {chapterData.blocks.map((block, idx) => {
                if (block.type === 'heading') {
                  return (
                    <h4
                      key={`h-${idx}`}
                      className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-200 pt-3 pb-0.5 tracking-tight"
                    >
                      {block.text}
                    </h4>
                  );
                }

                if (block.type === 'line_break') {
                  return <div key={`br-${idx}`} className="h-2" />;
                }

                const isHighlighted =
                  selectedStart !== undefined &&
                  block.number >= selectedStart &&
                  block.number <= (selectedEnd ?? selectedStart);

                const hasPoem = block.segments.some((s) => s.poem !== undefined);

                return (
                  <div
                    key={`v-${block.number}`}
                    ref={(el) => {
                      if (el) verseRefs.current.set(block.number, el);
                      else verseRefs.current.delete(block.number);
                    }}
                    onClick={() => handleVerseClick(block.number)}
                    className={`group rounded-lg px-2 py-1 -mx-2 cursor-pointer transition-colors select-text ${
                      isHighlighted
                        ? 'bg-amber-500/15 ring-1 ring-amber-500/40 dark:bg-amber-400/15'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="inline-block font-bold text-[11px] text-purple-600/85 dark:text-purple-300/90 mr-1.5 align-top mt-1 select-none">
                      {block.number}
                    </span>
                    {hasPoem ? (
                      <span className="inline">
                        {block.segments.map((seg, sIdx) => (
                          <React.Fragment key={sIdx}>
                            {(seg.lineBreakBefore || (sIdx > 0 && seg.poem !== undefined)) && <br />}
                            <span
                              className={`${
                                seg.descriptive ? 'italic text-zinc-600 dark:text-zinc-300 block mb-1' : ''
                              } ${seg.poem === 2 ? 'pl-4 inline-block' : ''} ${
                                seg.wordsOfJesus ? 'text-rose-700 dark:text-rose-300' : ''
                              }`}
                            >
                              {seg.text}{' '}
                            </span>
                          </React.Fragment>
                        ))}
                      </span>
                    ) : (
                      <span>
                        {block.segments.map((seg, sIdx) => (
                          <React.Fragment key={sIdx}>
                            {seg.lineBreakBefore && <br />}
                            <span
                              className={`${
                                seg.descriptive ? 'italic text-zinc-600 dark:text-zinc-300 mr-1.5' : ''
                              } ${seg.wordsOfJesus ? 'text-rose-700 dark:text-rose-300' : ''}`}
                            >
                              {seg.text}{' '}
                            </span>
                          </React.Fragment>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Chapter Navigation & Open-Source Attribution */}
            <div className="pt-4 border-t flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                disabled={!canGoPrev}
                onClick={() => navigateChapter(-1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </Button>
              <span className="text-[10px] text-muted-foreground text-center">
                {BIBLE_VERSIONS[version].license}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                disabled={!canGoNext}
                onClick={() => navigateChapter(1)}
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Verse Action Bar when verse(s) selected */}
      {selectionLabel && pickerMode === 'none' && (
        <div className="px-3.5 py-2 border-t bg-muted/60 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 animate-in fade-in duration-150">
          <div className="min-w-0">
            <span className="text-xs font-semibold truncate block">{selectionLabel}</span>
            <span className="text-[10px] text-muted-foreground">
              Tap another verse to select a range
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1"
              onClick={handleCopySelection}
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
            {canBroadcast && onShareReference && (
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={handleBroadcastSelection}
              >
                {justShared ? <Check className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
                <span>{justShared ? 'Called!' : 'Call to Room'}</span>
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setSelectedStart(undefined);
                setSelectedEnd(undefined);
              }}
              aria-label="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
