/**
 * Mekobook Mobile - HTML5/Canvas 3D Flipbook Engine
 * Features:
 * - Book Cover (book.coverUrl) as Page 1 (Front Cover)
 * - Inner pages from mobile/{page}.jpg
 * - Sliding Window Pre-caching (RAM < 40MB)
 * - Zero Watermark (clean demo)
 * - Real-time Debug telemetry bridge (Page, URL, Cached Window, Gestures)
 */

import { Book } from '../../types';
import { getPageImageUrl } from '../../services/api';
import { PAGE_FLIP_LIB_JS } from './pageFlipScript';

export interface FlipbookHtmlOptions {
  book: Book;
  initialPage?: number;
  slidingWindowSize?: number;
}

export function generateFlipbookHtml({
  book,
  initialPage = 1,
  slidingWindowSize = 4,
}: FlipbookHtmlOptions): string {
  const totalPages = book.totalPages || 35;
  const hasCover = Boolean(book.coverUrl);

  // Exact 1:1 page mapping matching physical book & TOC numbering
  // Page 1 is Front Cover, Page 2..totalPages-1 are Content, Page totalPages is Back Cover
  const pageUrls: Record<number, { url: string; label: string; isCover: boolean }> = {};
  for (let i = 1; i <= totalPages; i++) {
    const isFirst = i === 1;
    const isLast = i === totalPages;
    let url = '';
    if (isFirst && book.coverUrl) {
      url = book.coverUrl.includes('?') ? book.coverUrl : `${book.coverUrl}?v=20261005_v4`;
    } else {
      url = getPageImageUrl(book, i);
    }

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
            <img class="page-img" data-src="${pageInfo.url}" alt="${escapeHtml(pageInfo.label)}" />
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
      var pageFlipInstance = null;
      var hasCover = ${hasCover};

      var pageUrlsMap = ${JSON.stringify(pageUrls)};

      function postToRN(data) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
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
            if (img.src !== targetSrc) {
              img.src = targetSrc;
            }
            loadedPages.push(p);
          } else {
            if (img.src && img.src !== '') {
              img.removeAttribute('src');
            }
          }
        });
      }

      function initFlipbook() {
        var containerWidth = window.innerWidth;
        var containerHeight = window.innerHeight;

        var isWide = containerWidth >= 768;
        var usePortrait = !isWide;

        var pageTargetWidth = usePortrait ? Math.floor(containerWidth * 0.94) : Math.floor((containerWidth * 0.95) / 2);
        var pageTargetHeight = Math.floor(containerHeight * 0.88);

        updateSlidingWindow(initialPage);

        try {
          pageFlipInstance = new St.PageFlip(bookEl, {
            width: pageTargetWidth,
            height: pageTargetHeight,
            size: 'stretch',
            minWidth: 260,
            maxWidth: 1200,
            minHeight: 360,
            maxHeight: 1800,
            drawShadow: true,
            flippingTime: 550,
            usePortrait: usePortrait,
            startPage: initialPage - 1,
            showCover: false,
            mobileScrollSupport: false,
            swipeDistance: 15,
            showPageCorners: true,
            useMouseEvents: true,
            clickEventForward: true,
          });

          pageFlipInstance.loadFromHTML(document.querySelectorAll('.page'));

          pageFlipInstance.on('flip', function(e) {
            var newPage = e.data + 1;
            updateSlidingWindow(newPage);
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

        } catch (err) {
          loadingEl.innerHTML = '<div style="color:#F87171;text-align:center;padding:20px;">Lỗi: ' + err.message + '</div>';
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
          if (dx < 10 && dy < 10 && dt < 280) {
            var x = e.changedTouches[0].clientX;
            var w = window.innerWidth;
            if (x > w * 0.3 && x < w * 0.7) {
              postToRN({ type: 'TAP_CENTER' });
            }
          }
        }
      }, { passive: true });

      function handleRNCommand(rawData) {
        try {
          var msg = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          if (!pageFlipInstance) return;

          switch(msg.type) {
            case 'TURN_NEXT':
              pageFlipInstance.flipNext();
              break;
            case 'TURN_PREV':
              pageFlipInstance.flipPrev();
              break;
            case 'GO_TO_PAGE':
              var target = Math.max(0, Math.min(msg.page - 1, totalPages - 1));
              updateSlidingWindow(msg.page);
              pageFlipInstance.flip(target);
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
