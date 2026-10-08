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
      box-shadow: 0 16px 40px rgba(5, 150, 105, 0.18), 0 4px 16px rgba(0, 0, 0, 0.12);
      border-radius: 8px;
    }

    .page {
      background-color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 2.5px solid #059669; /* Khung viền xanh lá phân biệt rõ rệt */
      border-radius: 8px;
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

      var preferences = ${JSON.stringify(preferences).replace(/</g, '\\u003c')};
      var zoomScale = 1, panX = 0, panY = 0;
      var changing = false;
      bookEl.style.touchAction = 'none';
      function applyAppearance() {
        var background = preferences.themeMode === 'DARK' ? '#18212f' : preferences.themeMode === 'SEPIA' ? '#eadfc8' : '#F1F5F9';
        document.body.style.backgroundColor = background;
        document.getElementById('flipbook-container').style.backgroundColor = background;
        bookEl.style.filter = 'brightness(' + preferences.brightness + ')' + (preferences.themeMode === 'SEPIA' ? ' sepia(0.35)' : '');
      }
      applyAppearance();
      function applyZoom() {
        var limitX = window.innerWidth * (zoomScale - 1) / 2;
        var limitY = window.innerHeight * (zoomScale - 1) / 2;
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
        updateSlidingWindow(page);
        var pages = [page];
        if (preferences.dualPageMode && page < totalPages) pages.push(page + 1);
        return Promise.all(pages.map(function(p) {
          var img = document.querySelector('[data-page="' + p + '"] .page-img');
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise(function(resolve, reject) {
            var timer = setTimeout(function() { cleanup(); reject(new Error('Không tải được ảnh trang ' + p)); }, 15000);
            function cleanup() { clearTimeout(timer); img.removeEventListener('load', loaded); img.removeEventListener('error', failed); }
            function loaded() { cleanup(); resolve(); }
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
            setTimeout(function() { changing = false; }, 600);
          } else {
            changing = false;
          }
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

      function clearImage(img) {
        if (img.loadController) { img.loadController.abort(); img.loadController = null; }
        var objectUrl = img.getAttribute('data-object-url');
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        img.removeAttribute('data-object-url');
        img.removeAttribute('data-loading-src');
        img.removeAttribute('data-loaded-src');
        img.removeAttribute('src');
      }

      function loadPageImage(img, targetSrc) {
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
            }
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
        var minPage = Math.max(1, currentPage - 2);
        var maxPage = Math.min(totalPages, currentPage + windowSize);
        var loadedPages = [];

        var allPages = document.querySelectorAll('.page');
        allPages.forEach(function(el) {
          var p = parseInt(el.getAttribute('data-page'), 10);
          var img = el.querySelector('.page-img');
          if (!img) return;

          if (p >= minPage && p <= maxPage) {
            var targetSrc = img.getAttribute('data-src');
            loadPageImage(img, targetSrc);
            loadedPages.push(p);
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
          var availableHeight = Math.max(320, containerHeight - 190);
          var pageTargetHeight = usePortrait
            ? Math.min(availableHeight, Math.floor(pageTargetWidth / imageAspect))
            : Math.min(Math.floor(containerHeight * 0.78), Math.floor(pageTargetWidth / imageAspect));
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
            drawShadow: true,
            flippingTime: 550,
            usePortrait: usePortrait,
            startPage: initialPage - 1,
            showCover: false,
            mobileScrollSupport: false,
            swipeDistance: 15,
            showPageCorners: true,
            useMouseEvents: preferences.pageTurnEffect === 'CURL_3D',
            clickEventForward: true,
          });

          pageFlipInstance.on('flip', function(e) {
            var newPage = e.data + 1;
            updateSlidingWindow(newPage);
            if (!changing) playPageSound();
            waitForPage(newPage).catch(function(error) {
              // A user can turn several pages before an older image request
              // times out. Never replace the current page with that stale error.
              if (isPageVisible(newPage)) postToRN({ type: 'ERROR', message: error.message });
            });
            postToRN({
              type: 'PAGE_CHANGED',
              page: newPage,
              totalPages: totalPages
            });
          });

          pageFlipInstance.on('init', function() {
            loadingEl.style.display = 'none';
            bookEl.style.display = 'block';
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

      window.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = Date.now();
        }
      }, { passive: true });

      window.addEventListener('touchend', function(e) {
        if (e.changedTouches.length === 1) {
          var dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
          var dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
          var dt = Date.now() - touchStartTime;

          // Quick tap within center 40%
          if (pageFlipInstance && zoomScale === 1 && preferences.pageTurnEffect !== 'CURL_3D' && dx > 40 && dy < 40) {
            var dir = e.changedTouches[0].clientX < touchStartX ? 1 : -1;
            navigatePage(pageFlipInstance.getCurrentPageIndex() + 1 + dir * (preferences.dualPageMode ? 2 : 1), dir);
          }
          if (zoomScale === 1 && dx < 10 && dy < 10 && dt < 280) {
            var x = e.changedTouches[0].clientX;
            var w = window.innerWidth;
            if (x > w * 0.3 && x < w * 0.7) {
              postToRN({ type: 'TAP_CENTER' });
            }
          }
        }
      }, { passive: true });

      var drag = null;
      var pinchDistance = 0;
      var pinchStartScale = 1;
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
        if (zoomScale <= 1) return;
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
          e.preventDefault(); e.stopImmediatePropagation();
        } else if (zoomScale > 1) {
          e.stopImmediatePropagation();
        }
      }, { capture: true, passive: false });
      bookEl.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2 && pinchDistance > 0) {
          zoomScale = Math.max(1, Math.min(3, pinchStartScale * touchDistance(e.touches) / pinchDistance));
          applyZoom();
          notifyZoom(false);
          e.preventDefault(); e.stopImmediatePropagation();
        } else if (zoomScale > 1) {
          e.preventDefault(); e.stopImmediatePropagation();
        }
      }, { capture: true, passive: false });
      bookEl.addEventListener('touchend', function(e) {
        if (e.touches.length < 2 && pinchDistance > 0) {
          pinchDistance = 0;
          notifyZoom(true);
        }
      }, { capture: true, passive: true });
      function handleRNCommand(rawData) {
        try {
          var msg = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          if (msg.type === 'SET_ACCESS_TOKEN') { accessToken = typeof msg.token === 'string' ? msg.token : ''; return; }
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
              var target = Math.max(0, Math.min(msg.page - 1, totalPages - 1));
              navigatePage(target + 1, 0);
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
