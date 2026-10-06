import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { FlipbookViewerProps, FlipbookViewerRef } from './FlipbookViewer';
import type { FlipbookToReactNativeMessage, ReactNativeToFlipbookMessage } from '../../types';
import { generateFlipbookHtml } from './flipbookEngineHtml';
import { ENV } from '../../constants/env';

export const FlipbookViewer = forwardRef<FlipbookViewerRef, FlipbookViewerProps>((props, ref) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const html = useMemo(() => generateFlipbookHtml({
    book: props.book, initialPage: props.initialPage,
    slidingWindowSize: ENV.FLIPBOOK.CACHE_SLIDING_WINDOW_SIZE, preferences: props.preferences,
  }).replace('<head>', `<head><script>
    window.ReactNativeWebView = { postMessage: function(data) {
      window.parent.postMessage({ channel: 'mekobook-reader', data: data }, '*');
    }};
  </script>`), [props.book, props.initialPage, props.preferences]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.channel !== 'mekobook-reader') return;
      try {
        const message: FlipbookToReactNativeMessage = JSON.parse(event.data.data);
        switch (message.type) {
          case 'ENGINE_READY': callbacks.current.onReady?.(message.totalPages); break;
          case 'PAGE_CHANGED': callbacks.current.onPageChange?.(message.page, message.totalPages); break;
          case 'TAP_CENTER': callbacks.current.onToggleControls?.(); break;
          case 'ERROR': callbacks.current.onError?.(message.message); break;
        }
      } catch { /* Ignore malformed messages; never log page payloads. */ }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  useImperativeHandle(ref, () => {
    // Sandboxed srcdoc has an opaque origin; source validation is on receive.
    const send = (message: ReactNativeToFlipbookMessage) => frame.current?.contentWindow?.postMessage(message, '*');
    return {
      flipNext: () => send({ type: 'TURN_NEXT' }), flipPrev: () => send({ type: 'TURN_PREV' }),
      goToPage: page => send({ type: 'GO_TO_PAGE', page }), zoom: scale => send({ type: 'ZOOM', scale }),
    };
  }, []);
  return <iframe ref={frame} title={`Trình đọc ${props.book.title}`} srcDoc={html}
    sandbox="allow-scripts" allow="autoplay"
    onError={() => callbacks.current.onError?.('Không thể khởi tạo trình đọc web.')}
    style={{ border: 0, width: '100%', height: '100%', flex: 1, display: 'block', background: '#F1F5F9' }} />;
});
FlipbookViewer.displayName = 'FlipbookViewerWeb';
