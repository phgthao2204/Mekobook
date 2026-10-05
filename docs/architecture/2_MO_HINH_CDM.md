# MO HINH DU LIEU DOI TUONG (CDM) PHAN KY CHI TIET
## HE THONG SACH & GIAO TRINH SO 3D MEKOBOOK (TINH GON 10 MODELS)

Tai lieu nay dinh nghia kien truc Mo hinh Du lieu Doi tuong (Conceptual Data Model - CDM) cho he thong Mekobook.
He thong da duoc tinh gian tu 13 Models ban dau xuong con **10 Models cot loi**, dua tren nghien cuu thuc te tu quy trinh xuat ban tai lieu so cua CTUPress (su dung FlipBuilder / Flip PDF Professional) va cac tinh nang san co cua Liferay Portal 7.4 GA132 CE.

---

## 1. PHAN TICH TINH GIAN HE THONG (TU 13 XUONG 10 MODELS)

Qua viec khao sat tai lieu quy trinh CTUPress (`CTUPRESS.VN-PDF-FLIPBOOK.docx`), he thong da thuc hien 3 quyet dinh kien truc quan trong:

1. **Loai bo Model `PageRendition` (Tiet kiem hang tram ngan ban ghi DB):**
   - Bien tap vien xuat file tu FlipBuilder tao ra goi thu muc tinh `.zip` bao gom: `files/mobile/1.jpg`, `2.jpg`... va `files/thumb/1.jpg`, `2.jpg`...
   - Duong dan trang duoc quy uoc co dinh theo mau so thu tu `{page}.jpg`. Do do, khong can luu tung ban ghi trang vao co so du lieu.
   - Thay vao do, Model `Book` chi can chua: `flipbookBaseUrl`, `screenPattern` (mac dinh `mobile/{page}.jpg`), va `thumbPattern` (mac dinh `thumb/{page}.jpg`).
   - Mobile Client chi can goi 1 API duy nhat de lay thong tin sach va so trang, sau do tu dong nạp anh theo cua so truot (Sliding Window Pre-caching).

2. **Loai bo Model `Category` (Store Danh muc chung):**
   - Liferay Portal 7.4 CE da tich hop san tinh nang **Asset Categories & Vocabularies** rat manh me o cap do nen tang.
   - Khong tao Object tu che de tranh trung lap voi phan quyen va tinh nang phan loai co san cua Liferay.

3. **Hop nhat `UserLibrary` vao `DrmLicense`:**
   - Quyen so huu mot cuon sach trong Tu sach cua doc gia thuc chat chinh la Giay phep ban quyen (Mua vinh vien hoac Thue theo hoc ky 120 ngay).
   - Cac thuoc tinh nhu `isFavorite`, `isArchived`, `status` duoc tich hop truc tiep vao `DrmLicense`, giup giam thieu join bang va toi uu toc do truy van API tren di dong.

4. **Chuan hoa ten goi va khoa chinh (Primary Keys):**
   - Doi ten `ShelfCategory` thanh `PersonalShelf` de phan biet ro voi danh muc store.
   - Loai bo cac khoa chinh kieu cu `id_` o cac bang lien ket; chuan hoa ve dang `shelfItemId`, `progressId` dong nhat voi toan bo he thong.

---

## 2. BANG TONG HOP 10 DOI TUONG (OBJECT MASTER MATRIX)
### Phan Dinh Ro: Khoa Chinh (PK), Tham Chieu (Reference / FK) va Kiem Toan (Audit)

