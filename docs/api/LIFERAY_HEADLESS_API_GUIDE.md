# Hướng dẫn Tích hợp Liferay 7.4 GA132 Headless APIs (Mekobook)

Tài liệu này cung cấp danh sách đầy đủ các REST API và cấu hình cần thiết trên **Liferay Portal 7.4 GA132 CE** để phục vụ ứng dụng **Mekobook Mobile**.

---

## 1. Xác thực (Authentication)

Liferay 7.4 hỗ trợ các phương thức xác thực chuẩn REST:

### 1.1. Basic Authentication (Môi trường Dev / Test)
- **Header:** `Authorization: Basic <base64(email:password)>`
- Ví dụ: `test@liferay.com:test` -> `Authorization: Basic dGVzdEBsaWZlcmF5LmNvbTp0ZXN0`

### 1.2. OAuth 2.0 (Khuyến nghị cho Mobile Production)
- Cấu hình tại: **Control Panel > Security > OAuth 2 Administration**.
- Grant Type: **Authorization Code with PKCE** hoặc **Resource Owner Password Credentials**.
- Token Endpoint: `POST /o/oauth2/token`
  - Body (form-urlencoded):
    ```
    grant_type=password
    &client_id=<YOUR_CLIENT_ID>
    &client_secret=<YOUR_CLIENT_SECRET>
    &username=<USER_EMAIL>
    &password=<USER_PASSWORD>
    ```

---

## 2. API Quản lý Kho sách (Documents & Media Headless Delivery)

Toàn bộ API Documents & Media nằm trong OpenAPI module `/o/headless-delivery/v1.0/`.

### 2.1. Lấy danh sách Thư mục sách (Document Folders)
- **Endpoint:** `GET /o/headless-delivery/v1.0/sites/{siteId}/document-folders`
- **Mục đích:** Liệt kê các danh mục thể loại sách (ví dụ: Sách Khoa học, Văn học, Tài liệu Kỹ thuật, v.v.).
- **Query Params:**
  - `page`: Trang hiện tại (mặc định 1)
  - `pageSize`: Số mục mỗi trang (ví dụ: 20)
  - `sort`: Tiêu chí sắp xếp (`title:asc` hoặc `dateCreated:desc`)

### 2.2. Lấy danh sách Sách trong một Thư mục
- **Endpoint:** `GET /o/headless-delivery/v1.0/document-folders/{documentFolderId}/documents`
- **Query Params:**
  - `fields`: Chỉ định các trường cần lấy (ví dụ: `id,title,description,fileExtension,sizeInBytes,contentUrl,documentType`)
  - `page`: Trang hiện tại
  - `pageSize`: Số lượng sách mỗi trang
- **Mẫu dữ liệu trả về:**
  ```json
  {
    "items": [
      {
        "id": 41203,
        "title": "Clean Architecture.pdf",
        "description": "Sách kiến trúc phần mềm",
        "fileExtension": "pdf",
        "sizeInBytes": 14205812,
        "contentUrl": "/documents/d/guest/clean-architecture-pdf",
        "numberOfComments": 0
      }
    ],
    "page": 1,
    "pageSize": 20,
    "totalCount": 1
  }
  ```

### 2.3. Lấy thông tin chi tiết một cuốn sách
- **Endpoint:** `GET /o/headless-delivery/v1.0/documents/{documentId}`
- **Trả về:** Metadata chi tiết, Custom Fields, link xem trước (contentUrl).

### 2.4. Lấy danh sách Renditions (Ảnh xem trước từng trang / Cover)
- **Endpoint:** `GET /o/headless-delivery/v1.0/documents/{documentId}/document-renditions`
- **Mục đích:** Trích xuất các bản render ảnh độ phân giải khác nhau (Thumbnail, Web Preview, Page Renditions) do Liferay Ghostscript/PDFBox tự động tạo để nạp vào Flipbook Viewer.
- **Mẫu dữ liệu trả về:**
  ```json
  {
    "items": [
      {
        "id": "Thumbnail",
        "mimeType": "image/png",
        "name": "Thumbnail",
        "url": "/documents/d/guest/clean-architecture-pdf?rendition=Thumbnail"
      },
      {
        "id": "Preview-PDF",
        "mimeType": "image/png",
        "name": "Preview-PDF",
        "url": "/documents/d/guest/clean-architecture-pdf?rendition=Preview-PDF"
      }
    ]
  }
  ```

---

## 3. API Quản lý Tiến trình Đọc & Bookmark (Liferay Objects)

Thay vì viết mã Java phức tạp, Mekobook sử dụng **Liferay Objects** (tính năng Native No-code/Low-code trên Liferay 7.4) để tự động sinh REST API.

### 3.1. Đối tượng `MekoReadingProgress`
- **Cấu hình Object Fields:**
  - `userId` (Long/Text): ID người dùng Liferay
  - `documentId` (Long): ID tài liệu trong D&M
  - `currentPage` (Integer): Trang đang đọc dở
  - `totalPages` (Integer): Tổng số trang
  - `percentage` (Double): Phần trăm hoàn thành (0.0 - 100.0)
  - `lastReadDate` (Date/Time): Thời gian đọc gần nhất
- **Endpoints tự động sinh:**
  - `GET /o/c/mekoreadingprogresses/?filter=documentId eq '{docId}' and userId eq '{userId}'`
  - `POST /o/c/mekoreadingprogresses/` (Tạo mới tiến độ đọc)
  - `PUT /o/c/mekoreadingprogresses/{progressId}` (Cập nhật tiến độ đọc)

### 3.2. Đối tượng `MekoBookmark`
- **Cấu hình Object Fields:**
  - `userId` (Long/Text)
  - `documentId` (Long)
  - `pageNumber` (Integer): Số trang đánh dấu
  - `note` (String): Ghi chú cá nhân
  - `colorTag` (String): Mã màu highlight (e.g., `#FFEB3B`)
- **Endpoints tự động sinh:**
  - `GET /o/c/mekobookmarks/?filter=documentId eq '{docId}' and userId eq '{userId}'`
  - `POST /o/c/mekobookmarks/` (Tạo bookmark)
  - `DELETE /o/c/mekobookmarks/{bookmarkId}` (Xóa bookmark)

---

## 4. Cấu hình Portal cần thiết (`portal-ext.properties`)

Để đảm bảo Liferay 7.4 render tốt PDF Preview cho Flipbook:
```properties
# Bật chuyển đổi tài liệu tự động (Document Conversion)
openoffice.server.enabled=false
imagemagick.enabled=true
ghostscript.enabled=true

# Tăng giới hạn tải file tài liệu sách điện tử
dl.file.max.size=314572800

# CORS Configuration cho kết nối từ Mobile App trong môi trường Dev
http.header.secure.x.frame.options=false
```
