# TÀI LIỆU ĐẶC TẢ HEADLESS REST API - MEKOBOOK MOBILE APP (2026)
## HỆ THỐNG ĐỌC SÁCH FLIPBOOK 3D TÍCH HỢP LIFERAY 7.4 GA132 CE

> [!TIP]
> Tải về tài liệu định dạng Microsoft Word (.docx) chuẩn: [`MEKOBOOK_API_DOCUMENTATION.docx`](file:///e:/Mekosoft/Project/MekoEcosystem/mekobook-ws/mekobook-workspace/docs/api/MEKOBOOK_API_DOCUMENTATION.docx)
> Hoặc tra cứu giao diện Web chuẩn Google Docs: [`api_viewer.html`](file:///e:/Mekosoft/Project/MekoEcosystem/mekobook-ws/mekobook-workspace/docs/api/api_viewer.html)

<div align="center">
  <h2 style="color: #dc2626; font-weight: 800;">CÁC API ĐỀU CẦN DÙNG CÙNG ACCESS TOKEN NHƯ TRƯỚC GIỜ</h2>
  <p>Toàn bộ API được bảo mật bằng chuẩn OAuth 2.0 Bearer Token (Client Credentials / Password).</p>
</div>

---

## 1. QUY HOẠCH KHO TÀI LIỆU SỐ LIFERAY DOCUMENTS & MEDIA (Site Guest ID: 20117)

```
Mekobook Library/ (Root Folder ID: 33050 - Site 20117)
├── covers/        (ID: 33052) -> Ảnh bìa sách chất lượng cao hiển thị Catalog & Store
├── originals/     (ID: 33054) -> Tệp tin PDF gốc lưu trữ an toàn
├── flipbooks/     (ID: 33056) -> Gói FlipBuilder tĩnh:
│   ├── {bookSlug}/files/mobile/{page}.jpg  -> Ảnh trang nét 1080p nạp Shader lật 3D 60fps
│   ├── {bookSlug}/files/thumb/{page}.jpg   -> Ảnh thumbnail nhỏ nạp thanh trượt Scrubber
│   └── {bookSlug}/files/config.xml         -> Tham số lật trang gốc
└── samples/       (ID: 33058) -> Bản đọc thử 15 trang miễn phí trước khi mua
```

---

## 2. BẢNG CHI TIẾT 15 REST APIS (CHUẨN 8 CỘT GOOGLE DOCS)

| # | Tên giao diện/ Chức năng | Method | Tên API | URL | Tham số (Parameter) | Phản hồi (JSON Thực Tế) | Diễn giải |
|:---:|---|:---:|---|---|---|---|---|
| **1.** | **Xác thực & Phiên làm việc** | `POST` | **Lấy OAuth 2.0 Access Token (Client Credentials / Password)** | `/o/oauth2/token` | **HEADER:**<br>Content-Type: application/x-www-form-urlencoded<br>**BODY (Form):**<br>grant_type: client_credentials<br>client_id: mekobook-mobile-client<br>client_secret: mekobook-mobile-secret<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/oauth2/token` | <pre><code>{
  "access_token": "9a38f4bc89e71234567890abcdef...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "everything.read everything.write"
}</code></pre> | **`access_token`**<br> - Kiểu: String (JWT)<br> - Mô tả: Mã Bearer gắn vào header Authorization: Bearer <token> cho mọi API sau.<br>**`token_type`**<br> - Giá trị: Bearer<br>**`expires_in`**<br> - Giá trị: 3600s (1 giờ)<br>**`client_id / secret`**<br> - Định danh ứng dụng di động |
| **2.** | **Hồ sơ độc giả** | `GET` | **Lấy thông tin tài khoản người dùng đang đăng nhập** | `/o/headless-admin-user/v1.0/my-user-account` | **HEADER:**<br>Authorization: Bearer <access_token><br>Accept: application/json<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/headless-admin-user/v1.0/my-user-account` | <pre><code>{
  "id": 20123,
  "emailAddress": "test@liferay.com",
  "name": "Test Test",
  "givenName": "Test",
  "familyName": "Test",
  "accountBriefs": []
}</code></pre> | **`id`**<br> - Kiểu: Long (ID: 20123)<br> - Bắt buộc: Có<br>**`emailAddress`**<br> - Email tài khoản sinh viên/độc giả<br>**`name`**<br> - Họ tên hiển thị trên app và nhúng Watermark chống chụp màn hình |
| **3.** | **Thư viện sách (Store)** | `GET` | **Lấy danh mục sách & tài liệu giáo trình số** | `/o/c/books` | **HEADER:**<br>Authorization: Bearer <access_token><br>**QUERY PARAMETERS:**<br>page: 1<br>pageSize: 20<br>sort: dateCreated:desc<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/books?page=1&pageSize=20` | <pre><code>{
  "actions": {},
  "facets": [],
  "items": [
    {
      "id": 33048,
      "title": "Giáo Trình Cấu Trúc Dữ Liệu & Giải Thuật (Flipbook 3D)",
      "author": "TS. Nguyễn Triết - CTUPress",
      "isbn": "978-604-919-890-1",
      "coverUrl": "https://serrated-catacomb-vendor.ngrok-free.dev/documents/20117/33052/covers/ctupress-csdl-cover.jpg",
      "flipbookBaseUrl": "https://serrated-catacomb-vendor.ngrok-free.dev/documents/20117/33056/flipbooks/giao-trinh-cau-truc-du-lieu-gt101/files/",
      "screenPattern": "mobile/{page}.jpg",
      "thumbPattern": "thumb/{page}.jpg",
      "totalPages": 286,
      "samplePagesLimit": 15,
      "isFree": false,
      "price": 85000.0,
      "rating": 4.9
    }
  ],
  "lastPage": 1,
  "page": 1,
  "pageSize": 20,
  "totalCount": 3
}</code></pre> | **`items[].id`**<br> - Kiểu: Long (bookId)<br>**`items[].coverUrl`**<br> - Ảnh bìa tài liệu hiển thị Store<br>**`items[].isFree`**<br> - true nếu đọc miễn phí, false nếu cần cấp phép<br>**`items[].samplePagesLimit`**<br> - Số trang đọc thử (15 trang) |
| **4.** | **Chi tiết sách & Core Reader** | `GET` | **Lấy chi tiết ấn phẩm số & Manifest gói FlipBuilder** | `/o/c/books/{bookId}` | **HEADER:**<br>Authorization: Bearer <access_token><br>**PARAMETER:**<br>bookId<br> - Kiểu: Long (ví dụ: 33048)<br> - Bắt buộc: Có<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/books/33048` | <pre><code>{
  "id": 33048,
  "title": "Giáo Trình Cấu Trúc Dữ Liệu & Giải Thuật (Flipbook 3D)",
  "author": "TS. Nguyễn Triết - CTUPress",
  "publisher": "Nhà Xuất Bản Đại Học Cần Thơ",
  "publicationYear": 2024,
  "totalPages": 286,
  "flipbookBaseUrl": "https://serrated-catacomb-vendor.ngrok-free.dev/documents/20117/33056/flipbooks/giao-trinh-cau-truc-du-lieu-gt101/files/",
  "screenPattern": "mobile/{page}.jpg",
  "thumbPattern": "thumb/{page}.jpg",
  "samplePagesLimit": 15,
  "description": "Tài liệu số hóa 3D Flipbook độc quyền từ CTUPress..."
}</code></pre> | **`bookId`**<br> - ID ấn phẩm số cần truy vấn<br>**`flipbookBaseUrl`**<br> - Thư mục gốc chứa gói FlipBuilder trên Liferay D&M<br>**`screenPattern`**<br> - Mẫu ảnh 1080p: mobile/{page}.jpg<br>**`thumbPattern`**<br> - Mẫu ảnh thu nhỏ: thumb/{page}.jpg<br>**`totalPages`**<br> - Tổng số trang phục vụ thuật toán Sliding Window Pre-caching |
| **5.** | **Mục lục sách (TOC)** | `GET` | **Lấy danh sách cây mục lục phân cấp theo sách** | `/o/c/chaptertocs` | **HEADER:**<br>Authorization: Bearer <access_token><br>**QUERY PARAMETERS:**<br>filter: bookId eq 33048<br>sort: displayOrder:asc<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/chaptertocs?filter=bookId%20eq%2033048&sort=displayOrder:asc` | <pre><code>{
  "items": [
    {
      "id": 33060,
      "bookId": 33048,
      "title": "Lời Nói Đầu",
      "startPage": 1,
      "level": 1,
      "displayOrder": 1
    },
    {
      "id": 33062,
      "bookId": 33048,
      "title": "Chương 1: Tổng Quan Về Giải Thuật",
      "startPage": 5,
      "level": 1,
      "displayOrder": 2
    },
    {
      "id": 33064,
      "bookId": 33048,
      "title": "1.1 Độ phức tạp thuật toán O(n)",
      "startPage": 12,
      "level": 2,
      "displayOrder": 3
    }
  ],
  "totalCount": 8
}</code></pre> | **`bookId`**<br> - ID sách dùng để lọc cây mục lục<br>**`items[].startPage`**<br> - Trang bắt đầu chương để nhảy trực tiếp<br>**`items[].level`**<br> - Cấp độ thụt lề (1: Phần, 2: Chương con)<br>**`items[].displayOrder`**<br> - Thứ tự hiển thị |
| **6.** | **Tủ sách cá nhân** | `GET` | **Lấy danh sách kệ sách cá nhân do độc giả tự tạo** | `/o/c/personalshelfs` | **HEADER:**<br>Authorization: Bearer <access_token><br>**QUERY PARAMETER:**<br>sort: displayOrder:asc<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/personalshelfs?sort=displayOrder:asc` | <pre><code>{
  "items": [
    {
      "id": 33080,
      "shelfName": "Môn Chuyên Ngành CNTT",
      "colorTag": "#3B82F6",
      "displayOrder": 1
    },
    {
      "id": 33082,
      "shelfName": "Sách Tham Khảo Học Kỳ 1",
      "colorTag": "#10B981",
      "displayOrder": 2
    }
  ],
  "totalCount": 3
}</code></pre> | **`items[].id`**<br> - Mã kệ sách shelfId<br>**`items[].shelfName`**<br> - Tên kệ sách do độc giả tự đặt<br>**`items[].colorTag`**<br> - Mã màu nhãn dán hiển thị trên app |
| **7.** | **Tủ sách cá nhân** | `POST` | **Tạo kệ sách cá nhân mới** | `/o/c/personalshelfs/` | **HEADER:**<br>Authorization: Bearer <access_token><br>Content-Type: application/json<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/personalshelfs/`<br>**BODY (JSON):**<br>`{   "shelfName": "Sách Nghiên Cứu AI",   "colorTag": "#EC4899",   "displayOrder": 4 }` | <pre><code>{
  "id": 33120,
  "shelfName": "Sách Nghiên Cứu AI",
  "colorTag": "#EC4899",
  "displayOrder": 4,
  "dateCreated": "2026-10-04T17:55:00Z"
}</code></pre> | **`shelfName`**<br> - Kiểu: String, Bắt buộc<br> - Tên kệ sách mới<br>**`colorTag`**<br> - Kiểu: String (HEX Color)<br>**`displayOrder`**<br> - Thứ tự hiển thị trên danh sách kệ |
| **8.** | **Tủ sách cá nhân** | `PATCH` | **Cập nhật tên hoặc màu nhãn kệ sách cá nhân** | `/o/c/personalshelfs/{shelfId}` | **HEADER:**<br>Authorization: Bearer <access_token><br>Content-Type: application/json<br>**PARAMETER:**<br>shelfId<br> - Kiểu: Long (ví dụ: 33080)<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/personalshelfs/33080`<br>**BODY (JSON):**<br>`{   "shelfName": "Kỹ Thuật Phần Mềm",   "colorTag": "#8B5CF6" }` | <pre><code>{
  "id": 33080,
  "shelfName": "Kỹ Thuật Phần Mềm",
  "colorTag": "#8B5CF6",
  "dateModified": "2026-10-04T17:56:12Z"
}</code></pre> | **`shelfId`**<br> - ID của kệ sách cần cập nhật<br>**`shelfName`**<br> - Tên mới của kệ sách<br>**`colorTag`**<br> - Mã màu nhãn dán mới |
| **9.** | **Tủ sách cá nhân** | `POST` | **Gán sách vào kệ sách cá nhân (N:N)** | `/o/c/shelfitems/` | **HEADER:**<br>Authorization: Bearer <access_token><br>Content-Type: application/json<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/shelfitems/`<br>**BODY (JSON):**<br>`{   "shelfId": 33080,   "bookId": 33048 }` | <pre><code>{
  "id": 33086,
  "shelfId": 33080,
  "bookId": 33048,
  "dateCreated": "2026-10-04T17:52:10Z"
}</code></pre> | **`shelfId`**<br> - Kiểu: Long, Bắt buộc. ID kệ sách<br>**`bookId`**<br> - Kiểu: Long, Bắt buộc. ID cuốn sách<br>**Lưu ý:**<br> - Ánh xạ N:N: 1 sách có thể thuộc nhiều kệ. Xóa kệ không làm mất sách trong tủ. |
| **10.** | **Core Reader - Tiện ích** | `GET` | **Lấy cấu hình môi trường đọc của độc giả** | `/o/c/userpreferences` | **HEADER:**<br>Authorization: Bearer <access_token><br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/userpreferences` | <pre><code>{
  "items": [
    {
      "id": 33092,
      "themeMode": "LIGHT",
      "brightness": 0.85,
      "pageTurnEffect": "CURL_3D",
      "pageTurnSoundEnabled": true,
      "dualPageMode": false
    }
  ],
  "totalCount": 1
}</code></pre> | **`themeMode`**<br> - LIGHT, DARK, SEPIA, SYSTEM<br>**`brightness`**<br> - Độ sáng màn hình đọc (0.1 - 1.0)<br>**`pageTurnEffect`**<br> - CURL_3D (lật uốn 60fps), SLIDE, FADE<br>**`pageTurnSoundEnabled`**<br> - true để phát âm thanh lật trang giấy |
| **11.** | **Core Reader - Tiến độ** | `GET` | **Lấy vị trí trang đang đọc dở (Last Read Position)** | `/o/c/readingprogresses` | **HEADER:**<br>Authorization: Bearer <access_token><br>**QUERY PARAMETER:**<br>filter: bookId eq 33048<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/readingprogresses?filter=bookId%20eq%2033048` | <pre><code>{
  "items": [
    {
      "id": 33096,
      "bookId": 33048,
      "currentPage": 42,
      "percentage": 14.68,
      "lastReadTimestamp": 1728064320000
    }
  ],
  "totalCount": 1
}</code></pre> | **`currentPage`**<br> - Trang sách độc giả đang đọc dở (trang 42)<br>**`percentage`**<br> - Tỷ lệ phần trăm hoàn thành (14.68%)<br>**`lastReadTimestamp`**<br> - Epoch ms thuật toán Last-Write-Wins phân xử xung đột đồng bộ giữa nhiều máy |
| **12.** | **Core Reader - Bookmark** | `GET` | **Lấy danh sách các trang đánh dấu ruy băng của sách** | `/o/c/bookmarks` | **HEADER:**<br>Authorization: Bearer <access_token><br>**QUERY PARAMETER:**<br>filter: bookId eq 33048<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/bookmarks?filter=bookId%20eq%2033048` | <pre><code>{
  "items": [
    {
      "id": 33100,
      "bookId": 33048,
      "pageNumber": 15,
      "chapterTitle": "1.2 Giải thuật tìm kiếm nhị phân",
      "colorTag": "#F59E0B"
    }
  ],
  "totalCount": 2
}</code></pre> | **`pageNumber`**<br> - Số thứ tự trang được đánh dấu ruy băng<br>**`chapterTitle`**<br> - Tên chương tại vị trí đánh dấu<br>**`colorTag`**<br> - Mã màu ruy băng (ví dụ: #F59E0B) |
| **13.** | **Core Reader - Annotation** | `GET` | **Lấy danh sách nét vẽ vector & ghi chú trên trang sách** | `/o/c/annotations` | **HEADER:**<br>Authorization: Bearer <access_token><br>**QUERY PARAMETER:**<br>filter: bookId eq 33048<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/annotations?filter=bookId%20eq%2033048` | <pre><code>{
  "items": [
    {
      "id": 33104,
      "bookId": 33048,
      "pageNumber": 15,
      "type": "HIGHLIGHT",
      "coordinateData": "[{\"x\":0.12,\"y\":0.45},{\"x\":0.88,\"y\":0.49}]",
      "color": "#FACC15",
      "noteText": "Ôn tập kỹ phần này thi kết thúc học phần!"
    }
  ],
  "totalCount": 2
}</code></pre> | **`type`**<br> - HIGHLIGHT (dạ quang), STICKY_NOTE, DRAWING_PEN<br>**`coordinateData`**<br> - Tọa độ vector chuẩn hóa (x, y từ 0.0 đến 1.0) độc lập độ phân giải máy khách<br>**`noteText`**<br> - Nội dung văn bản ghi chú |
| **14.** | **Tủ sách & Bản quyền DRM** | `GET` | **Kiểm tra giấy phép bản quyền & Quyền sở hữu (My Bookshelf)** | `/o/c/drmlicenses` | **HEADER:**<br>Authorization: Bearer <access_token><br>**QUERY PARAMETER:**<br>filter: bookId eq 33048<br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/drmlicenses?filter=bookId%20eq%2033048` | <pre><code>{
  "items": [
    {
      "id": 33108,
      "bookId": 33048,
      "licenseType": "PERPETUAL",
      "status": "ACTIVE",
      "encryptedContentKey": "k9Z2v8...AES256EncryptedKey...",
      "maxDevices": 3,
      "isFavorite": true
    }
  ],
  "totalCount": 2
}</code></pre> | **`status`**<br> - ACTIVE (còn hiệu lực), EXPIRED (hết hạn)<br>**`licenseType`**<br> - PERPETUAL (mua vĩnh viễn), RENTAL (thuê 120 ngày)<br>**`encryptedContentKey`**<br> - Khóa AES-256 mã hóa nội dung tải offline<br>**`maxDevices`**<br> - Giới hạn kích hoạt 2-3 thiết bị<br>**`isFavorite`**<br> - true nếu độc giả yêu thích |
| **15.** | **Bản quyền DRM & Thiết bị** | `GET` | **Lấy danh sách thiết bị độc giả đã kích hoạt đọc sách** | `/o/c/deviceregistrations` | **HEADER:**<br>Authorization: Bearer <access_token><br>**URL:**<br>`https://serrated-catacomb-vendor.ngrok-free.dev/o/c/deviceregistrations` | <pre><code>{
  "items": [
    {
      "id": 33112,
      "deviceUuid": "d82f7c01-9a14-4e2b-8b29-1029384756af",
      "deviceName": "iPhone 15 Pro Max",
      "platform": "iOS",
      "appVersion": "1.0.0",
      "isActive": true
    }
  ],
  "totalCount": 2
}</code></pre> | **`deviceUuid`**<br> - Mã UUID phần cứng duy nhất của thiết bị<br>**`deviceName`**<br> - Tên thiết bị của người dùng<br>**`platform`**<br> - iOS hoặc Android<br>**`isActive`**<br> - true nếu máy đang được cấp quyền đọc |

---

## 3. HƯỚNG DẪN CẤU HÌNH VÀ SỬ DỤNG OAUTH 2.0 TRÊN MOBILE APP

- **Token Endpoint:** `https://serrated-catacomb-vendor.ngrok-free.dev/o/oauth2/token`
- **Client ID:** `mekobook-mobile-client`
- **Client Secret:** `mekobook-mobile-secret`
- **Scope:** `everything.read everything.write`