| STT | Doi Tuong (Liferay Object) | Bang MySQL | Liferay REST API | Phan Ky | Khoa Chinh (PK) | Thuoc Tinh Tham Chieu (Reference / FK) | Thuoc Tinh Kiem Toan (Audit Liferay) | Thuoc Tinh Nghiep Vu Chinh (Business) |
|:---:|---|---|---|---|---|---|---|---|
| **1** | **Book** | `c_book` | `/o/c/books` | Giai doan 1 | **`bookId`** | *Khong co* | `companyId`, `userId`, `userName`, `createDate`, `modifiedDate`, `status` | `title`, `author`, `publisher`, `language`, `description`<br>*(+12 truong khac)* |
| **2** | **ChapterTOC** | `c_chaptertoc` | `/o/c/chaptertocs` | Giai doan 1 | **`chapterId`** | `bookId`<br>`parentChapterId` | `companyId`, `createDate`, `modifiedDate` | `title`, `startPage`, `level`, `displayOrder` |
| **3** | **PersonalShelf** | `c_personalshelf` | `/o/c/personalshelfs` | Giai doan 2 | **`shelfId`** | `userId` | `companyId`, `createDate`, `modifiedDate` | `shelfName`, `colorTag`, `displayOrder` |
| **4** | **ShelfItem** | `c_shelfitem` | `/o/c/shelfitems` | Giai doan 2 | **`shelfItemId`** | `shelfId`<br>`bookId` | `companyId`, `addedAt` |  |
| **5** | **UserPreference** | `c_userpreference` | `/o/c/userpreferences` | Giai doan 2 | **`preferenceId`** | `userId` | `companyId`, `modifiedDate` | `themeMode`, `brightness`, `pageTurnEffect`, `pageTurnSoundEnabled`, `autoHideToolbar` |
| **6** | **ReadingProgress** | `c_readingprogress` | `/o/c/readingprogresses` | Giai doan 2 | **`progressId`** | `userId`<br>`bookId` | `companyId`, `lastReadAt` | `currentPage`, `totalPages`, `percentage`, `readStatus`, `readDurationSeconds`<br>*(+1 truong khac)* |
| **7** | **Bookmark** | `c_bookmark` | `/o/c/bookmarks` | Giai doan 2 | **`bookmarkId`** | `userId`<br>`bookId` | `companyId`, `createdAt` | `pageNumber`, `chapterTitle`, `colorTag`, `pageThumbnailUrl` |
| **8** | **Annotation** | `c_annotation` | `/o/c/annotations` | Giai doan 2 | **`annotationId`** | `userId`<br>`bookId` | `companyId`, `createdAt`, `modifiedAt` | `pageNumber`, `type`, `color`, `strokeWidth`, `coordinateData`<br>*(+1 truong khac)* |
| **9** | **DrmLicense** | `c_drmlicense` | `/o/c/drmlicenses` | Giai doan 3 | **`licenseId`** | `userId`<br>`bookId` | `companyId`, `createDate` | `licenseUuid`, `orderId`, `licenseType`, `encryptedContentKey`, `userKeyCheck`<br>*(+6 truong khac)* |
| **10** | **DeviceRegistration** | `c_deviceregistration` | `/o/c/deviceregistrations` | Giai doan 3 | **`registrationId`** | `licenseId` | `companyId`, `registeredDate` | `deviceUuid`, `deviceName`, `platform`, `lastActiveDate` |

> [!NOTE]
> **Quy uoc phan loai thuoc tinh:**
> - **Khoa chinh (PK):** Dinh danh duy nhat ban ghi (`BIGINT` tu tang).
> - **Thuoc tinh Tham chieu (Reference / FK):** Khoa ngoai lien ket giua cac Objects hoac Users. Khi xoa cha co rang buoc `ON DELETE CASCADE`.
> - **Thuoc tinh Kiem toan (Audit Fields):** Cac truong he thong do Liferay Portal tu dong sinh va quan ly (`companyId`, `userId`, `createDate`, `modifiedDate`, `status`...).
> - **Thuoc tinh Nghiep vu (Business Fields):** Du lieu dac thu cho bai toan doc sach 3D, ban quyen DRM va tuy bien nguoi dung.

---

## 3. CHI TIET CAU TRUC 10 THUC THE THEO PHAN KY

### 1. `Book` - Book (Sách & Giáo Trình Số)
- **Bang MySQL:** `c_book`
- **Liferay Headless REST Endpoint:** `/o/c/books`
- **Phan ky:** Giai đoạn 1: Core Reader
- **Mo ta nghiep vu:** Thực thể trung tâm quản lý ấn phẩm số. Chứa đường dẫn gói FlipBuilder tĩnh (flipbookBaseUrl) và các quy tắc nạp ảnh trang (mobile/{page}.jpg), cờ miễn phí (isFree) và giới hạn đọc thử theo đúng thực tế vận hành CTUPress.

