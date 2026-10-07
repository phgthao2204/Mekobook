/**
 * Mekobook Mobile - FlipbookViewer Component
 * React Native 3D Flipbook Viewer using Hardware-Accelerated WebView
 * Focuses purely on 60 FPS 3D page curl, gestures, and sliding-window caching
 */

import React, { useRef, useImperativeHandle, forwardRef, useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Book, UserPreference, FlipbookToReactNativeMessage, ReactNativeToFlipbookMessage } from '../../types';
import { generateFlipbookHtml } from './flipbookEngineHtml';
import { ENV } from '../../constants/env';

export interface FlipbookViewerProps {
  book: Book;
  accessToken?: string;
  initialPage?: number;
  onPageChange?: (page: number, totalPages: number) => void;
  onToggleControls?: () => void;
  onReady?: (totalPages: number) => void;
  onError?: (message: string) => void;
  preferences: UserPreference;
}

export interface FlipbookViewerRef {
  flipNext: () => void;
  flipPrev: () => void;
  goToPage: (page: number) => void;
  zoom: (scale: number) => void;
}

export const FlipbookViewer = forwardRef<FlipbookViewerRef, FlipbookViewerProps>(
  (
    {
      book,
      accessToken,
      initialPage = 1,
      onPageChange,
      onToggleControls,
      onReady,
      onError,
      preferences,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);
    const currentToken = useRef(accessToken);
    currentToken.current = accessToken;

    const postMessageToEngine = (message: ReactNativeToFlipbookMessage) => {
      if (!webViewRef.current) return;
      const script = `
        (function() {
          var evt = new MessageEvent('message', { data: ${JSON.stringify(message)} });
          window.dispatchEvent(evt);
        })();
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    };

    useImperativeHandle(ref, () => ({
      zoom: (scale) => postMessageToEngine({ type: 'ZOOM', scale }),
      flipNext: () => {
        postMessageToEngine({ type: 'TURN_NEXT' });
      },
      flipPrev: () => {
        postMessageToEngine({ type: 'TURN_PREV' });
      },
      goToPage: (page: number) => {
        postMessageToEngine({ type: 'GO_TO_PAGE', page });
      },
    }));

    const htmlSource = useMemo(() => {
      return generateFlipbookHtml({
        book,
        accessToken: currentToken.current,
        initialPage,
        slidingWindowSize: ENV.FLIPBOOK.CACHE_SLIDING_WINDOW_SIZE,
        preferences,
      });
    }, [book, initialPage, preferences]);
    const source = useMemo(() => ({ html: htmlSource, baseUrl: ENV.API_BASE_URL }), [htmlSource]);
    useEffect(() => { postMessageToEngine({ type: 'SET_ACCESS_TOKEN', token: accessToken }); }, [accessToken]);

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data: FlipbookToReactNativeMessage = JSON.parse(event.nativeEvent.data);
        switch (data.type) {
          case 'PAGE_CHANGED':
            if (onPageChange) {
              onPageChange(data.page, data.totalPages);
            }
            break;
          case 'TAP_CENTER':
            if (onToggleControls) {
              onToggleControls();
            }
            break;
          case 'ENGINE_READY':
            postMessageToEngine({ type: 'SET_ACCESS_TOKEN', token: currentToken.current });
            if (onReady) {
              onReady(data.totalPages);
            }
            break;
          case 'ERROR':
            onError?.(data.message);
            break;
        }
      } catch (err) {
        console.warn('[FlipbookViewer] Failed to parse message from WebView:', err);
      }
    };

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={source}
          style={styles.webView}
          onMessage={handleMessage}
          onError={() => onError?.('Không thể khởi tạo trình đọc. Vui lòng thử lại.')}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          mixedContentMode="always"
        />
      </View>
    );
  }
);

FlipbookViewer.displayName = 'FlipbookViewer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
});
