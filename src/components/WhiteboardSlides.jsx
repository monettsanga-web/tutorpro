import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileImage, ScrollText, Shield } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * One page of the PDF.
 *
 * pdf.js guards against concurrent renders with a global WeakSet keyed on the
 * canvas ELEMENT (InternalRenderTask.#canvasInUse). Any canvas that is reused
 * can therefore still be "in use" when the next render() starts — cancel() is
 * asynchronous, and StrictMode/remounts can re-enter before it settles. That
 * is what produced "Cannot use the same canvas during multiple render()
 * operations".
 *
 * The fix that removes the whole class of bug: never reuse a canvas. Each
 * render creates a brand-new detached canvas, draws into it, and only then
 * swaps it into the DOM. A freshly constructed element cannot possibly be in
 * pdf.js's in-use set, so the guard can never fire.
 */
function PdfPageView({ pdf, pageNumber, scale, registerNode }) {
  const wrapRef = useRef(null);
  const holderRef = useRef(null);
  const taskRef = useRef(null);
  const chainRef = useRef(Promise.resolve());
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const [painted, setPainted] = useState(false);
  const [failed, setFailed] = useState('');

  useEffect(() => {
    const node = wrapRef.current;
    registerNode?.(pageNumber, node);
    return () => registerNode?.(pageNumber, null);
  }, [pageNumber, registerNode]);

  // Only pages near the viewport are rasterised, so a large coursebook opens
  // instantly and does not exhaust memory on a cheap laptop or phone.
  useEffect(() => {
    const node = wrapRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setVisible(true); });
    }, { rootMargin: '900px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !visible || !scale) return undefined;
    let cancelled = false;

    const draw = async () => {
      // Abandon any render still in flight for this page. We do not need to
      // await it: it owns a different canvas element that we are throwing away.
      taskRef.current?.cancel?.();
      taskRef.current = null;
      if (cancelled) return;

      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const viewport = page.getViewport({ scale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      // A brand-new canvas every time — never touched by a previous render.
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
      canvas.style.display = 'block';
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.style.background = '#fff';
      canvas.setAttribute('aria-label', `Page ${pageNumber}`);

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, viewport.width, viewport.height);

      const task = page.render({ canvasContext: context, viewport });
      taskRef.current = task;
      try {
        await task.promise;
      } catch (renderError) {
        if (renderError?.name === 'RenderingCancelledException') return;
        throw renderError;
      } finally {
        if (taskRef.current === task) taskRef.current = null;
      }
      if (cancelled) return;

      // Swap the finished page in. The old canvas is dropped and garbage
      // collected, taking its entry in pdf.js's in-use set with it.
      const holder = holderRef.current;
      if (!holder) return;
      holder.replaceChildren(canvas);
      setPainted(true);
      setFailed('');
    };

    chainRef.current = chainRef.current
      .catch(() => {})
      .then(() => draw())
      .catch((drawError) => {
        // One bad page must never take down the whole lesson board.
        if (!cancelled) setFailed(drawError?.message || 'This page could not be displayed.');
      });

    return () => {
      cancelled = true;
      taskRef.current?.cancel?.();
      taskRef.current = null;
    };
  }, [pdf, pageNumber, scale, visible]);

  return (
    <div
      ref={wrapRef}
      data-pdf-page={pageNumber}
      style={{
        position: 'relative',
        margin: '0 auto 14px',
        background: '#fff',
        boxShadow: '0 14px 35px rgba(0,0,0,0.38)',
        borderRadius: '4px',
        overflow: 'hidden',
        minHeight: painted ? undefined : '220px',
        width: 'fit-content',
        maxWidth: '100%',
      }}
    >
      <div ref={holderRef} />
      {(!painted || failed) && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeContent: 'center',
          background: '#f3f1f7', color: failed ? '#b4342f' : '#7a7290',
          fontSize: '0.945rem', fontWeight: 800, textAlign: 'center', padding: '10px',
        }}>
          {failed || `Page ${pageNumber}`}
        </div>
      )}
    </div>
  );
}