| Ten Truong | Kieu Du Lieu | Phan Loai | Mo Ta & Rang Buoc Tham Chieu |
|---|---|---|---|
| `bookId` | `BIGINT` | **Primary Key (PK)** | Khóa chính tự tăng, định danh duy nhất cuốn sách. |
| `companyId` | `BIGINT` | Audit Field | Mã portal instance Liferay (Multi-tenancy). |
| `userId` | `BIGINT` | Audit Field | Mã tài khoản quản trị viên / giảng viên đăng tải giáo trình. |
| `userName` | `VARCHAR(75)` | Audit Field | Tên người tạo / biên tập bản ghi sách. |
| `createDate` | `DATETIME(6)` | Audit Field | Thời điểm tạo bản ghi sách trên hệ thống. |
| `modifiedDate` | `DATETIME(6)` | Audit Field | Thời điểm cập nhật thông tin sách gần nhất. |
| `status` | `INT` | Audit Field | Trạng thái phê duyệt Liferay Workflow (0: Approved, 1: Pending, 2: Draft). |
| `title` | `VARCHAR(255)` | Business Field | Tên đầy đủ của giáo trình hoặc ấn phẩm (ví dụ: 'Giáo Trình Kiến Trúc Máy Tính & Hợp Ngữ'). |
| `author` | `VARCHAR(255)` | Business Field | Họ tên tác giả, nhóm giảng viên hoặc hội đồng biên soạn. |
| `publisher` | `VARCHAR(255)` | Business Field | Nhà xuất bản hoặc đơn vị phát hành (ví dụ: NXB Đại Học Cần Thơ). |
| `language` | `VARCHAR(20)` | Business Field | Ngôn ngữ tài liệu ('vi': Tiếng Việt, 'en': Tiếng Anh). |
| `description` | `TEXT` | Business Field | Tóm tắt đề cương môn học và mục tiêu học phần của cuốn sách. |
| `coverUrl` | `VARCHAR(500)` | Business Field | URL ảnh bìa sách chất lượng cao hiển thị trên Tủ sách và Store. |
| `documentUrl` | `VARCHAR(500)` | Business Field | Đường dẫn file PDF gốc lưu trữ an toàn trong kho tài liệu Liferay Documents & Media. |
| `fileSize` | `BIGINT` | Business Field | Dung lượng tệp PDF gốc tính bằng bytes. |
| `totalPages` | `INT` | Business Field | Tổng số trang của cuốn sách (ví dụ: 350 trang). |
| `isFree` | `TINYINT(1)` | Business Field | True: Ấn phẩm đọc miễn phí/Kỷ yếu/Tạp chí (không cần đăng nhập, không DRM). False: Giáo trình có phí/bản quyền. |
| `samplePagesLimit` | `INT` | Business Field | Số trang cho phép độc giả đọc thử miễn phí khi chưa mua (mặc định: 15 trang đầu). |
| `flipbookBaseUrl` | `VARCHAR(500)` | Business Field | URL thư mục gói FlipBuilder trên Liferay D&M (ví dụ: 'https://ctupress.vn/flipbooks/giao-trinh-101/files/'). |
| `screenPattern` | `VARCHAR(50)` | Business Field | Mẫu đường dẫn ảnh trang nét 1080p để Mobile tự nạp vào Shader lật 3D 60 FPS. |
| `thumbPattern` | `VARCHAR(50)` | Business Field | Mẫu đường dẫn ảnh thumbnail nhỏ để nạp vào thanh trượt Scrubber dưới đáy màn hình. |
| `readingProgression` | `VARCHAR(10)` | Business Field | Hướng lật sách mặc định ('ltr': Trái sang Phải). |
| `defaultSpread` | `VARCHAR(15)` | Business Field | Chế độ dàn trang mặc định ('auto', 'single', 'double'). |
| `isEncrypted` | `TINYINT(1)` | Business Field | Cờ đánh dấu tài liệu đã được mã hóa bản quyền DRM AES-256. |

---

### 2. `ChapterTOC` - ChapterTOC (Mục Lục Cây Phân Cấp)
- **Bang MySQL:** `c_chaptertoc`
- **Liferay Headless REST Endpoint:** `/o/c/chaptertocs`
- **Phan ky:** Giai đoạn 1: Core Reader
- **Mo ta nghiep vu:** Quản lý cây mục lục phân cấp đa tầng (chương, phần, tiểu mục). Cho phép biên tập viên sửa mục lục trực tiếp trên Liferay Admin mà không cần mở lại phần mềm FlipBuilder.

