# MEKOBOOK MOBILE - 3D FLIPBOOK VIEWER

Ứng dụng di động đọc sách 3D Flipbook tích hợp **Liferay Portal 7.4 GA132 CE** làm Headless CMS / Backend.

> Luồng 1.1–2.4 đã được tổ chức lại trong `src/screens`, `src/navigation`, `src/component`, `src/hooks`, `src/constants`, `src/services`, `src/types`, `src/utils`. Xem [phạm vi và kiểm thử](docs/IMPLEMENTATION_1_1_TO_2_4.md). Không còn fallback sách mẫu khi API lỗi. OAuth secret đã cấu hình cục bộ cho bản dev sau khi người dùng chấp nhận rủi ro lộ trong bundle. Không commit `.env` hoặc phát hành bundle này như bản production.

---

## 1. Hướng Dẫn Khởi Chạy Nhanh Cho Developer (Quick Start)

Để test bằng URL trên Chrome/Edge: `npx expo start --web --lan`, mở http://localhost:8081 trên máy tính hoặc địa chỉ HTTP LAN Expo hiển thị trên điện thoại cùng Wi-Fi. Trình đọc web dùng iframe StPageFlip; native vẫn dùng WebView. Phiên web dùng sessionStorage trong tab, không phải SecureStore; bản này chỉ phục vụ dev nội bộ, không deploy công khai với confidential OAuth secret.

### Yêu cầu tiên quyết:
- Node.js >= 18 và npm >= 9
- Ứng dụng **Expo Go** cài trên điện thoại (tải từ App Store hoặc Google Play)
- Điện thoại và máy tính chạy Dev kết nối chung một mạng Wi-Fi

### 3 bước khởi chạy ứng dụng:
```bash
# Bước 1: Cài đặt các gói phụ thuộc
npm install

# Bước 2: Tạo file cấu hình môi trường cục bộ
cp .env.example .env

# Bước 3: Khởi động Metro Bundler với tùy chọn xóa cache
npx expo start -c
```
Terminal sẽ hiển thị mã QR:
- Trên iPhone: Mở ứng dụng **Camera**, quét mã QR để mở app trong Expo Go.
- Trên Android: Mở ứng dụng **Expo Go**, chọn **Scan QR code**.

---

## 2. Hướng Dẫn Cấu Hình Môi Trường Dev (Developer Configuration Guide)

File cấu hình `.env` đóng vai trò định tuyến toàn bộ kết nối mạng giữa ứng dụng di động và máy chủ Liferay.

### 2.1. Chi tiết các biến môi trường trong `.env`

| Tên biến | Mô tả | Giá trị mẫu / Mặc định |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Địa chỉ gốc của máy chủ Liferay Headless API | `https://<domain>.ngrok-free.dev` |
| `EXPO_PUBLIC_STATIC_FLIPBOOK_BASE_URL` | Thư mục chứa gói ảnh trang lật 3D tĩnh | `https://<domain>.ngrok-free.dev/flipbooks/` |
| `EXPO_PUBLIC_OAUTH_TOKEN_PATH` | Đường dẫn lấy Access Token OAuth 2.0 | `/o/oauth2/token` |
| `EXPO_PUBLIC_OAUTH_CLIENT_ID` | Client ID ứng dụng di động đăng ký trên Liferay | Nhận từ quản trị viên Liferay |
| OAuth client secret | Không lưu confidential secret vào `EXPO_PUBLIC_`; cần thống nhất public client/proxy với backend | Chưa cấu hình trong `.env` |
| `EXPO_PUBLIC_LIFERAY_SITE_ID` | Site ID phân vùng dữ liệu Liferay | `20117` |
| `CACHE_SLIDING_WINDOW_SIZE` | Số lượng trang nạp trước vào bộ nhớ đệm (Sliding Window) | `4` (tối ưu RAM dưới 40MB) |

---

### 2.2. Quy tắc kết nối mạng di động (RẤT QUAN TRỌNG)

1. **Tuyệt đối không dùng `localhost` hoặc `127.0.0.1` trong `.env`:**
   - Ứng dụng chạy trên thiết bị di động thật (điện thoại iOS/Android).
   - Nếu để `localhost`, điện thoại sẽ tự gửi request vào chính nó và bị lỗi kết nối mạng (`Network request failed`).
   - Phải sử dụng **địa chỉ IP nội bộ của máy chủ trong mạng LAN** (ví dụ: `http://192.168.1.xxx:8080`).

