# Kiến trúc Hệ thống Mekobook (Architecture Specification)

Tài liệu này mô tả chi tiết kiến trúc kỹ thuật của hệ thống **Mekobook** — Giải pháp đọc sách điện tử / tài liệu dạng Flipbook 3D tương tác trên thiết bị di động, sử dụng backend **Liferay Portal 7.4 GA132 CE**.

---

## 1. Mục tiêu kiến trúc (Architectural Goals)

1. **Hiệu năng cao (60 FPS):** Lật trang 3D mượt mà, phản hồi cử chỉ vuốt/kéo tức thì, không giật lag ngay cả với sách có dung lượng lớn (>100MB).
2. **Tiết kiệm tài nguyên:** Sử dụng cơ chế Lazy Loading, Tile Rendering và Pre-rendered Rendition từ Liferay, không bao giờ load toàn bộ tài liệu vào RAM cùng một lúc.
3. **Hoạt động Offline linh hoạt:** Lưu trữ sách offline với thuật toán mã hóa tiêu chuẩn bảo mật cao (AES-256), tự động đồng bộ tiến độ đọc khi có mạng trở lại.
4. **Bảo vệ bản quyền (DRM):** Ngăn chặn chụp màn hình, quay video màn hình, nhúng watermark định danh người dùng động, kiểm soát quyền truy cập tài liệu qua Liferay Permissions.
5. **Kiến trúc Headless linh hoạt:** Tận dụng 100% sức mạnh của Liferay 7.4 Headless Delivery REST APIs và Liferay Objects để quản lý dữ liệu mà không cần can thiệp sâu vào nhân portal.

---

## 2. Sơ đồ luồng dữ liệu tổng thể (End-to-End Data Flow)

```
                    +------------------------------------+
                    |  Liferay Documents & Media Library |
                    |  (Upload PDF, generate renditions) |
                    +-----------------+------------------+
                                      |
                                      | Trích xuất Renditions & Metadata
                                      v
                    +------------------------------------+
                    | Liferay Headless Delivery REST API |
                    | (/o/headless-delivery/v1.0/...)    |
                    +-----------------+------------------+
                                      |
                         REST / JSON  |  OAuth2 / Basic Auth
                                      v
+-------------------------------------------------------------------------------+
|                            MEKOBOOK MOBILE CLIENT                             |
|                                                                               |
|  +-----------------------------+             +-----------------------------+  |
|  |       Catalog Service       |             |   Offline Download Manager  |  |
|  | - Fetch categories/folders  |             | - Queue download tasks      |  |
|  | - Pre-fetch cover images    |             | - Stream chunks -> AES-256  |  |
|  +--------------+--------------+             +--------------+--------------+  |
|                 |                                           |                 |
|                 +-------------------+   +-------------------+                 |
|                                     |   |                                     |
|                                     v   v                                     |
|                        +----------------------------+                         |
|                        |   Flipbook Page Provider   |                         |
|                        | (Online Stream / Decrypt)  |                         |
|                        +--------------+-------------+                         |
|                                       |                                       |
|                                       v                                       |
|                        +----------------------------+                         |
|                        |   Core 3D Flipbook Engine  |                         |
|                        | - 3D Page Curl Shader      |                         |
|                        | - Gesture Recognizer       |                         |
|                        | - Watermark & ScreenShield |                         |
|                        +--------------+-------------+                         |
|                                       |                                       |
|                                       v                                       |
|                        +----------------------------+                         |
|                        | Progress & Bookmark Sync   |                         |
|                        | (Liferay Custom Objects)   |                         |
|                        +----------------------------+                         |
+-------------------------------------------------------------------------------+
```

---

## 3. Các thành phần chính của hệ thống

### 3.1. Backend: Liferay 7.4 GA132 CE
- **Documents & Media (D&M):**
  - Quản lý cấu trúc thư mục (Category/Folder), tệp PDF và các tài liệu liên quan.
  - Tự động sinh `document-renditions` (ảnh thumbnail, ảnh chất lượng cao từng trang) để tối ưu việc truyền tải xuống thiết bị di động.
- **Liferay Headless Delivery APIs:**
  - Cung cấp toàn bộ REST endpoints phục vụ: Liệt kê danh mục, tìm kiếm tài liệu, lấy metadata, lấy link tải trực tiếp hoặc link rendition.
- **Liferay Objects:**
  - Định nghĩa các đối tượng dữ liệu tùy biến mà không cần viết Java code phức tạp:
    - `MekoReadingProgress`: Lưu vị trí đọc gần nhất của từng user (`userId`, `documentId`, `currentPage`, `lastReadDate`, `completionRate`).
    - `MekoBookmark`: Lưu các điểm đánh dấu trang (`userId`, `documentId`, `pageNumber`, `note`, `colorTag`).

### 3.2. Frontend: React Native Flipbook Client
1. **Core Flipbook Engine:**
   - Xử lý cử chỉ chạm, kéo mép trang, vuốt (swipe) để tạo góc uốn trang 3D chân thực.
   - Hỗ trợ chế độ xem đơn (Single Page - Portrait) và trang đôi (Double Page - Landscape trên Tablet/màn hình rộng).
   - Pinch to Zoom để phóng to chi tiết trang và cuộn xem mượt mà.
2. **Offline Manager & Cryptography:**
   - Tải nền các tệp tài liệu / trang sách.
   - Tệp sau khi tải về được mã hóa từng khối bằng thuật toán **AES-256-GCM**.
   - Khóa giải mã được tạo ngẫu nhiên cho mỗi tài liệu và lưu trữ an toàn trong Secure Enclave / Android Keystore thông qua `react-native-keychain`.
3. **Bảo mật DRM & Chống sao chép:**
   - **Flag Secure:** Áp dụng `WindowManager.LayoutParams.FLAG_SECURE` trên Android và ẩn nội dung khi chụp/quay màn hình trên iOS.
   - **Dynamic Watermark:** Render lớp phủ thông tin gồm Tên tài khoản, Email, Thời gian truy cập chéo mờ mờ trên bề mặt sách để chống rò rỉ khi người dùng chụp từ camera ngoài.
4. **Đồng bộ hóa 2 chiều (Bidirectional Sync):**
   - Lưu tiến độ đọc và bookmark tạm thời vào bộ nhớ cục bộ tốc độ cao (`MMKV` / `SQLite`).
   - Tự động đẩy dữ liệu lên Liferay Objects khi có kết nối Internet; xử lý xung đột thời gian (Last-Write-Wins dựa trên timestamp).
