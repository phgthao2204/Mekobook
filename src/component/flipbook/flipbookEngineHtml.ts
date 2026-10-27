/**
 * Mekobook Mobile - HTML5/Canvas 3D Flipbook Engine
 * Features:
 * - Book Cover (book.coverUrl) as Page 1 (Front Cover)
 * - Inner pages from mobile/{page}.jpg
 * - Sliding Window Pre-caching (RAM < 40MB)
 * - Zero Watermark (clean demo)
 * - Real-time Debug telemetry bridge (Page, URL, Cached Window, Gestures)
 */

import { Book, UserPreference } from '../../types';
import { getPageImageUrl } from '../../services/api';
import { PAGE_FLIP_LIB_JS } from './pageFlipScript';
import { ENV } from '../../constants/env';

export interface FlipbookHtmlOptions {
  book: Book;
  accessToken?: string;
  initialPage?: number;
  slidingWindowSize?: number;
  preferences: UserPreference;
}

export function generateFlipbookHtml({
  book,
  accessToken = '',
  initialPage = 1,
  slidingWindowSize = 4,
  preferences,
}: FlipbookHtmlOptions): string {
  const totalPages = book.totalPages;
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error('Tổng số trang không hợp lệ.');

  // Exact 1:1 page mapping matching physical book & TOC numbering
  // Page 1 is Front Cover, Page 2..totalPages-1 are Content, Page totalPages is Back Cover
  const pageUrls: Record<number, { url: string; label: string; isCover: boolean }> = {};
  for (let i = 1; i <= totalPages; i++) {
    const isFirst = i === 1;
    const isLast = i === totalPages;
    const url = getPageImageUrl(book, i);

    pageUrls[i] = {
      url,
      label: isFirst ? 'Bìa trước' : (isLast ? 'Bìa sau' : `Trang ${i}`),
      isCover: isFirst || isLast,
    };
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${escapeHtml(book.title)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    #flipbook-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      background-color: #F1F5F9;
    }

    #book {
      display: none;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.08);
      border-radius: 6px;
    }

    .page {
      background-color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      box-sizing: border-box;
    }

    .page-image-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background-color: #FFFFFF;
    }

    .page-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      pointer-events: none;
    }

    .reader-annotation-layer {
      position: absolute;
      inset: 0;
      z-index: 4;
      pointer-events: none;
      overflow: hidden;
    }
    .reader-annotation-vector {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .reader-annotation-note {
      position: absolute;
      max-width: 58%;
      max-height: 28%;
      overflow: hidden;
      padding: 5px 7px;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-radius: 5px;
      color: #1E293B;
      font-size: 10px;
      line-height: 1.35;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
    }
    .reader-annotation-selected {
      animation: readerAnnotationPulse 0.7s ease-in-out 3;
      filter: drop-shadow(0 0 7px #2563EB);
    }
    @keyframes readerAnnotationPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.28; }
    }

    /* Spine Inner Shadow / Depth Crease */
    .page.--left .page-spine-shadow {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 28px;
      background: linear-gradient(to left, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.04) 45%, rgba(0,0,0,0) 100%);
      pointer-events: none;
      z-index: 5;
    }

    .page.--right .page-spine-shadow {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 28px;
      background: linear-gradient(to right, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.04) 45%, rgba(0,0,0,0) 100%);
      pointer-events: none;
      z-index: 5;
    }

    /* Page Label Footer */
    .page-number {
      position: absolute;
      bottom: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #065F46;
      background-color: #ECFDF5;
      border: 1px solid #A7F3D0;
      padding: 2px 8px;
      border-radius: 6px;
      z-index: 6;
      letter-spacing: 0.5px;
    }
    .page.--left .page-number {
      left: 14px;
    }
    .page.--right .page-number {
      right: 14px;
    }

    /* Loading Spinner */
    #loading-indicator {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      color: #475569;
      font-size: 14px;
      font-weight: 600;
      z-index: 50;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(5, 150, 105, 0.2);
      border-top-color: #059669;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="flipbook-container">
    <div id="loading-indicator">
      <div class="spinner"></div>
      <div>Đang mở sách 3D...</div>
    </div>

    <div id="book">
      ${Array.from({ length: totalPages }, (_, i) => {
        const pageNum = i + 1;
        const pageInfo = pageUrls[pageNum];
        return `
        <div class="page" data-page="${pageNum}">
          <div class="page-image-wrapper">
            <img class="page-img" data-src="${escapeHtml(pageInfo.url)}" alt="${escapeHtml(pageInfo.label)}" />
            <div class="page-spine-shadow"></div>
            <span class="page-number">${escapeHtml(pageInfo.label)}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <!-- Embedded StPageFlip Engine Script (100% Offline Capable) -->
  <script>
    ${PAGE_FLIP_LIB_JS}
  </script>

  <script>
    (function() {
      var bookEl = document.getElementById('book');
      var loadingEl = document.getElementById('loading-indicator');

      var totalPages = ${totalPages};
      var initialPage = Math.max(1, Math.min(${initialPage}, totalPages));
      var windowSize = ${slidingWindowSize};
      var accessToken = ${JSON.stringify(accessToken).replace(/</g, '\\u003c')};
      var apiOrigin = ${JSON.stringify(new URL(ENV.API_BASE_URL).origin)};
      var pageFlipInstance = null;
      var annotations = [];
      var drawingMode = { enabled: false, color: '#EF4444', strokeWidth: 0.004 };
      var activeDrawing = null;

      var preferences = ${JSON.stringify(preferences).replace(/</g, '\\u003c')};
      // Dual-page rendering has been retired because it does not reliably fit
      // the available phone viewport. Ignore older server/local preferences.
      preferences.dualPageMode = false;
      var zoomScale = 1, panX = 0, panY = 0;
      var changing = false;
      // Keep the curl short enough to feel responsive on Android WebView. Image
      // decoding and neighbour preloads are deliberately kept outside this
      // animation window to avoid stealing frames from the page renderer.
      var curlDuration = 380;
      var preloadTimers = [], preloadGeneration = 0, preloadAfterFlipTimer = null;
      bookEl.style.touchAction = 'none';
      function applyAppearance() {
        var background = preferences.themeMode === 'DARK' ? '#18212f' : preferences.themeMode === 'SEPIA' ? '#eadfc8' : '#F1F5F9';
        document.body.style.backgroundColor = background;
        document.getElementById('flipbook-container').style.backgroundColor = background;
        bookEl.style.filter = 'brightness(' + preferences.brightness + ')' + (preferences.themeMode === 'SEPIA' ? ' sepia(0.35)' : '');
      }
      function annotationStrokes(annotation) {
        var value = annotation && annotation.coordinateData;
        if (typeof value === 'string') {
          try { value = JSON.parse(value); } catch (_) { return []; }
        }
        if (!Array.isArray(value)) return [];
        var rawStrokes = Array.isArray(value[0]) ? value : [value];
        return rawStrokes.map(function(stroke) {
          return stroke.filter(function(point) {
            return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
          }).map(function(point) {
            return { x: Math.max(0, Math.min(1, Number(point.x))), y: Math.max(0, Math.min(1, Number(point.y))) };
          });
        }).filter(function(stroke) { return stroke.length > 0; });
      }
      function annotationPoints(annotation) {
        return annotationStrokes(annotation).reduce(function(points, stroke) {
          return points.concat(stroke);
        }, []);
      }
      function applyAnnotations() {
        document.querySelectorAll('.page').forEach(function(pageEl) {
          var wrapper = pageEl.querySelector('.page-image-wrapper');
          if (!wrapper || typeof wrapper.querySelector !== 'function' || typeof wrapper.appendChild !== 'function') return;
          var oldLayer = wrapper.querySelector('.reader-annotation-layer');
          if (oldLayer) oldLayer.remove();
          var pageNumber = Number(pageEl.getAttribute('data-page'));
          var pageAnnotations = annotations.filter(function(item) { return Number(item.pageNumber) === pageNumber; });
          if (!pageAnnotations.length) return;
          var layer = document.createElement('div');
          layer.className = 'reader-annotation-layer';
          pageAnnotations.forEach(function(item) {
            var strokes = annotationStrokes(item);
            var points = strokes[0] || [];
            var color = typeof item.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(item.color) ? item.color : '#FACC15';
            if (item.type === 'STICKY_NOTE') {
              var note = document.createElement('div');
              note.className = 'reader-annotation-note';
              note.setAttribute('data-annotation-id', String(item.id));
              note.style.left = ((points[0] ? points[0].x : 0.06) * 100) + '%';
              note.style.top = ((points[0] ? points[0].y : 0.06) * 100) + '%';
              note.style.backgroundColor = color;
              note.textContent = typeof item.noteText === 'string' ? item.noteText : 'Ghi chú';
              layer.appendChild(note);
              return;
            }
            if (!points.length) return;
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 1000 1000');
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.classList.add('reader-annotation-vector');
            svg.setAttribute('data-annotation-id', String(item.id));
            var isHighlight = item.type === 'HIGHLIGHT';
            var normalizedWidth = Number(item.strokeWidth);
            var strokeWidth = Number.isFinite(normalizedWidth) && normalizedWidth > 0
              ? Math.max(1, Math.min(80, normalizedWidth * 1000)) : (isHighlight ? 24 : 7);
            strokes.forEach(function(stroke, strokeIndex) {
              var pointString = stroke.map(function(point) { return Math.round(point.x * 1000) + ',' + Math.round(point.y * 1000); }).join(' ');
              var shape = document.createElementNS('http://www.w3.org/2000/svg', isHighlight && strokeIndex === 0 && stroke.length >= 3 ? 'polygon' : 'polyline');
              shape.setAttribute('points', pointString);
              shape.setAttribute('fill', isHighlight && strokeIndex === 0 && stroke.length >= 3 ? color : 'none');
              shape.setAttribute('fill-opacity', '0.28');
              shape.setAttribute('stroke', color);
              shape.setAttribute('stroke-opacity', isHighlight ? '0.4' : '0.9');
              shape.setAttribute('stroke-width', String(strokeWidth));
              shape.setAttribute('stroke-linecap', 'round');
              shape.setAttribute('stroke-linejoin', 'round');
              svg.appendChild(shape);
            });
            layer.appendChild(svg);
          });
          wrapper.appendChild(layer);
        });
      }
      function focusAnnotation(annotationId) {
        var wanted = String(annotationId);
        document.querySelectorAll('[data-annotation-id]').forEach(function(element) {
          element.classList.remove('reader-annotation-selected');
          if (element.getAttribute('data-annotation-id') === wanted) {
            void element.getBoundingClientRect();
            element.classList.add('reader-annotation-selected');
            setTimeout(function() { element.classList.remove('reader-annotation-selected'); }, 2300);
          }
        });
      }
      applyAppearance();
      function applyZoom() {
        var baseWidth = bookEl.offsetWidth || window.innerWidth;
        var baseHeight = bookEl.offsetHeight || window.innerHeight;
        var limitX = Math.max(0, (baseWidth * zoomScale - window.innerWidth) / 2);
        var limitY = Math.max(0, (baseHeight * zoomScale - window.innerHeight) / 2);
        if (zoomScale <= 1) panX = panY = 0;
        panX = Math.max(-limitX, Math.min(limitX, panX));
        panY = Math.max(-limitY, Math.min(limitY, panY));
        bookEl.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoomScale + ')';
      }
      var audioContext = null;
      function playPageSound() {
        if (!preferences.pageTurnSoundEnabled) return;
        try {
          audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
          audioContext.resume();
          var buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * 0.12), audioContext.sampleRate);
          var samples = buffer.getChannelData(0);
          for (var i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * 0.06 * (1 - i / samples.length);
          var source = audioContext.createBufferSource(); source.buffer = buffer; source.connect(audioContext.destination); source.start();
        } catch (_) {}
      }
      function waitForPage(page) {
        var pages = [page];
        if (preferences.dualPageMode && page < totalPages) pages.push(page + 1);
        // Cancel obsolete low-priority work immediately, but do not schedule a
        // new neighbour window until the page animation has finished.
        if (pageFlipInstance) {
          preloadTimers.forEach(clearTimeout);
          preloadTimers = [];
          preloadGeneration++;
          document.querySelectorAll('.page').forEach(function(pageEl) {
            var pageNumber = Number(pageEl.getAttribute('data-page'));
            var pendingImage = pageEl.querySelector('.page-img');
            if (pendingImage && pages.indexOf(pageNumber) < 0 && !isPageVisible(pageNumber)
              && pendingImage.getAttribute('data-loading-src')) clearImage(pendingImage);
          });
        }
        return Promise.all(pages.map(function(p) {
          var img = document.querySelector('[data-page="' + p + '"] .page-img');
          var targetSrc = img && img.getAttribute('data-src');
          if (img && targetSrc) loadPageImage(img, targetSrc, true);
          function decodeImage() {
            return typeof img.decode === 'function' ? img.decode().catch(function() {}) : Promise.resolve();
          }
          if (img.complete && img.naturalWidth > 0) return decodeImage();
          return new Promise(function(resolve, reject) {
            var timer = setTimeout(function() { cleanup(); reject(new Error('Không tải được ảnh trang ' + p)); }, 15000);
            function cleanup() { clearTimeout(timer); img.removeEventListener('load', loaded); img.removeEventListener('error', failed); }
            function loaded() { cleanup(); decodeImage().then(resolve, resolve); }
            function failed() { cleanup(); reject(new Error('Không tải được ảnh trang ' + p)); }
            img.addEventListener('load', loaded); img.addEventListener('error', failed);
          });
        }));
      }
      function isPageVisible(page) {
        if (!pageFlipInstance) return page === initialPage;
        var visiblePage = pageFlipInstance.getCurrentPageIndex() + 1;
        return page === visiblePage || (preferences.dualPageMode && page === visiblePage + 1);
      }
      function navigatePage(page, direction) {
        if (changing || pageFlipInstance.getState() !== 'read') return;
        var target = Math.max(1, Math.min(page, totalPages));
        if (target === pageFlipInstance.getCurrentPageIndex() + 1) return;
        changing = true;
        waitForPage(target).then(function() {
          if (preferences.pageTurnEffect === 'CURL_3D') {
            if (direction === 1) pageFlipInstance.flipNext();
            else if (direction === -1) pageFlipInstance.flipPrev();
            else pageFlipInstance.flip(target - 1);
          } else {
            pageFlipInstance.turnToPage(target - 1);
            bookEl.animate(preferences.pageTurnEffect === 'FADE' ? [{ opacity: 0.15 }, { opacity: 1 }]
              : [{ transform: 'translateX(' + (direction < 0 ? '-8%' : '8%') + ')' }, { transform: 'translateX(0)' }], { duration: 260 });
          }
          playPageSound();
          zoomScale = 1; panX = panY = 0; applyZoom();
          if (preferences.pageTurnEffect === 'CURL_3D') {
            setTimeout(function() { changing = false; }, curlDuration + 70);
          } else {
            changing = false;
          }
        }).catch(function(error) {
          changing = false;
          postToRN({ type: 'ERROR', message: error.message });
        });
      }

      function jumpToPage(page, retryCount) {
        var target = Math.max(1, Math.min(Math.floor(Number(page) || 1), totalPages));
        var retries = Number(retryCount) || 0;
        // Commands can arrive while a previous curl animation is still ending.
        // Do not silently discard an explicit page request from the page picker.
        if (changing || !pageFlipInstance || pageFlipInstance.getState() !== 'read') {
          if (retries < 30) setTimeout(function() { jumpToPage(target, retries + 1); }, 80);
          else postToRN({ type: 'ERROR', message: 'Chưa thể chuyển đến trang ' + target + '. Vui lòng thử lại.' });
          return;
        }
        if (isPageVisible(target)) return;
        changing = true;
        waitForPage(target).then(function() {
          // Direct navigation must use an absolute page index. flip() is for
          // animated page curls and can align to a neighboring spread.
          pageFlipInstance.turnToPage(target - 1);
          zoomScale = 1; panX = panY = 0; applyZoom();
          // Some Android WebViews/PageFlip builds silently ignore a distant
          // turnToPage call while their internal layout is settling. Verify the
          // result and retry with the absolute flip API instead of losing the
          // user's explicit page-picker request.
          setTimeout(function() {
            if (pageFlipInstance.getCurrentPageIndex() + 1 === target) {
              changing = false;
              return;
            }
            try { pageFlipInstance.flip(target - 1); } catch (_) {}
            setTimeout(function() {
              changing = false;
              if (pageFlipInstance.getCurrentPageIndex() + 1 !== target) {
                postToRN({ type: 'ERROR', message: 'Không thể chuyển đến trang ' + target + '. Vui lòng thử lại.' });
              }
            }, 700);
          }, 120);
        }).catch(function(error) {
          changing = false;
          postToRN({ type: 'ERROR', message: error.message });
        });
      }

      function postToRN(data) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      }

      function drawingPoint(touch, wrapper) {
        var rect = wrapper.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return {
          x: Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width)),
          y: Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height))
        };
      }
      function drawingWrapperAt(touch) {
        var target = document.elementFromPoint(touch.clientX, touch.clientY);
        return target && target.closest ? target.closest('.page-image-wrapper') : null;
      }
      function renderActiveDrawing() {
        if (!activeDrawing) return;
        var old = activeDrawing.wrapper.querySelector('.reader-active-drawing');
        if (old) old.remove();
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 1000 1000');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.classList.add('reader-annotation-vector', 'reader-active-drawing');
        svg.style.zIndex = '7';
        svg.style.pointerEvents = 'none';
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line.setAttribute('points', activeDrawing.points.map(function(point) {
          return Math.round(point.x * 1000) + ',' + Math.round(point.y * 1000);
        }).join(' '));
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', drawingMode.color);
        line.setAttribute('stroke-width', String(Math.max(1, drawingMode.strokeWidth * 1000)));
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(line);
        activeDrawing.wrapper.appendChild(svg);
      }

      document.addEventListener('touchstart', function(e) {
        if (!drawingMode.enabled || e.touches.length !== 1) return;
        var wrapper = drawingWrapperAt(e.touches[0]);
        if (!wrapper) return;
        var pageEl = wrapper.closest('.page');
        var point = drawingPoint(e.touches[0], wrapper);
        if (!pageEl || !point) return;
        activeDrawing = { wrapper: wrapper, pageNumber: Number(pageEl.getAttribute('data-page')), points: [point] };
        renderActiveDrawing();
        e.preventDefault(); e.stopImmediatePropagation();
      }, { capture: true, passive: false });
      document.addEventListener('touchmove', function(e) {
        if (!drawingMode.enabled || !activeDrawing || e.touches.length !== 1) return;
        var point = drawingPoint(e.touches[0], activeDrawing.wrapper);
        var previous = activeDrawing.points[activeDrawing.points.length - 1];
        if (point && (!previous || Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y) > 0.002)) {
          if (activeDrawing.points.length < 500) activeDrawing.points.push(point);
          renderActiveDrawing();
        }
        e.preventDefault(); e.stopImmediatePropagation();
      }, { capture: true, passive: false });
      document.addEventListener('touchend', function(e) {
        if (!drawingMode.enabled || !activeDrawing) return;
        var completed = activeDrawing;
        activeDrawing = null;
        var preview = completed.wrapper.querySelector('.reader-active-drawing');
        if (preview) preview.remove();
        if (completed.points.length > 1) {
          postToRN({ type: 'DRAWING_CREATED', drawing: {
            bookId: ${book.id}, pageNumber: completed.pageNumber, type: 'DRAWING_PEN',
            coordinateData: completed.points, color: drawingMode.color, strokeWidth: drawingMode.strokeWidth
          }});
        }
        e.preventDefault(); e.stopImmediatePropagation();
      }, { capture: true, passive: false });

      function clearImage(img) {
        if (img.loadController) { img.loadController.abort(); img.loadController = null; }
        var objectUrl = img.getAttribute('data-object-url');
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        img.removeAttribute('data-object-url');
        img.removeAttribute('data-loading-src');
        img.removeAttribute('data-loaded-src');
        img.removeAttribute('src');
      }

      function loadPageImage(img, targetSrc, highPriority) {
        if ('fetchPriority' in img) img.fetchPriority = highPriority ? 'high' : 'low';
        if (img.getAttribute('data-loading-src') === targetSrc
          || (img.getAttribute('data-loaded-src') === targetSrc && (!img.complete || img.naturalWidth > 0))) return;
        img.setAttribute('data-loading-src', targetSrc);
        var target;
        try { target = new URL(targetSrc); } catch (_) { img.src = targetSrc; return; }
        if (!accessToken || target.origin !== apiOrigin) {
          img.src = targetSrc;
          img.setAttribute('data-loaded-src', targetSrc);
          img.removeAttribute('data-loading-src');
          return;
        }
        var controller = new AbortController();
        img.loadController = controller;
        function fetchImage(attempt) {
          return fetch(targetSrc, {
            signal: controller.signal,
            headers: {
              'Authorization': 'Bearer ' + accessToken,
              'ngrok-skip-browser-warning': 'true'
            },
            priority: highPriority ? 'high' : 'low'
          }).then(function(response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            if (!/^image\\//i.test(response.headers.get('content-type') || '')) throw new Error('Máy chủ chưa trả ảnh hợp lệ.');
            return response.blob();
          }).catch(function(error) {
            if (controller.signal.aborted || attempt >= 3) throw error;
            return new Promise(function(resolve) {
              setTimeout(resolve, attempt * 500);
            }).then(function() { return fetchImage(attempt + 1); });
          });
        }
        fetchImage(1).then(function(blob) {
          if (img.loadController !== controller || controller.signal.aborted) return;
          img.loadController = null;
          var oldObjectUrl = img.getAttribute('data-object-url');
          if (oldObjectUrl) URL.revokeObjectURL(oldObjectUrl);
          var objectUrl = URL.createObjectURL(blob);
          img.setAttribute('data-object-url', objectUrl);
          img.setAttribute('data-loaded-src', targetSrc);
          img.removeAttribute('data-loading-src');
          img.src = objectUrl;
        }).catch(function(error) {
          if (controller.signal.aborted || img.loadController !== controller) return;
          img.loadController = null;
          img.removeAttribute('data-loading-src');
          // Only the active page's waitForPage reports errors. A failed
          // neighbor preload must not close a page that is already readable.
          img.dispatchEvent(new Event('error'));
        });
      }

      // SLIDING WINDOW PRE-CACHING
      function updateSlidingWindow(currentPage) {
        preloadTimers.forEach(clearTimeout);
        preloadTimers = [];
        var generation = ++preloadGeneration;
        var minPage = Math.max(1, currentPage - 2);
        var maxPage = Math.min(totalPages, currentPage + windowSize);
        var visibleEnd = Math.min(totalPages, currentPage + (preferences.dualPageMode ? 1 : 0));

        var allPages = document.querySelectorAll('.page');
        allPages.forEach(function(el) {
          var p = parseInt(el.getAttribute('data-page'), 10);
          var img = el.querySelector('.page-img');
          if (!img) return;

          if (p >= minPage && p <= maxPage) {
            var targetSrc = img.getAttribute('data-src');
            var isVisible = p >= currentPage && p <= visibleEnd;
            if (isVisible) {
              loadPageImage(img, targetSrc, true);
            } else {
              var delay = Math.max(100, Math.abs(p - currentPage) * 140);
              preloadTimers.push(setTimeout(function() {
                if (generation === preloadGeneration) loadPageImage(img, targetSrc, false);
              }, delay));
            }
          } else {
            if (img.src || img.getAttribute('data-loading-src')) clearImage(img);
          }
        });
      }

      async function initFlipbook() {
        var containerWidth = window.innerWidth;
        var containerHeight = window.innerHeight;

        var usePortrait = !preferences.dualPageMode;

        updateSlidingWindow(initialPage);

        try {
          await waitForPage(initialPage);
          var initialImage = document.querySelector('[data-page="' + initialPage + '"] .page-img');
          var imageAspect = initialImage && initialImage.naturalWidth > 0 && initialImage.naturalHeight > 0
            ? initialImage.naturalWidth / initialImage.naturalHeight : 0.7;
          // Avoid malformed image metadata producing an unusable book frame.
          imageAspect = Math.max(0.45, Math.min(1.2, imageAspect));
          var pageTargetWidth = usePortrait
            ? Math.floor(containerWidth * 0.94)
            : Math.floor((containerWidth * 0.95) / 2);
          // A dual spread must preserve the real page ratio. Using 88% of the
          // viewport height here made each half-page extremely tall and left
          // large blank bands above and below the source image on phones.
          // Reserve space for the native top and bottom controls so page
          // content is not hidden behind either toolbar.
          var availableHeight = Math.max(120, containerHeight - 190);
          var pageTargetHeight = Math.min(availableHeight, Math.floor(pageTargetWidth / imageAspect));
          bookEl.style.display = 'block';
          pageFlipInstance = new St.PageFlip(bookEl, {
            width: pageTargetWidth,
            height: pageTargetHeight,
            size: 'stretch',
            // StPageFlip decides portrait mode from: containerWidth < 2 * minWidth.
            // A fixed 160px threshold lets common phones (~360-430px wide) fall
            // back to a two-page landscape spread even when the user selected
            // one page. Keep the single-page threshold above half the viewport;
            // dual-page mode disables portrait and keeps the smaller minimum.
            minWidth: preferences.dualPageMode ? 80 : Math.max(160, Math.floor(containerWidth * 0.6)),
            maxWidth: 1200,
            minHeight: 120,
            maxHeight: 1800,
            // Dynamic canvas shadows are expensive on phone WebViews. The curl
            // geometry still provides the 3D effect; keep shadows for the
            // larger tablet viewport where there is more rendering headroom.
            drawShadow: containerWidth >= 700,
            maxShadowOpacity: 0.18,
            flippingTime: curlDuration,
            usePortrait: usePortrait,
            startPage: initialPage - 1,
            showCover: false,
            mobileScrollSupport: false,
            swipeDistance: 15,
            showPageCorners: false,
            // Use exactly one gesture owner. The native PageFlip touch handler
            // and our reader swipe handler previously reacted to the same
            // gesture, which could advance twice or bounce to the old page.
            useMouseEvents: false,
            clickEventForward: true,
          });

          pageFlipInstance.on('flip', function(e) {
            var newPage = e.data + 1;
            if (!changing) playPageSound();
            // The destination image was decoded before navigatePage initiated
            // the curl. Start neighbour fetch/decode only after the animation
            // has settled so it cannot cause dropped frames mid-turn.
            if (preloadAfterFlipTimer) clearTimeout(preloadAfterFlipTimer);
            preloadAfterFlipTimer = setTimeout(function() {
              preloadAfterFlipTimer = null;
              if (isPageVisible(newPage)) updateSlidingWindow(newPage);
            }, preferences.pageTurnEffect === 'CURL_3D' ? curlDuration + 80 : 40);
            postToRN({
              type: 'PAGE_CHANGED',
              page: newPage,
              totalPages: totalPages
            });
          });

          pageFlipInstance.on('init', function() {
            loadingEl.style.display = 'none';
            bookEl.style.display = 'block';
            applyAnnotations();
            postToRN({
              type: 'ENGINE_READY',
              totalPages: totalPages
            });
          });

          pageFlipInstance.loadFromHTML(document.querySelectorAll('.page'));
        } catch (err) {
          loadingEl.textContent = 'Không thể mở nội dung sách.';
          postToRN({ type: 'ERROR', message: err.message });
        }
      }

      // Quick tap detection in center to toggle chrome
      var touchStartX = 0;
      var touchStartY = 0;
      var touchStartTime = 0;
      var suppressPageTurnUntilAllTouchesEnd = false;

      window.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
          // A pinch starts with one finger and then receives a second
          // touchstart. Never reinterpret either release as a page swipe.
          suppressPageTurnUntilAllTouchesEnd = true;
          return;
        }
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = Date.now();
        }
      }, { passive: true });

      window.addEventListener('touchend', function(e) {
        if (!suppressPageTurnUntilAllTouchesEnd && !drawingMode.enabled && e.changedTouches.length === 1) {
          var deltaX = e.changedTouches[0].clientX - touchStartX;
          var dx = Math.abs(deltaX);
          var dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
          var dt = Date.now() - touchStartTime;

          // A deliberate horizontal swipe is easier to discover than dragging
          // the page corner; keep the selected 3D curl effect for that turn.
          if (pageFlipInstance && zoomScale <= 1.01 && dx > 40 && dy < 55) {
            var dir = deltaX < 0 ? 1 : -1;
            navigatePage(pageFlipInstance.getCurrentPageIndex() + 1 + dir * (preferences.dualPageMode ? 2 : 1), dir);
          }
          if (zoomScale <= 1.01 && dx < 10 && dy < 10 && dt < 280) {
            var x = e.changedTouches[0].clientX;
            var w = window.innerWidth;
            // Keep generous left/right zones so page turning remains usable
            // when the native controls are hidden in full-screen reading.
            if (pageFlipInstance && x < w * 0.3) {
              navigatePage(pageFlipInstance.getCurrentPageIndex() + 1 - (preferences.dualPageMode ? 2 : 1), -1);
            } else if (pageFlipInstance && x > w * 0.7) {
              navigatePage(pageFlipInstance.getCurrentPageIndex() + 1 + (preferences.dualPageMode ? 2 : 1), 1);
            } else if (x > w * 0.3 && x < w * 0.7) {
              postToRN({ type: 'TAP_CENTER' });
            }
          }
        }
        if (!e.touches || e.touches.length === 0) suppressPageTurnUntilAllTouchesEnd = false;
      }, { passive: true });

      var drag = null;
      var pinchDistance = 0;
      var pinchStartScale = 1;
      var pinchStartX = 0, pinchStartY = 0, pinchStartPanX = 0, pinchStartPanY = 0;
      var lastZoomNotification = 0;
      function notifyZoom(force) {
        var now = Date.now();
        if (!force && now - lastZoomNotification < 80) return;
        lastZoomNotification = now;
        postToRN({ type: 'ZOOM_CHANGED', scale: zoomScale });
      }
      function touchDistance(touches) {
        var dx = touches[0].clientX - touches[1].clientX;
        var dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
      }
      bookEl.addEventListener('pointerdown', function(e) {
        if (zoomScale <= 1 || e.pointerType === 'touch') return;
        e.preventDefault(); e.stopImmediatePropagation();
        drag = { x: e.clientX, y: e.clientY, px: panX, py: panY };
        bookEl.setPointerCapture(e.pointerId);
      }, true);
      bookEl.addEventListener('pointermove', function(e) {
        if (!drag) return;
        e.preventDefault(); e.stopImmediatePropagation();
        panX = drag.px + e.clientX - drag.x; panY = drag.py + e.clientY - drag.y; applyZoom();
      }, true);
      bookEl.addEventListener('pointerup', function(e) { if (drag) { e.stopImmediatePropagation(); drag = null; } }, true);
      bookEl.addEventListener('pointercancel', function() { drag = null; });
      bookEl.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
          pinchDistance = touchDistance(e.touches);
          pinchStartScale = zoomScale;
          pinchStartPanX = panX; pinchStartPanY = panY;
          pinchStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          pinchStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          drag = null;
          e.preventDefault(); e.stopImmediatePropagation();
        } else if (zoomScale > 1) {
          var point = e.touches[0];
          if (point) drag = { x: point.clientX, y: point.clientY, px: panX, py: panY };
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, { capture: true, passive: false });
      bookEl.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2 && pinchDistance > 0) {
          var nextScale = Math.max(1, Math.min(3, pinchStartScale * touchDistance(e.touches) / pinchDistance));
          var centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          var centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          var originX = window.innerWidth / 2, originY = window.innerHeight / 2;
          var contentX = (pinchStartX - originX - pinchStartPanX) / pinchStartScale;
          var contentY = (pinchStartY - originY - pinchStartPanY) / pinchStartScale;
          zoomScale = nextScale;
          panX = centerX - originX - contentX * zoomScale;
          panY = centerY - originY - contentY * zoomScale;
          applyZoom();
          notifyZoom(false);
          e.preventDefault(); e.stopImmediatePropagation();
        } else if (zoomScale > 1) {
          if (e.touches.length === 1 && drag) {
            panX = drag.px + e.touches[0].clientX - drag.x;
            panY = drag.py + e.touches[0].clientY - drag.y;
            applyZoom();
          }
          e.preventDefault(); e.stopImmediatePropagation();
        }
      }, { capture: true, passive: false });
      bookEl.addEventListener('touchend', function(e) {
        if (e.touches.length < 2 && pinchDistance > 0) {
          pinchDistance = 0;
          notifyZoom(true);
          if (zoomScale > 1 && e.touches.length === 1) {
            drag = { x: e.touches[0].clientX, y: e.touches[0].clientY, px: panX, py: panY };
          }
        }
        if (e.touches.length === 0) drag = null;
      }, { capture: true, passive: true });
      function handleRNCommand(rawData) {
        try {
          var msg = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          if (msg.type === 'SET_ACCESS_TOKEN') { accessToken = typeof msg.token === 'string' ? msg.token : ''; return; }
          if (msg.type === 'SET_ANNOTATIONS') {
            annotations = Array.isArray(msg.annotations) ? msg.annotations : [];
            applyAnnotations();
            return;
          }
          if (msg.type === 'SELECT_ANNOTATION') {
            focusAnnotation(Number(msg.annotationId));
            return;
          }
          if (msg.type === 'SET_DRAWING_MODE') {
            drawingMode.enabled = !!msg.enabled;
            if (typeof msg.color === 'string' && /^#[0-9a-f]{6}$/i.test(msg.color)) drawingMode.color = msg.color;
            var width = Number(msg.strokeWidth);
            if (Number.isFinite(width)) drawingMode.strokeWidth = Math.max(0.001, Math.min(0.03, width));
            bookEl.style.cursor = drawingMode.enabled ? 'crosshair' : '';
            return;
          }
          if (msg.type === 'UPDATE_PREFERENCES') {
            preferences = Object.assign({}, preferences, msg.preferences || {});
            applyAppearance();
            return;
          }
          if (!pageFlipInstance) return;

          switch(msg.type) {
            case 'ZOOM':
              zoomScale = Math.max(1, Math.min(3, Number(msg.scale) || 1));
              panX = panY = 0; applyZoom(); break;
            case 'TURN_NEXT':
              navigatePage(pageFlipInstance.getCurrentPageIndex() + 1 + (preferences.dualPageMode ? 2 : 1), 1);
              break;
            case 'TURN_PREV':
              navigatePage(pageFlipInstance.getCurrentPageIndex() + 1 - (preferences.dualPageMode ? 2 : 1), -1);
              break;
            case 'GO_TO_PAGE':
              jumpToPage(msg.page, 0);
              break;
          }
        } catch(e) {
          console.error('[Flipbook Engine] Error:', e);
        }
      }

      window.addEventListener('message', function(e) { handleRNCommand(e.data); });
      document.addEventListener('message', function(e) { handleRNCommand(e.data); });

      window.addEventListener('resize', function() {
        if (pageFlipInstance) {
          pageFlipInstance.update();
        }
      });

      window.addEventListener('pagehide', function() {
        if (preloadAfterFlipTimer) clearTimeout(preloadAfterFlipTimer);
        document.querySelectorAll('.page-img').forEach(function(img) { clearImage(img); });
        if (audioContext) audioContext.close();
        if (pageFlipInstance) pageFlipInstance.destroy();
      });
      window.onload = initFlipbook;
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