2. **Cách xác định IP máy tính chạy server:**
   - **Windows:** Mở Command Prompt hoặc PowerShell, gõ `ipconfig`, tìm dòng `IPv4 Address` thuộc card mạng Wi-Fi (ví dụ: `192.168.1.254`).
   - **macOS / Linux:** Mở Terminal, gõ `ifconfig | grep inet` hoặc `ip a`.

3. **Cấu hình khi làm việc từ xa (Khác mạng Wi-Fi):**
   - Nếu điện thoại và máy tính không cùng mạng nội bộ, sử dụng đường hầm **ngrok Tunnel**:
     ```env
     API_BASE_URL=https://<your-subdomain>.ngrok-free.dev
     STATIC_FLIPBOOK_BASE_URL=https://<your-subdomain>.ngrok-free.dev/flipbooks/
     ```

---

## 3. Bảng Tóm Tắt Cơ Chế Hoạt Động Của Flipbook

| Hạng mục | Cơ chế hiện tại trong mã nguồn |
|---|---|
| **Kiến trúc** | React Native (Expo) bọc một WebView chạy thư viện StPageFlip (nhúng sẵn 100% offline trong app, không tải từ mạng). Hiệu ứng lật 3D chạy hoàn toàn trong WebView với tốc độ 60 FPS |
| **Dữ liệu truyền về client** | Metadata sách là JSON, lấy từ Liferay `/o/c/books`. Nội dung sách là ảnh JPG từng trang (`mobile/{page}.jpg`, ~40KB/trang) lấy từ static server, không phải file zip hay PDF. Trang 1 là ảnh bìa (`coverUrl`), nội dung bắt đầu từ trang 2 |
| **Cơ chế tải ảnh (Sliding Window)** | Mở sách chỉ tải các trang trong cửa sổ `[K-2 .. K+windowSize]`, không tải cả cuốn. Khi lật, cửa sổ dịch theo: trang mới được gán `src` để tải, trang xa bị gỡ `src` để giải phóng RAM. Ảnh đã tải nằm trong disk cache của WebView, nên lật lại không tải lại từ server |
| **Giao tiếp React Native và WebView** | WebView gửi lên: `ENGINE_READY`, `PAGE_CHANGED`, `TAP_CENTER`. React Native gửi xuống bằng `injectJavaScript`: `TURN_NEXT`, `TURN_PREV`, `GO_TO_PAGE` |
| **Tiến độ đọc** | Đọc tiến trình từ `GET /o/c/readingprogresses` để đọc tiếp. Không gửi POST lưu tiến trình khi chưa có hợp đồng API ghi được xác nhận |
| **Giao diện** | Nền sáng (Light Mode), màu xanh lá chủ đạo `#059669`. Mỗi trang có khung viền xanh `2.5px` để tách biệt với nền. Không sử dụng emoji (dùng vector icons Ionicons), không watermark, không debug overlay |
| **Xác thực** | Sử dụng OAuth 2.0 Password Grant theo API công ty; access token và refresh token được lưu bằng Expo SecureStore, tự làm mới khi gần hết hạn |

---

## 4. Sơ đồ base trước khi chuyển sang đặc tả API mới