/**
 * Continuous-scroll PDF board.
 *
 * There are no page buttons: the whole document scrolls like a normal PDF
 * reader. The teacher's scroll position is broadcast so the student's board
 * follows along.
 */
function CustomPdfBoard({
  fileUrl,
  fileName,
  currentPage,
  viewMode = 'fit-width',
  zoom = 1,
  onPageCount,
  onVisiblePageChange,
  onScrollRatioChange,
  followScrollRatio,
  canControl = false,
}) {
  const containerRef = useRef(null);
  const pageNodesRef = useRef(new Map());
  const programmaticScrollRef = useRef(0);
  const reportedPageRef = useRef(1);
  const broadcastTimerRef = useRef(0);
  const ratioTimerRef = useRef(0);
  const [pdf, setPdf] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [baseSize, setBaseSize] = useState(null);
  const [status, setStatus] = useState('Loading PDF…');
  const [error, setError] = useState('');

  const registerNode = useCallback((pageNumber, node) => {
    if (node) pageNodesRef.current.set(pageNumber, node);
    else pageNodesRef.current.delete(pageNumber);
  }, []);

  useEffect(() => {
    let active = true;
    let loaded = null;
    setStatus('Loading PDF…');
    setError('');
    setPdf(null);
    setPageCount(0);
    setBaseSize(null);
    pageNodesRef.current.clear();

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          withCredentials: false,
          disableAutoFetch: false,
          disableStream: false,
        });
        const document = await loadingTask.promise;
        loaded = document;
        if (!active) { await document.destroy?.(); return; }
        const firstPage = await document.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        if (!active) { await document.destroy?.(); return; }
        setBaseSize({ width: viewport.width, height: viewport.height });
        setPageCount(document.numPages || 1);
        setPdf(document);
        onPageCount?.(document.numPages || 1);
        setStatus('');
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.message || 'PDF could not be loaded.');
        setStatus('');
      }
    };

    loadPdf();
    return () => {
      active = false;
      loaded?.destroy?.();
    };
  }, [fileUrl, onPageCount]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const measure = () => setContainerSize({ width: node.clientWidth, height: node.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [pdf]);

  // One scale for every page, so zooming does not reflow pages differently.
  const scale = useMemo(() => {
    if (!baseSize || !containerSize.width) return 0;
    const availableWidth = Math.max(280, containerSize.width - 28);
    const availableHeight = Math.max(220, containerSize.height - 28);
    const fitWidth = availableWidth / baseSize.width;
    const fitPage = Math.min(fitWidth, availableHeight / baseSize.height);
    const base = viewMode === 'fit-page' ? fitPage : fitWidth;
    return Math.max(0.2, Math.min(5, base * (Number(zoom) || 1)));
  }, [baseSize, containerSize, viewMode, zoom]);

  // Report the page currently at the top of the board so the teacher's
  // position can be mirrored to the student.
  const handleScroll = useCallback(() => {
    // Ignore the smooth-scroll we started ourselves, otherwise the teacher and
    // student boards would keep nudging each other.
    if (Date.now() < programmaticScrollRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    // Share the exact position, not just the page. Page-only sync meant the
    // student's board did not move at all while the teacher scrolled within a
    // page, which looked like the sharing was broken.
    if (onScrollRatioChange) {
      const scrollable = container.scrollHeight - container.clientHeight;
      const ratio = scrollable > 0 ? container.scrollTop / scrollable : 0;
      window.clearTimeout(ratioTimerRef.current);
      ratioTimerRef.current = window.setTimeout(() => {
        onScrollRatioChange(Math.max(0, Math.min(1, ratio)));
      }, 90);
    }
    const marker = container.getBoundingClientRect().top + 60;
    let best = 1;
    let bestDistance = Infinity;
    pageNodesRef.current.forEach((node, pageNumber) => {
      if (!node) return;
      const distance = Math.abs(node.getBoundingClientRect().top - marker);
      if (distance < bestDistance) { bestDistance = distance; best = pageNumber; }
    });
    if (best !== reportedPageRef.current) {
      reportedPageRef.current = best;
      // Coalesce fast scrolling through many pages into one broadcast.
      window.clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = window.setTimeout(() => {
        onVisiblePageChange?.(reportedPageRef.current);
      }, 160);
    }
  }, [onVisiblePageChange, onScrollRatioChange]);

  useEffect(() => () => window.clearTimeout(broadcastTimerRef.current), []);

  // Follow the teacher's exact scroll position.
  useEffect(() => {
    if (canControl || typeof followScrollRatio !== 'number') return;
    const container = containerRef.current;
    if (!container) return;
    const scrollable = container.scrollHeight - container.clientHeight;
    if (scrollable <= 0) return;
    const target = followScrollRatio * scrollable;
    // Only move for a real change, so tiny rounding differences do not fight
    // the student's own rendering.
    if (Math.abs(container.scrollTop - target) < 8) return;
    programmaticScrollRef.current = Date.now() + 400;
    container.scrollTo({ top: target, behavior: 'auto' });
  }, [followScrollRatio, canControl, scale]);

  useEffect(() => () => window.clearTimeout(ratioTimerRef.current), []);

  // Follow the page the teacher is on.
  useEffect(() => {
    const target = Math.max(1, Math.min(Number(currentPage) || 1, pageCount || 1));
    if (!pageCount || target === reportedPageRef.current) return;
    const node = pageNodesRef.current.get(target);
    const container = containerRef.current;
    if (!node || !container) return;
    reportedPageRef.current = target;
    programmaticScrollRef.current = Date.now() + 700;
    container.scrollTo({
      top: node.offsetTop - container.offsetTop - 8,
      behavior: 'smooth',
    });
  }, [currentPage, pageCount, scale]);

  return (
    <div
      ref={containerRef}
      data-pdf-scroll="true"
      onScroll={handleScroll}
      style={{
        position: 'absolute',
        inset: 0,
        overflowY: 'auto',
        overflowX: 'auto',
        overscrollBehavior: 'contain',
        background: '#1b1524',
        padding: '14px 10px',
        boxSizing: 'border-box',
      }}
    >
      {pdf && scale > 0 && Array.from({ length: pageCount }, (unused, index) => (
        <PdfPageView
          key={index + 1}
          pdf={pdf}
          pageNumber={index + 1}
          scale={scale}
          registerNode={registerNode}
        />
      ))}
      {(status || error) && (
        <div style={{ margin: 'auto', textAlign: 'center', color: error ? '#fca5a5' : '#e7f8c1', fontSize: '1rem', fontWeight: 800 }}>
          <FileImage style={{ width: '42px', height: '42px', marginBottom: '10px' }} />
          <p style={{ margin: 0 }}>{error || status}</p>
        </div>
      )}
      {!status && !error && pdf && (
        <p style={{ margin: '2px 0 6px', textAlign: 'center', color: '#8d84a1', fontSize: '0.901rem', fontWeight: 700 }}>
          {fileName} · {pageCount} page{pageCount === 1 ? '' : 's'}{canControl ? ' · scroll to move the class through the book' : ''}
        </p>
      )}
    </div>
  );
}

// Inline defensive Error Boundary to catch any child-level rendering errors 
// and print the exact JS exception on the whiteboard screen!
export class SafeSlidesErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("WhiteboardSlides render crash caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '24px', 
          color: '#fca5a5', 
          background: 'rgba(30, 20, 50, 0.85)', 
          borderRadius: '12px', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          margin: '20px',
          fontFamily: 'sans-serif',
          boxSizing: 'border-box'
        }}>
          <h3 style={{ fontSize: '1.113rem', fontWeight: '900', margin: '0 0 10px 0', color: '#ef4444' }}>⚠️ Whiteboard Render Exception</h3>
          <p style={{ fontSize: '0.972rem', margin: '0 0 12px 0', fontWeight: 'bold' }}>{this.state.error?.toString()}</p>
          <pre style={{ 
            fontSize: '0.901rem', 
            background: 'rgba(0,0,0,0.4)', 
            padding: '12px', 
            borderRadius: '8px', 
            overflowX: 'auto', 
            margin: '0',
            color: '#cbd5e1',
            lineHeight: '1.4',
            fontFamily: 'monospace'
          }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export const WhiteboardSlides = ({
  fileId,
  fileName,
  fileUrl,
  totalSlides = 10,
  isTeacher,
  currentPage = 1,
  onPageChange,
  viewMode = 'fit-width',
  zoom = 1,
  onViewChange,
  onScrollRatioChange,
  followScrollRatio,
}) => {
  const [pdfPageCount, setPdfPageCount] = useState(totalSlides);
  const lowerName = fileName?.toLowerCase() || '';
  const lowerUrl = fileUrl?.toLowerCase() || '';
  const isPdf = lowerName.endsWith('.pdf') || lowerUrl.includes('.pdf');
  const isImage = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.gif') || lowerName.endsWith('.webp');
  const isOfficeDoc = lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt') || lowerName.endsWith('.docx') || lowerName.endsWith('.doc');
  const pageTotal = isPdf ? (pdfPageCount || totalSlides) : totalSlides;
  const canControl = Boolean(isTeacher);
  const currentZoom = Number(zoom) || 1;
  const updateView = (changes) => onViewChange?.({ viewMode, zoom: currentZoom, ...changes });

  useEffect(() => {
    setPdfPageCount(totalSlides);
  }, [fileId, fileUrl, totalSlides]);

  return (
    <div className="whiteboard-slides" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      background: '#0c071a',
      borderRadius: '12px',
      overflow: 'hidden',
      height: '100%',
      width: '100%',
      fontFamily: 'sans-serif',
      color: '#fff',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '8px 12px',
        background: '#150f29',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flex: '0 0 auto',
      }}>
        <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', background: 'rgba(188,233,78,0.1)', color: '#bce94e', borderRadius: '6px', display: 'flex' }}>
            <FileImage style={{ width: '16px', height: '16px' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.989rem', fontWeight: 'bold', margin: '0' }}>
              {fileName}
            </h2>
            <p style={{ fontSize: '0.879rem', color: '#b9adc7', margin: '2px 0 0 0' }}>
              {isPdf ? 'Continuous-scroll PDF classroom viewer' : isOfficeDoc ? 'Microsoft Web PowerPoint' : 'Shared Courseware'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flex: '0 0 auto', alignItems: 'center', gap: '6px', fontSize: '0.901rem', color: '#b9adc7' }}>
          <Shield style={{ width: '12px', height: '12px', color: '#bce94e' }} />
          <span>Protected Preview</span>
        </div>
      </div>

      {/* Main viewport */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', background: '#090510', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', overflow: 'hidden' }}>
        {isPdf && (
          <CustomPdfBoard
            fileUrl={fileUrl}
            fileName={fileName}
            currentPage={currentPage}
            viewMode={viewMode}
            zoom={currentZoom}
            onPageCount={setPdfPageCount}
            canControl={canControl}
            onVisiblePageChange={canControl ? onPageChange : undefined}
            onScrollRatioChange={canControl ? onScrollRatioChange : undefined}
            followScrollRatio={followScrollRatio}
          />
        )}
        
        {isOfficeDoc && (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
            style={{ display: 'block', width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', border: 'none', background: '#05020a' }}
            title="Office View"
          />
        )}

        {isImage && (
          <img
            src={fileUrl}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            alt={fileName ? `Lesson material: ${fileName}` : 'Lesson material shared on the classroom board'}
          />
        )}

        {!isPdf && !isOfficeDoc && !isImage && (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '24px' }}>
            <FileImage style={{ width: '48px', height: '48px', color: '#bce94e', marginBottom: '10px' }} />
            <p style={{ fontSize: '1rem', margin: '0' }}>Shared lesson courseware is loading...</p>
          </div>
        )}
      </div>

      {/* Footer toolbar.
          PDFs scroll continuously, so they get a jump box instead of Prev/Next.
          Other courseware still uses page stepping. */}
      <div style={{
        display: 'flex',
        flex: '0 0 auto',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        padding: '8px 12px',
        background: '#150f29',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        gap: '10px'
      }}>
        {!isPdf && (
          <button
            onClick={() => currentPage > 1 && onPageChange?.(currentPage - 1)}
            disabled={!canControl || currentPage <= 1}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: canControl && currentPage > 1 ? 'pointer' : 'not-allowed',
              opacity: !canControl || currentPage <= 1 ? '0.4' : '1',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.945rem',
              fontWeight: 'bold'
            }}
          >
            <ChevronLeft style={{ width: '14px', height: '14px' }} />
            Prev Page
          </button>
        )}

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.934rem', fontWeight: 'bold', background: '#090510', padding: '4px 9px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {isPdf ? 'Jump to' : 'Page'}
          <input
            type="number"
            min="1"
            max={pageTotal}
            value={currentPage}
            onChange={(event) => canControl && onPageChange?.(Math.max(1, Math.min(pageTotal, Number(event.target.value) || 1)))}
            readOnly={!canControl}
            style={{ width: '54px', border: '0', borderRadius: '5px', padding: '4px 5px', background: '#211339', color: '#fff', fontSize: '0.934rem', fontWeight: '900', textAlign: 'center' }}
          />
          / {pageTotal}
        </label>

        {!isPdf && (
          <button
            onClick={() => currentPage < pageTotal && onPageChange?.(currentPage + 1)}
            disabled={!canControl || currentPage >= pageTotal}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: canControl && currentPage < pageTotal ? 'pointer' : 'not-allowed',
              opacity: !canControl || currentPage >= pageTotal ? '0.4' : '1',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.945rem',
              fontWeight: 'bold'
            }}
          >
            Next Page
            <ChevronRight style={{ width: '14px', height: '14px' }} />
          </button>
        )}

        {isPdf && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#8d84a1', fontSize: '0.901rem', fontWeight: 800 }}>
            <ScrollText style={{ width: '13px', height: '13px', color: '#bce94e' }} />
            {canControl ? 'Scroll the book — the student follows you' : 'Scrolls with your teacher'}
          </span>
        )}

        {isPdf && <>
          <button
            onClick={() => updateView({ viewMode: 'fit-width', zoom: 1 })}
            disabled={!canControl}
            style={{ padding: '6px 10px', border: '0', borderRadius: '999px', background: viewMode === 'fit-width' ? '#7048df' : 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.912rem', fontWeight: '900', opacity: canControl ? 1 : 0.45 }}
          >Fit width</button>
          <button
            onClick={() => updateView({ viewMode: 'fit-page', zoom: 1 })}
            disabled={!canControl}
            style={{ padding: '6px 10px', border: '0', borderRadius: '999px', background: viewMode === 'fit-page' ? '#7048df' : 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.912rem', fontWeight: '900', opacity: canControl ? 1 : 0.45 }}
          >Fit page</button>
          <button
            onClick={() => updateView({ zoom: Math.max(0.5, Math.round((currentZoom - 0.15) * 100) / 100) })}
            disabled={!canControl}
            style={{ padding: '6px 10px', border: '0', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.912rem', fontWeight: '900', opacity: canControl ? 1 : 0.45 }}
          >−</button>
          <span style={{ minWidth: '42px', textAlign: 'center', color: '#bce94e', fontSize: '0.923rem', fontWeight: '950' }}>{Math.round(currentZoom * 100)}%</span>
          <button
            onClick={() => updateView({ zoom: Math.min(2.5, Math.round((currentZoom + 0.15) * 100) / 100) })}
            disabled={!canControl}
            style={{ padding: '6px 10px', border: '0', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.912rem', fontWeight: '900', opacity: canControl ? 1 : 0.45 }}
          >+</button>
        </>}
      </div>
    </div>
  );
};