| Ten Truong | Kieu Du Lieu | Phan Loai | Mo Ta & Rang Buoc Tham Chieu |
|---|---|---|---|
| `chapterId` | `BIGINT` | **Primary Key (PK)** | Khóa chính tự tăng, mã định danh duy nhất của chương mục. |
| `companyId` | `BIGINT` | Audit Field | Mã portal instance Liferay. |
| `createDate` | `DATETIME(6)` | Audit Field | Thời điểm tạo mục lục. |
| `modifiedDate` | `DATETIME(6)` | Audit Field | Thời điểm cập nhật mục lục gần nhất. |
| `bookId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới Book.bookId (CASCADE on delete: xóa sách tự xóa mục lục). |
| `parentChapterId` | `BIGINT` | **Reference (FK)** | Khóa ngoại tự tham chiếu tới chapterId cấp cha (NULL nếu là chương lớn cấp 1). |
| `title` | `VARCHAR(255)` | Business Field | Tiêu đề chương / phần mục (ví dụ: 'Chương 1: Tổng quan kiến trúc phần cứng'). |
| `startPage` | `INT` | Business Field | Số thứ tự trang bắt đầu của chương để Reader nhảy tới khi độc giả chạm vào. |
| `level` | `INT` | Business Field | Cấp độ thụt lề trên cây mục lục (1: Phần lớn, 2: Chương con, 3: Tiểu mục). |
| `displayOrder` | `INT` | Business Field | Thứ tự sắp xếp hiển thị trên cây TOC. |

---

### 3. `PersonalShelf` - PersonalShelf (Kệ Sách Cá Nhân Của Độc Giả)
- **Bang MySQL:** `c_personalshelf`
- **Liferay Headless REST Endpoint:** `/o/c/personalshelfs`
- **Phan ky:** Giai đoạn 2: Tủ Sách & Kệ Sách
- **Mo ta nghiep vu:** Kệ sách cá nhân do từng độc giả tự tạo (ví dụ: 'Môn Kiến Trúc', 'Tài Liệu Ôn Thi') để phân loại sách theo nhu cầu học tập riêng. Độc giả khác không nhìn thấy kệ này.

| Ten Truong | Kieu Du Lieu | Phan Loai | Mo Ta & Rang Buoc Tham Chieu |
|---|---|---|---|
| `shelfId` | `BIGINT` | **Primary Key (PK)** | Khóa chính tự tăng, mã kệ sách cá nhân. |
| `companyId` | `BIGINT` | Audit Field | Mã portal instance Liferay. |
| `createDate` | `DATETIME(6)` | Audit Field | Thời điểm độc giả tạo kệ sách. |
| `modifiedDate` | `DATETIME(6)` | Audit Field | Thời điểm sửa tên hoặc đổi màu nhãn kệ gần nhất. |
| `userId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới tài khoản độc giả sở hữu kệ sách. |
| `shelfName` | `VARCHAR(255)` | Business Field | Tên kệ sách do độc giả tự đặt (ví dụ: 'Môn Kiến Trúc Máy Tính'). |
| `colorTag` | `VARCHAR(30)` | Business Field | Mã màu nhãn dán hiển thị trên ứng dụng (#3B82F6, #10B981, #F59E0B...). |
| `displayOrder` | `INT` | Business Field | Thứ tự sắp xếp hiển thị kệ sách trên màn hình tủ sách cá nhân. |

---

### 4. `ShelfItem` - ShelfItem (Ánh Xạ Sách Vào Kệ Cá Nhân)
- **Bang MySQL:** `c_shelfitem`
- **Liferay Headless REST Endpoint:** `/o/c/shelfitems`
- **Phan ky:** Giai đoạn 2: Tủ Sách & Kệ Sách
- **Mo ta nghiep vu:** Bảng liên kết Nhiều - Nhiều (N:N) gán một cuốn sách vào một hoặc nhiều kệ cá nhân. Khi xóa kệ cá nhân, chỉ xóa bản ghi liên kết này, tuyệt đối không làm mất quyền sở hữu sách trong DrmLicense và không xóa sách gốc Book.

| Ten Truong | Kieu Du Lieu | Phan Loai | Mo Ta & Rang Buoc Tham Chieu |
|---|---|---|---|
| `shelfItemId` | `BIGINT` | **Primary Key (PK)** | Khóa chính tự tăng (chuẩn hóa thay cho id_ cũ). |
| `companyId` | `BIGINT` | Audit Field | Mã portal instance Liferay. |
| `addedAt` | `DATETIME(6)` | Audit Field | Thời điểm độc giả gán cuốn sách vào kệ cá nhân. |
| `shelfId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới PersonalShelf.shelfId (CASCADE: xóa kệ tự xóa ánh xạ). |
| `bookId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới Book.bookId (CASCADE: xóa sách tự xóa ánh xạ). |

---

### 5. `UserPreference` - UserPreference (Cấu Hình Trải Nghiệm Đọc)
- **Bang MySQL:** `c_userpreference`
- **Liferay Headless REST Endpoint:** `/o/c/userpreferences`
- **Phan ky:** Giai đoạn 2: Tiện Ích Đọc
- **Mo ta nghiep vu:** Lưu trữ cấu hình môi trường đọc sách của từng độc giả (Theme Light/Dark, độ sáng màn hình, hiệu ứng lật trang 3D, âm thanh lật giấy). Quan hệ 1:1 với từng tài khoản User.

| Ten Truong | Kieu Du Lieu | Phan Loai | Mo Ta & Rang Buoc Tham Chieu |
|---|---|---|---|
| `preferenceId` | `BIGINT` | **Primary Key (PK)** | Khóa chính tự tăng, mã cấu hình trải nghiệm đọc. |
| `companyId` | `BIGINT` | Audit Field | Mã portal instance Liferay. |
| `modifiedDate` | `DATETIME(6)` | Audit Field | Thời điểm cập nhật cài đặt gần nhất. |
| `userId` | `BIGINT` | **Reference (FK)** | Khóa ngoại duy nhất (Unique 1:1) trỏ tới Liferay User. |
| `themeMode` | `VARCHAR(20)` | Business Field | Chế độ nền đọc sách ('LIGHT': Sáng, 'DARK': Đêm, 'SEPIA': Vàng dịu mắt, 'SYSTEM': Theo hệ điều hành). |
| `brightness` | `DOUBLE` | Business Field | Độ sáng vùng đọc sách (từ 0.1 đến 1.0). |
| `pageTurnEffect` | `VARCHAR(20)` | Business Field | Hiệu ứng lật trang ('CURL_3D': Lật uốn cong 3D vật lý, 'SLIDE': Trượt phẳng, 'FADE': Mờ dần). |
| `pageTurnSoundEnabled` | `TINYINT(1)` | Business Field | Bật/tắt âm thanh sột soạt lật giấy (1: Bật, 0: Tắt). |
| `autoHideToolbar` | `TINYINT(1)` | Business Field | Tự động ẩn thanh công cụ sau 3 giây không chạm màn hình để tối đa không gian đọc. |

---

### 6. `ReadingProgress` - ReadingProgress (Tiến Trình Đọc & Vị Trí Gần Nhất)
- **Bang MySQL:** `c_readingprogress`
- **Liferay Headless REST Endpoint:** `/o/c/readingprogresses`
- **Phan ky:** Giai đoạn 2: Tiện Ích Đọc
- **Mo ta nghiep vu:** Lưu trữ vị trí trang sách đang đọc dở và phần trăm hoàn thành, đồng bộ ngầm đa thiết bị. Hỗ trợ mốc thời gian lastReadTimestamp (Epoch ms) giải quyết xung đột khi đọc trên nhiều máy.

| Ten Truong | Kieu Du Lieu | Phan Loai | Mo Ta & Rang Buoc Tham Chieu |
|---|---|---|---|
| `progressId` | `BIGINT` | **Primary Key (PK)** | Khóa chính tự tăng (chuẩn hóa thay cho id_ cũ). |
| `companyId` | `BIGINT` | Audit Field | Mã portal instance Liferay. |
| `lastReadAt` | `DATETIME(6)` | Audit Field | Thời điểm đọc sách gần nhất ghi nhận theo ngày giờ. |
| `userId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới tài khoản độc giả đang đọc sách. |
| `bookId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới cuốn sách đang đọc. |
| `currentPage` | `INT` | Business Field | Trang sách hiện tại độc giả đang đọc dở (để hỏi đọc tiếp khi mở lại). |
| `totalPages` | `INT` | Business Field | Tổng số trang của cuốn sách tại thời điểm đọc. |
| `percentage` | `DOUBLE` | Business Field | Tỷ lệ phần trăm hoàn thành cuốn sách (0.0 đến 100.0). |
| `readStatus` | `VARCHAR(20)` | Business Field | Trạng thái tiến trình đọc ('UNREAD': Chưa đọc, 'READING': Đang đọc, 'COMPLETED': Đã đọc xong). |
| `readDurationSeconds` | `BIGINT` | Business Field | Tổng thời gian thực tế đã mở đọc cuốn sách tính theo giây. |
| `lastReadTimestamp` | `BIGINT` | Business Field | Mốc thời gian Epoch ms dùng để giải quyết xung đột đồng bộ giữa nhiều thiết bị. |

---

### 7. `Bookmark` - Bookmark (Đánh Dấu Trang Yêu Thích)
- **Bang MySQL:** `c_bookmark`
- **Liferay Headless REST Endpoint:** `/o/c/bookmarks`
- **Phan ky:** Giai đoạn 2: Tiện Ích Đọc
- **Mo ta nghiep vu:** Quản lý các trang sách quan trọng độc giả gắn dải ruy băng để xem lại nhanh kèm tên chương và ảnh chụp thu nhỏ.

| Ten Truong | Kieu Du Lieu | Phan Loai | Mo Ta & Rang Buoc Tham Chieu |
|---|---|---|---|
| `bookmarkId` | `BIGINT` | **Primary Key (PK)** | Khóa chính tự tăng, mã đánh dấu trang. |
| `companyId` | `BIGINT` | Audit Field | Mã portal instance Liferay. |
| `createdAt` | `DATETIME(6)` | Audit Field | Thời điểm tạo đánh dấu trang. |
| `userId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới Liferay User sở hữu bookmark. |
| `bookId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới Book cuốn sách được đánh dấu. |
| `pageNumber` | `INT` | Business Field | Số thứ tự trang sách được đánh dấu. |
| `chapterTitle` | `VARCHAR(255)` | Business Field | Tiêu đề chương sách tương ứng tại vị trí trang đánh dấu. |
| `colorTag` | `VARCHAR(20)` | Business Field | Mã màu ruy băng đánh dấu (#F59E0B: Vàng, #EF4444: Đỏ...). |
| `pageThumbnailUrl` | `VARCHAR(500)` | Business Field | Ảnh chụp thu nhỏ của trang để hiển thị trực quan trong panel danh sách bookmark. |

---

### 8. `Annotation` - Annotation (Tô Sáng & Vẽ Ghi Chú Vector)
- **Bang MySQL:** `c_annotation`
- **Liferay Headless REST Endpoint:** `/o/c/annotations`
- **Phan ky:** Giai đoạn 2: Tiện Ích Đọc
- **Mo ta nghiep vu:** Lưu trữ các nét vẽ bút dạ quang (Highlight), bút chì và ghi chú tương tác theo hệ tọa độ vector chuẩn hóa (0.0 đến 1.0) độc lập với độ phân giải màn hình thiết bị.

| Ten Truong | Kieu Du Lieu | Phan Loai | Mo Ta & Rang Buoc Tham Chieu |
|---|---|---|---|
| `annotationId` | `BIGINT` | **Primary Key (PK)** | Khóa chính tự tăng, mã ghi chú nét vẽ. |
| `companyId` | `BIGINT` | Audit Field | Mã portal instance Liferay. |
| `createdAt` | `DATETIME(6)` | Audit Field | Thời điểm vẽ / tô sáng ghi chú. |
| `modifiedAt` | `DATETIME(6)` | Audit Field | Thời điểm sửa đổi nét vẽ gần nhất. |
| `userId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới Liferay User tạo nét vẽ. |
| `bookId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới Book cuốn sách được ghi chú. |
| `pageNumber` | `INT` | Business Field | Số trang sách chứa nét vẽ hoặc ghi chú. |
| `type` | `VARCHAR(30)` | Business Field | Loại tương tác ('HIGHLIGHT': Dạ quang, 'DRAWING_PEN': Bút chì tự do, 'STICKY_NOTE': Giấy ghi chú). |
| `color` | `VARCHAR(20)` | Business Field | Mã màu nét vẽ (#FFFF00: Vàng, #10B981: Xanh lá, #EC4899: Hồng...). |
| `strokeWidth` | `DOUBLE` | Business Field | Độ dày nét bút vẽ (pixel). |
| `coordinateData` | `LONGTEXT` | Business Field | Chuỗi JSON chứa mảng tọa độ vector chuẩn hóa (x, y từ 0.0 đến 1.0) độc lập màn hình. |
| `noteText` | `TEXT` | Business Field | Nội dung văn bản ghi chú đính kèm (nếu là dạng Sticky Note). |

---

### 9. `DrmLicense` - DrmLicense (Giấy Phép Bản Quyền & Tủ Sách Sở Hữu)
- **Bang MySQL:** `c_drmlicense`
- **Liferay Headless REST Endpoint:** `/o/c/drmlicenses`
- **Phan ky:** Giai đoạn 3: DRM & Commerce
- **Mo ta nghiep vu:** Hợp nhất toàn diện: Vừa quản lý giấy phép bản quyền Readium LCP 1.0 (Mua vĩnh viễn / Thuê 120 ngày), vừa đóng vai trò là danh mục Tủ sách của độc giả (My Bookshelf) với các cờ yêu thích và lưu trữ.

| Ten Truong | Kieu Du Lieu | Phan Loai | Mo Ta & Rang Buoc Tham Chieu |
|---|---|---|---|
| `licenseId` | `BIGINT` | **Primary Key (PK)** | Khóa chính tự tăng, mã giấy phép số đồng thời định danh cuốn sách trong tủ. |
| `companyId` | `BIGINT` | Audit Field | Mã portal instance Liferay. |
| `createDate` | `DATETIME(6)` | Audit Field | Thời điểm cấp giấy phép / đưa sách vào tủ cá nhân. |
| `userId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới tài khoản độc giả sở hữu giấy phép đọc. |
| `bookId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới cuốn sách được cấp quyền đọc. |
| `licenseUuid` | `VARCHAR(64)` | Business Field | Chuỗi UUID duy nhất định danh giấy phép chuẩn Readium LCP. |
| `orderId` | `VARCHAR(64)` | Business Field | Mã đơn hàng thanh toán qua cổng MekoPay (VietQR, MoMo...). |
| `licenseType` | `VARCHAR(30)` | Business Field | Loại giấy phép ('PERPETUAL': Mua vĩnh viễn, 'RENTAL': Thuê học kỳ 120 ngày, 'TRIAL': Đọc thử). |
| `encryptedContentKey` | `TEXT` | Business Field | Khóa AES-256 mã hóa nội dung sách, bảo vệ bằng Passphrase độc giả. |
| `userKeyCheck` | `VARCHAR(128)` | Business Field | Chuỗi hash kiểm tra tính hợp lệ của mật khẩu giải mã. |
| `startDate` | `DATETIME` | Business Field | Thời điểm giấy phép bắt đầu có hiệu lực. |
| `endDate` | `DATETIME` | Business Field | Thời điểm hết hạn đọc sách (NULL nếu là mua vĩnh viễn). |
| `maxDevices` | `INT` | Business Field | Số lượng thiết bị tối đa được phép đọc đồng thời (mặc định: 3 máy). |
| `isFavorite` | `TINYINT(1)` | Business Field | Đánh dấu sách yêu thích trong Tủ sách cá nhân (1: Yêu thích, 0: Thường). |
| `isArchived` | `TINYINT(1)` | Business Field | Độc giả chủ động ẩn bớt sách đã học xong khỏi tủ chính (1: Ẩn, 0: Hiện). |
| `status` | `VARCHAR(30)` | Business Field | Trạng thái giấy phép ('ACTIVE': Hiệu lực, 'EXPIRED': Hết hạn thuê, 'REVOKED': Thu hồi vi phạm). |

---

### 10. `DeviceRegistration` - DeviceRegistration (Quản Lý Thiết Bị Kích Hoạt Đọc)
- **Bang MySQL:** `c_deviceregistration`
- **Liferay Headless REST Endpoint:** `/o/c/deviceregistrations`
- **Phan ky:** Giai đoạn 3: DRM & Commerce
- **Mo ta nghiep vu:** Kiểm soát giới hạn thiết bị đọc của độc giả (tối đa 2-3 máy), ngăn chặn hành vi chia sẻ tài khoản xem lậu giáo trình.

| Ten Truong | Kieu Du Lieu | Phan Loai | Mo Ta & Rang Buoc Tham Chieu |
|---|---|---|---|
| `registrationId` | `BIGINT` | **Primary Key (PK)** | Khóa chính tự tăng, mã bản ghi thiết bị. |
| `companyId` | `BIGINT` | Audit Field | Mã portal instance Liferay. |
| `registeredDate` | `DATETIME` | Audit Field | Thời điểm thiết bị được kích hoạt lần đầu. |
| `licenseId` | `BIGINT` | **Reference (FK)** | Khóa ngoại trỏ tới DrmLicense.licenseId (Giấy phép được kích hoạt trên máy này). |
| `deviceUuid` | `VARCHAR(128)` | Business Field | Mã UUID phần cứng duy nhất của thiết bị điện thoại / tablet. |
| `deviceName` | `VARCHAR(255)` | Business Field | Tên thiết bị người dùng (ví dụ: 'iPhone 15 Pro Max', 'Galaxy Tab S9'). |
| `platform` | `VARCHAR(20)` | Business Field | Nền tảng hệ điều hành ('iOS', 'Android'). |
| `lastActiveDate` | `DATETIME` | Business Field | Lần đọc sách gần nhất được ghi nhận từ thiết bị này. |

---

## 4. CO CHE SLIDING WINDOW PRE-CACHING CHO CORE READER 3D

Mo hinh 10 Objects loai bo hoan toan `PageRendition` giup toi uu vuot troi ve bang thong va toc do xu ly:

```
+--------------------+         GET /o/c/books/{bookId}         +------------------------+
|                    | --------------------------------------> |                        |
|                    |                                         |  Liferay Object Engine |
|                    | <-------------------------------------- |  (Tra ve Manifest JSON)|
|                    |    { totalPages: 350,                   +------------------------+
|   Mobile Client    |      flipbookBaseUrl: '...',                                      
|   (React Native)   |      screenPattern: 'mobile/{page}.jpg' }                        
|                    |                                                                   
|                    |   Client tu tinh toan URL:                                        
|                    |   - Trang 42: baseUrl + 'mobile/42.jpg'                           
|                    |   - Nap truoc [41, 42, 43, 44] vao GPU Texture Buffer             
+--------------------+   - Dat toc do 60 FPS on dinh, RAM < 40MB                        
```

1. **Kich thuoc Payload cuc nho:** Chi mot lan goi REST JSON khoang 1.5 KB cho toan bo thong tin sach va muc luc TOC.
2. **Zero DB Lookup cho trang:** He thong may chu khong can thuc hien bat ky cau query nao vao DB khi nguoi dung lat trang.
3. **Tiet kiem tai nguyen Mobile:** Thay vi giu toan bo sach trong RAM, ung dung chi duy tri 4 trang trong bo nho dem cuc bo, giai phong ngay cac trang xa tam nhin.

---

## 5. BANG ANH XA CHUC NANG SRS SANG 10 THUC THE CDM

| Ma Chuc Nang SRS | Ten Chuc Nang / Nghiep Vu | Thuc The CDM Dam Trach | Hanh Dong Du Lieu Chinh |
|---|---|---|---|
| **UC-2.1** | Quan ly Tu sach & Ke sach ca nhan | `PersonalShelf`<br>`ShelfItem`<br>`DrmLicense` | - Tao/Sua/Xoa ke sach ca nhan.<br>- Them/bot sach vao ke ca nhan.<br>- Xem toan bo sach da mua/thue qua `DrmLicense`. |
| **UC-2.2** | Kiem tra License & Khoi tao phien doc | `DrmLicense`<br>`ReadingProgress` | - Kiem tra hop le: `status == 'ACTIVE'` va `endDate >= NOW()`.<br>- Neu `Book.isFree == true` hoac doc thu (`<= samplePagesLimit`) thi cho phep doc ngay khong can license.<br>- Lay `currentPage` de mo dung trang doc do. |
| **UC-2.3** | Lat trang 3D vat ly (60 FPS) | `Book` | - Lay `flipbookBaseUrl` va `screenPattern` de nap anh trang.<br>- Ap dung Sliding Window Pre-caching nap truoc cac trang tiep theo. |
| **UC-2.4** | Chuyen trang & Scrubber Thumbnail | `Book` | - Dung `thumbPattern` (vi du: `thumb/{page}.jpg`) de render dai thumbnail truot duoi day man hinh. |
| **UC-2.5** | Dieu huong Muc luc cay (TOC) | `ChapterTOC` | - Lay cay phan cap chuong muc theo `parentChapterId` va `level`. |
| **UC-2.6** | Danh dau trang (Bookmark) | `Bookmark` | - Them moi/Xoa danh dau trang theo `(userId, bookId, pageNumber)`. |
| **UC-2.7** | To sang & Ghi chu ve vector | `Annotation` | - Luu va dong bo chuoi JSON toa do vector chuan hoa (0.0 den 1.0) doc lap do phan giai man hinh. |
| **UC-2.8** | Tu dong dong bo tien trinh doc | `ReadingProgress` | - Cap nhat `currentPage`, `percentage`, `lastReadTimestamp` len may chu; giai quyet xung dot da thiet bi bang Epoch timestamp. |
| **UC-2.9** | Tuy bien hien thi & Che do doc | `UserPreference` | - Luu cau hinh `themeMode` (Light/Dark), `brightness`, `pageTurnEffect`, `pageTurnSoundEnabled`. |
| **UC-2.10** | Tai sach doc Offline an toan | `DrmLicense`<br>`Book` | - Kiem tra quyen thue/mua hop le, tai anh trang va ma hoa cuc bo AES-256 vao bo nho an toan cua thiet bi. |

---

> [!IMPORTANT]
> **Luu Y Ve Viec Trien Khai Voi Liferay 7.4 GA132 CE Objects:**
> Khong duoc tu y chay lenh DDL MySQL thu cong vao Database cua Liferay. Khi tao Object Definition thong qua Liferay Control Panel hoac Headless OpenAPI, he thong Liferay se tu dong tao bang `c_<objectname>`, tu dong quan ly cac truong kiem toan (`companyId`, `userId`, `createDate`...) va tu dong expose day du bo REST API CRUD tai `/o/c/<pluralName>`.