Sơ đồ dưới đây mô tả base cũ, không phải hành vi bản hiện tại. Luồng hiện tại là thư viện → chi tiết → kiểm tra DRM/tiến trình/cấu hình → chờ ảnh trang → trình đọc. Phần POST lưu tiến trình trong sơ đồ đã được bỏ cho đến khi có hợp đồng API ghi. Xem tài liệu triển khai ở đầu README.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant RN as React Native (App, FlipbookControls)
    participant Viewer as FlipbookViewer (WebView wrapper)
    participant Engine as Flipbook Engine (WebView, StPageFlip)
    participant Cache as Cache ảnh (Disk/RAM)
    participant Static as Liferay Static Server
    participant API as Liferay REST API

    Note over User, API: 1. MỞ SÁCH
    User->>RN: Bấm chọn một cuốn sách
    RN->>RN: setSelectedBook, totalPages = totalPages + 1 nếu có coverUrl
    RN->>Viewer: Render FlipbookViewer(book, initialPage = 1)
    Viewer->>Viewer: Dựng HTML và URL từng trang (trang 1 = coverUrl, còn lại = mobile/{page}.jpg)
    Viewer->>Engine: Nạp HTML, StPageFlip nhúng sẵn (không tải từ mạng)
    Engine->>Engine: Dựng N thẻ .page, img chỉ có data-src, chưa có src
    Engine->>Cache: updateSlidingWindow(1), gán src các trang trong [K-2 .. K+windowSize]

    rect rgb(254, 226, 226)
        loop Mỗi trang trong cửa sổ
            Cache->>Static: [TẢI] GET ảnh trang (bìa hoặc mobile/{page}.jpg)
            Static-->>Cache: [TẢI] Ảnh JPG (~40KB), lưu vào cache
        end
    end

    Engine->>Engine: new St.PageFlip(...), loadFromHTML(.page)
    Engine->>Viewer: postMessage ENGINE_READY(totalPages)
    Viewer->>RN: onReady(totalPages)
    Note right of Engine: Các trang ngoài cửa sổ chưa được tải

    Note over User, API: 2. LẬT TRANG (KÉO GÓC / VUỐT)
    User->>Engine: Kéo góc hoặc vuốt trang
    Engine->>Engine: Vẽ hiệu ứng cuộn trang 3D (550ms)
    Engine->>Engine: Sự kiện flip, newPage = e.data + 1
    Engine->>Cache: updateSlidingWindow(newPage)

    rect rgb(254, 226, 226)
        alt Trang mới lọt vào cửa sổ và chưa có trong cache
            Cache->>Static: [TẢI] GET ảnh trang mới
            Static-->>Cache: [TẢI] Ảnh JPG, lưu vào cache
        else Ảnh đã có trong cache
            Cache-->>Engine: Dùng ảnh sẵn có (không tải mạng)
        end
    end

    Engine->>Engine: Trang rời cửa sổ bị gỡ src, giải phóng RAM
    Engine->>Viewer: postMessage PAGE_CHANGED(page, totalPages)
    Viewer->>RN: onPageChange(page, totalPages)
    RN->>RN: setCurrentPage(page), cập nhật bộ đếm và thanh trượt

    Note over User, API: 3. LẬT BẰNG NÚT HOẶC THANH TRƯỢT
    User->>RN: Bấm nút Trước/Sau hoặc kéo scrubber
    RN->>Viewer: flipNext() / flipPrev() / goToPage(n)
    Viewer->>Engine: injectJavaScript, TURN_NEXT / TURN_PREV / GO_TO_PAGE
    Engine->>Cache: GO_TO_PAGE gọi updateSlidingWindow(page) trước khi lật
    Engine->>Engine: pageFlip.flipNext() / flipPrev() / flip(page - 1)
    Engine->>Viewer: postMessage PAGE_CHANGED (như bước lật ở trên)
    Note right of Cache: Nếu nhảy tới trang xa, cửa sổ mới sẽ tải ảnh như phần 2

    Note over User, API: 4. ẨN HIỆN THANH ĐIỀU KHIỂN
    User->>Engine: Chạm nhanh vùng giữa 40% màn hình
    Engine->>Viewer: postMessage TAP_CENTER
    Viewer->>RN: onToggleControls()
    RN->>RN: Đổi controlsVisible, ẩn hoặc hiện overlay

    Note over User, API: 5. LƯU TIẾN ĐỘ ĐỌC (DEBOUNCE 1.5 GIÂY)
    RN->>RN: handlePageChange, clearTimeout timer cũ, setTimeout 1500ms

    alt Lật tiếp trước khi đủ 1.5 giây
        RN->>RN: Hủy timer cũ, tạo timer mới (KHÔNG gọi API)
    else Dừng ở một trang đủ 1.5 giây
        rect rgb(254, 226, 226)
            RN->>API: [TẢI] POST /o/c/readingprogresses (bookId, currentPage, totalPages, percentage, readStatus)
            API-->>RN: [TẢI] Phản hồi (app không kiểm tra kết quả)
        end
    end

    Note over User, API: 6. ĐÓNG SÁCH
    User->>RN: Bấm nút Quay lại
    RN->>RN: setSelectedBook(null), hủy WebView, quay về danh sách
```
