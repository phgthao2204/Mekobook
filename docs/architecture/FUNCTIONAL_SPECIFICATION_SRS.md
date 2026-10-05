# TÀI LIỆU ĐẶC TẢ YÊU CẦU CHỨC NĂNG HOÀN CHỈNH (SRS)
# HỆ THỐNG ĐỌC SÁCH ĐIỆN TỬ FLIPBOOK 3D MEKOBOOK

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự Án** | Xây dựng Ứng dụng Di động Đọc Flipbook 3D (Mekobook) |
| **Đơn Vị Chủ Quản** | Mekosoft Ecosystem - Chương trình Thực tập Đợt 3/2026 |
| **Vai Trò Xây Dựng** | CTO / Lead System Architect & Project Manager (PM) |
| **Nền Tảng Backend** | Liferay Portal 7.4 GA132 CE (Documents & Media, Headless REST, Liferay Objects) |
| **Nền Tảng Client** | React Native (iOS & Android) với 3D Flipbook Mesh Engine |
| **Chuẩn Bản Quyền** | Readium LCP 1.0 (ISO 23078-2) & W3C Publication Manifest |
| **Trạng Thái** | Version 2.0 (Official Production Baseline) |

---

## MỤC LỤC
1. [TỔNG QUAN HỆ THỐNG & TẦM NHÌN KINH DOANH](#1-tổng-quan-hệ-thống--tầm-nhìn-kinh-doanh)
2. [CÁC TÁC NHÂN & MA TRẬN PHÂN QUYỀN (ACTORS & RBAC)](#2-các-tác-nhân--ma-trận-phân-quyền-actors--rbac)
3. [QUY TRÌNH NGUYÊN LÝ KỸ THUẬT: TỪ FILE PDF ĐẾN FLIPBOOK 3D](#3-quy-trình-nguyên-lý-kỹ-thuật-từ-file-pdf-đến-flipbook-3d)
4. [CHI TIẾT ĐẶC TẢ CHỨC NĂNG HỆ THỐNG](#4-chi-tiết-đặc-tả-chức-năng-hệ-thống)
   - [Phân hệ 1: Quản trị Kho sách & Pipeline Xử lý Tài liệu](#phân-hệ-1-quản-trị-kho-sách--pipeline-xử-lý-tài-liệu-backend-cms)
   - [Phân hệ 2: Cửa hàng Sách & Cấp phép Bản quyền DRM](#phân-hệ-2-cửa-hàng-sách--cấp-phép-bản-quyền-drm-store--licensing)
   - [Phân hệ 3: Trình đọc Flipbook 3D & Trải nghiệm Độc giả](#phân-hệ-3-trình-đọc-flipbook-3d--trải-nghiệm-độc-giả-mobile-viewer)
   - [Phân hệ 4: Tương tác Đọc & Đồng bộ Đám mây](#phân-hệ-4-tương-tác-đọc--đồng-bộ-đám-mây-sync--interactions)
   - [Phân hệ 5: Quản lý Ngoại tuyến & Bảo mật DRM Chống Sao chép](#phân-hệ-5-quản-lý-ngoại-tuyến--bảo-mật-drm-chống-sao-chép)
   - [Phân hệ 6: Kiến trúc Mở rộng Đa định dạng (PDF, EPUB, Audio)](#phân-hệ-6-kiến-trúc-mở-rộng-đa-định-dạng-universal-reader)
5. [CÁC YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)](#5-các-yêu-cầu-phi-chức-năng-non-functional-requirements---nfr)

---

## 1. TỔNG QUAN HỆ THỐNG & TẦM NHÌN KINH DOANH

### 1.1. Bối cảnh
Trước đây, các hệ thống đọc tài liệu trên mobile thường rơi vào hai thái cực:
1. **Đọc PDF đơn thuần**: Mở cả file PDF lớn (>100MB) gây giật lag, tốn RAM, trải nghiệm đơn điệu và dễ bị trích xuất file lậu.
2. **Mock App độc lập**: Chỉ chạy dữ liệu giả lập từ file JSON nội bộ trên máy, không có khả năng kinh doanh, phân phối hay bảo vệ quyền tác giả.

### 1.2. Tầm nhìn Sản phẩm Mekobook
**Mekobook** được thiết kế như một **Nền tảng Phân phối và Tiêu thụ Nội dung Số Hoàn chỉnh**:
* **Khởi nguồn kinh doanh**: Độc giả duyệt và mua sách từ **Store** (mua vĩnh viễn, thuê có thời hạn 30/90 ngày, hoặc đọc thử 15 trang đầu).
* **Cấp phép tự động (License Fulfillment)**: Tự động phát hành giấy phép bản quyền số **Readium LCP (Licensed Content Protection)** gắn với ID người dùng và Mã đơn hàng.
* **Backend vững chắc**: Khai thác sức mạnh của **Liferay 7.4 GA132 CE** (Documents & Media quản lý kho tệp, Headless REST APIs, Liferay Objects quản lý tiến trình).
* **Trải nghiệm Đỉnh cao trên Mobile**: Công nghệ lật trang 3D (3D Page Turn Mesh) đạt chuẩn **60 FPS**, tiết kiệm RAM (<30MB) nhờ kiến trúc streaming ảnh WebP đa tầng, đọc mượt cả khi mất mạng (Offline AES-256) và chống quay chụp màn hình với Watermark pháp lý.

---

## 2. CÁC TÁC NHÂN & MA TRẬN PHÂN QUYỀN (ACTORS & RBAC)

### 2.1. Danh sách Tác nhân
1. **Khách vãng lai (Guest User)**: Người dùng chưa đăng nhập, chỉ được xem danh mục sách và đọc thử tối đa 15 trang đầu của sách miễn phí/cho phép đọc thử.
2. **Độc giả (Reader / Customer)**: Người dùng có tài khoản, thực hiện mua/thuê sách trên Store, sở hữu giấy phép đọc sách, lưu trữ bookmark, highlight và đồng bộ tiến độ đọc.
3. **Biên tập viên / Quản lý nội dung (Publisher / Content Admin)**: Người tải tài liệu PDF gốc lên Liferay, cấu hình metadata, mục lục, giá bán và chính sách đọc thử.
4. **Quản trị viên hệ thống (System Admin)**: Quản lý hạ tầng Liferay, theo dõi log, thu hồi bản quyền (Revoke License) của các tài khoản vi phạm.
5. **Hệ thống tự động (Automated Subsystems)**:
   * *Ghostscript / PDFBox Worker*: Lắng nghe sự kiện upload PDF trên Liferay để sinh WebP Renditions.
   * *DRM Licensing Engine*: Cấp phát và ký số chứng thư điện tử Readium LCP.

### 2.2. Ma trận Phân quyền Chức năng (RBAC Matrix)

| Phân hệ / Chức năng | Khách (Guest) | Độc giả (Reader) | Quản lý Nội dung | Admin Hệ thống |
| :--- | :---: | :---: | :---: | :---: |
| Xem Thư viện & Tìm kiếm sách | ✅ | ✅ | ✅ | ✅ |
| Đọc thử sách (Sample Pages 1-15) | ✅ | ✅ | ✅ | ✅ |
| Đọc toàn bộ sách có bản quyền | ❌ | ✅ (Nếu có License) | ✅ | ✅ |
| Tải sách đọc Offline (Mã hóa AES) | ❌ | ✅ (Nếu có License) | ✅ | ✅ |
| Tạo Bookmark, Highlight, Vẽ hình | ❌ | ✅ | ✅ | ✅ |
| Đồng bộ Tiến trình đọc đa thiết bị | ❌ | ✅ | ✅ | ✅ |
| Tải file PDF gốc lên Liferay D&M | ❌ | ❌ | ✅ | ✅ |
| Thu hồi bản quyền thiết bị từ xa | ❌ | ❌ | ❌ | ✅ |

---

## 3. QUY TRÌNH NGUYÊN LÝ KỸ THUẬT: TỪ FILE PDF ĐẾN FLIPBOOK 3D

Để giải quyết triệt để thắc mắc kỹ thuật *"Upload cái gì và Server trả cái gì?"*, quy trình được chuẩn hóa thành 3 giai đoạn:

```
[ GIAI ĐOẠN 1: UPLOAD & XỬ LÝ TRÊN LIFERAY SERVER ]
1. Biên tập viên upload DUY NHẤT 1 file '.pdf' gốc lên Documents & Media.
2. Liferay Engine kích hoạt ngầm Ghostscript / ImageMagick:
   - Tách từng trang thành ảnh WebP chuẩn 1080p: /pages/1/screen.webp, /pages/2/screen.webp...
   - Tách ảnh Thumbnail Scrubber: /pages/1/thumb.webp...
   - Tự động sinh file W3C Publication Manifest: /books/{id}/manifest.json

[ GIAI ĐOẠN 2: CLIENT STREAMING MỞ SÁCH (ONLINE 60 FPS) ]
1. App gọi API: GET /o/mekobook/v1.0/books/42001/manifest
2. Server trả về file JSON siêu nhẹ (~5KB) chứa:
   - Số trang, tỉ lệ pixel, cấu trúc cây mục lục (TOC), và danh sách URL ảnh từng trang.
3. App KHÔNG tải 100 trang cùng lúc!
   - Khi ở trang 1, app chỉ nạp ảnh WebP trang 1, trang 2 và trang 3 vào RAM (~120KB/ảnh).
   - Flipbook 3D Engine lấy ảnh làm Texture uốn cong 3D (Mesh Deformation).
   - RAM tiêu thụ cực thấp (<30MB), tốc độ render 60 FPS mượt mà.

[ GIAI ĐOẠN 3: TẢI ĐỌC OFFLINE AN TOÀN ]
1. Khi người dùng bấm "Tải đọc Offline":
   - Server gom toàn bộ ảnh WebP + manifest vào một file nén mã hóa: 'BookTitle.meko'.
   - File được mã hóa toàn phần bằng thuật toán AES-256 (Readium LCP Package).
2. App tải 1 file duy nhất về Sandbox cục bộ.
3. Khi không có Internet: App đọc file .meko, giải mã từng trang trực tiếp trong RAM (In-Memory) để lật sách, tuyệt đối không xuất file ảnh thô ra bộ nhớ công cộng.
```

---

## 4. CHI TIẾT ĐẶC TẢ CHỨC NĂNG HỆ THỐNG

### PHÂN HỆ 1: QUẢN TRỊ KHO SÁCH & PIPELINE XỬ LÝ TÀI LIỆU (BACKEND CMS)

#### 1.1. Quản lý Thư mục Danh mục Sách (Book Categories)
* **Mô tả:** Cho phép quản trị viên phân loại kho tài liệu theo các thể loại (Công nghệ thông tin, Kinh tế, Văn học, Y học...).
* **Dữ liệu đầu vào:** Tên thể loại, mô tả, thứ tự hiển thị, biểu tượng đại diện.
* **Xử lý:** Ánh xạ vào `DLFolder` trên Liferay D&M và bản ghi `C_MekoCategory`.
* **Đầu ra:** Cấu trúc phân loại cây phục vụ API danh mục trên ứng dụng di động.

#### 1.2. Upload & Tự động Trích xuất Renditions Đa tầng
* **Mô tả:** Admin tải tệp `.pdf` lên kho. Hệ thống tự động kiểm tra tính hợp lệ và phân giải tệp.
* **Điều kiện tiên quyết:** Tệp có định dạng `.pdf`, dung lượng tối đa 300MB.
* **Xử lý:**
  * Kiểm tra virus và định dạng tệp.
  * Tự động chạy background worker: sử dụng Ghostscript trích xuất từng trang ra định dạng WebP (chất lượng 85%, nén lossless cho văn bản sắc nét).
  * Tạo thumbnail tỷ lệ $3:4$ cho thanh cuộn scrubber.
  * Trích xuất thông tin số trang, kích thước trang (Point/Pixel) ghi vào bảng `C_MekoPageRendition`.
* **Xử lý ngoại lệ:** Nếu PDF bị hỏng hoặc có mật khẩu khóa: Gắn cờ `renditionStatus = 'FAILED'` kèm thông báo lỗi cụ thể.

#### 1.3. Trích xuất & Biên tập Mục lục Sách (Table of Contents - TOC)
* **Mô tả:** Quản lý cây mục lục phân cấp của cuốn sách (Chương lớn, Mục con, Tiểu mục).
* **Xử lý:** Tự động đọc PDF Bookmarks / Outline có sẵn trong tệp. Cho phép quản trị viên chỉnh sửa hoặc bổ sung mục lục thủ công.
* **Đầu ra:** Bản ghi cây phân cấp trong `C_MekoChapterTOC` (hỗ trợ trường `parentChapterId`).

---

### PHÂN HỆ 2: CỬA HÀNG SÁCH & CẤP PHÉP BẢN QUYỀN DRM (STORE & LICENSING)

#### 2.1. Hiển thị Thư viện & Tìm kiếm Đa tiêu chí
* **Mô tả:** Hiển thị danh mục sách cho người dùng trên Mobile App dạng Lưới (Grid) hoặc Danh sách (List).
* **Thông tin hiển thị:** Ảnh bìa lớn, tên sách, tác giả, thể loại, ngôn ngữ, dung lượng, số trang, nhãn trạng thái ("Miễn phí", "Mua vĩnh viễn: 150.000đ", "Thuê 30 ngày: 35.000đ").
* **Bộ lọc & Tìm kiếm:** Tìm kiếm tức thì theo từ khóa (Tên sách, tác giả, năm xuất bản); Lọc theo thể loại, trạng thái đọc (Chưa đọc, Đang đọc, Đã xong).

#### 2.2. Chế độ Đọc thử Miễn phí (Free Sample Reading)
* **Mô tả:** Khách hàng chưa mua bản quyền vẫn có thể mở sách và trải nghiệm lật trang 3D từ trang 1 đến trang giới hạn (`samplePagesLimit`, mặc định 15 trang).
* **Xử lý:** Khi người đọc lật đến trang thứ 16, Flipbook Engine tự động dừng hiệu ứng lật trang, làm mờ màn hình và hiển thị modal thông báo: *"Bạn đã xem hết phần đọc thử. Vui lòng mua hoặc thuê sách để tiếp tục đọc toàn bộ cuốn sách"*, kèm nút bấm mua ngay.

#### 2.3. Cấp phát Bản quyền Số Tự động (Readium LCP License Generation)
* **Mô tả:** Khi đơn hàng trên Store hoàn tất thanh toán (Webhook từ cổng thanh toán gọi về Liferay), hệ thống tự động kích hoạt tiến trình cấp License.
* **Xử lý kỹ thuật:**
  1. Tạo mã định danh `licenseUuid`.
  2. Sinh khóa nội dung đối xứng `ContentKey` (AES-256).
  3. Bọc khóa này bằng `UserKey` (dẫn xuất từ passphrase hoặc Device Token).
  4. Đóng dấu thời gian hiệu lực: Mua vĩnh viễn (`endDate = NULL`); Thuê sách (`endDate = NOW() + 30 days`).
  5. Ký số điện tử bằng chứng thư X.509 của Mekobook CA để chống sửa đổi lậu.
  6. Lưu vào bảng `C_MekoDrmLicense` và tự động hiển thị cuốn sách trong tab *"Tủ sách của tôi"* trên Mobile App.

---

### PHÂN HỆ 3: TRÌNH ĐỌC FLIPBOOK 3D & TRẢI NGHIỆM ĐỘC GIẢ (MOBILE VIEWER)

#### 3.1. Hiệu ứng Lật trang 3D Chân thực (60 FPS Page Turn Engine)
* **Mô tả:** Trải nghiệm lật sách trực quan mô phỏng sách giấy thật, là linh hồn của dự án Mekobook.
* **Hành vi tương tác:**
  * **Vuốt nhanh (Swipe):** Chuyển ngay sang trang trước hoặc trang kế tiếp.
  * **Chạm mép màn hình (Edge Tap):** Chạm 20% mép phải để sang trang, 20% mép trái để lùi trang. Chạm 60% vùng giữa để bật/tắt thanh công cụ.
  * **Kéo uốn cong (Drag & Curl):** Độc giả có thể giữ ngón tay vào góc trang sách và kéo rê; góc sách sẽ uốn cong 3D theo đúng quỹ đạo ngón tay, lộ dần nội dung trang kế tiếp kèm đổ bóng cong (Page Curl Shadow) và phản xạ ánh sáng chân thực.
* **Tiêu chuẩn hiệu năng:** Tốc độ khung hình duy trì ổn định **60 FPS**. Trang kế tiếp được tải trước (Pre-fetch buffer) để không bao giờ xuất hiện màn hình trắng khi lật.

#### 3.2. Chế độ Xem Trang Đơn & Trang Đôi (Single & Double Spread)
* **Mô tả:** Tự động hoặc thủ công điều chỉnh bố cục đọc:
  * **Chế độ Trang Đơn (Single Page):** Tối ưu cho điện thoại cầm dọc (Portrait).
  * **Chế độ Trang Đôi (Double Spread):** Tối ưu cho Máy tính bảng (Tablet/iPad) hoặc khi người dùng xoay ngang điện thoại (Landscape), hiển thị 2 trang sách mở ra như một cuốn sách thật.

#### 3.3. Phóng to Thu nhỏ & Kéo trang Đa điểm (Pinch-to-Zoom & Pan)
* **Mô tả:** Phóng to chi tiết hình vẽ, sơ đồ hoặc cỡ chữ trên trang sách.
* **Hành vi:**
  * Thao tác 2 ngón tay (Pinch to Zoom) hoặc Chạm đúp (Double tap) để phóng to lên 2x, 3x, 4x.
  * Khi đang ở trạng thái Zoom: Tạm thời khóa thao tác lật trang, cho phép kéo 1 ngón tay để di chuyển (Pan) quan sát các góc của trang sách. Khi thu nhỏ về 1x, kích hoạt lại cử chỉ lật trang 3D.
  * Khi phóng to trên 2x: Tự động kích hoạt nạp mảnh ảnh siêu nét (**Deep-Zoom Tiles**) từ `zoomTileBaseUrl` để tránh vỡ nét ảnh.

#### 3.4. Điều hướng Mục lục, Nhập trang & Thumbnail Scrubber
* **Mục lục phân cấp (TOC Drawer):** Mở danh sách chương mục từ cạnh trái; chương chứa trang hiện tại được highlight nổi bật. Bấm vào mục nào thì Flipbook tự động lật nhanh đến trang đó.
* **Nhảy đến trang bất kỳ:** Thanh trượt tiến trình (Progress slider) kéo đến đâu hiện số trang và ảnh thumbnail xem trước đến đó. Hỗ trợ hộp thoại nhập trực tiếp số trang (Ví dụ: Nhập `85` ➔ Lật đến trang 85).
* **Lưới ảnh thu nhỏ (Thumbnail Grid):** Xem tổng quan toàn bộ cuốn sách dạng lưới thu nhỏ 20-30 trang trên một màn hình để duyệt nhanh.

#### 3.5. Tùy chỉnh Cá nhân hóa Giao diện Đọc
* **Chế độ màu:** Hỗ trợ 4 theme: *Sáng (Light)*, *Tối (Dark)*, *Vàng dịu mắt (Sepia)*, và *Tự động theo hệ điều hành (System)*.
* **Âm thanh lật sách chân thực:** Phát âm thanh tiếng sột soạt lật giấy được thu âm độ nét cao khi lật trang; có công tắc bật/tắt trong cài đặt.
* **Thanh công cụ thông minh:** Tự động ẩn toàn bộ header/footer sau 3 giây để người đọc hoàn toàn tập trung vào nội dung; chạm nhẹ vào giữa màn hình để hiện lại.
* **Độ sáng độc lập:** Cho phép vuốt chỉnh độ sáng vùng đọc ngay trong app mà không làm ảnh hưởng đến độ sáng chung của hệ điều hành.

---

### PHÂN HỆ 4: TƯƠNG TÁC ĐỌC & ĐỒNG BỘ ĐÁM MÂY (SYNC & INTERACTIONS)

#### 4.1. Đánh dấu Trang (Bookmarks Management)
* **Mô tả:** Người đọc bấm vào biểu tượng Bookmark trên thanh công cụ để đánh dấu trang quan trọng.
* **Dữ liệu ghi nhận:** Số trang, tên chương tương ứng, ảnh thumbnail thu nhỏ của trang đó, nhãn màu sắc và thời điểm đánh dấu.
* **Quản lý:** Danh sách Bookmark cho phép xem lại nhanh, chạm để lật tới trang, hoặc vuốt sang trái để xóa.

#### 4.2. Tô Sáng, Ghi Chú & Vẽ Hình Tự Do (Annotations & Stylus Canvas)
* **Mô tả:** Hiện thực hóa trọn vẹn yêu cầu chức năng 4.2 của sinh viên: *"Cho phép đánh dấu, vẽ, tô màu lên văn bản cần chú ý (hệ tọa độ)"*.
* **Hỗ trợ 3 công cụ tương tác trên 3D Canvas:**
  1. **Bút Highlight:** Kéo ngón tay để tạo vệt màu bán trong suốt đè lên đoạn văn bản cần chú ý (màu vàng, xanh lục, hồng).
  2. **Bút vẽ tự do (Drawing Pen / Stylus):** Cho phép dùng ngón tay hoặc bút cảm ứng (Apple Pencil / S-Pen) vẽ, khoanh tròn, ghi chú trực tiếp lên bề mặt trang sách. Dữ liệu được lưu dưới dạng chuỗi vector tọa độ chuẩn hóa $(x, y)$ từ $0.0$ đến $1.0$ theo tỷ lệ trang (đảm bảo hiển thị chuẩn xác trên mọi kích thước màn hình điện thoại/tablet).
  3. **Giấy ghi chú (Sticky Note):** Đặt một biểu tượng ghi chú tại tọa độ bất kỳ; chạm vào để mở popup nhập văn bản nhận xét/cảm nghĩ của người đọc.

#### 4.3. Lưu & Khôi phục Tiến trình Đọc (Reading Progress Sync)
* **Mô tả:** Đảm bảo trải nghiệm đọc liền mạch: đóng app ở trang nào, mở lại đúng trang đó; chuyển sang thiết bị khác (từ điện thoại sang iPad) vẫn tiếp tục đọc tiếp chính xác.
* **Quy trình hoạt động:**
  * **Lưu cục bộ tức thì (Local First):** Mỗi khi người đọc lật sang trang mới, số trang và % hoàn thành được ghi tức thì vào bộ nhớ đệm siêu tốc `MMKV/SQLite` trên máy (<1ms, không làm khựng chuyển động 3D).
  * **Đồng bộ nền lên Liferay Object (`C_MekoReadingProgress`):** Cứ mỗi 10 giây hoặc khi đóng sách, ứng dụng tự động đẩy dữ liệu lên server.
  * **Giải quyết xung đột (Conflict Resolution):** Khi mở sách, app so sánh `lastReadTimestamp` giữa bộ nhớ máy và server; thiết bị có mốc thời gian mới nhất (Last-Write-Wins) sẽ được ưu tiên, kèm thông báo: *"Khôi phục trang đọc gần nhất từ iPad: Trang 42 (35%)"*.

---

### PHÂN HỆ 5: QUẢN LÝ NGOẠI TUYẾN & BẢO MẬT DRM CHỐNG SAO CHÉP

#### 5.1. Quản lý Tải Sách Ngoại Tuyến (Offline Download Manager)
* **Mô tả:** Cho phép người dùng tải toàn bộ cuốn sách về máy để đọc khi đi máy bay, tàu xe hoặc nơi không có kết nối Internet.
* **Xử lý kỹ thuật:**
  * Tải ngầm (Background download) hiển thị thanh % tiến độ và dung lượng đã tải (ví dụ: `24MB / 38MB - 63%`).
  * Hỗ trợ tạm dừng (Pause), tiếp tục (Resume) khi mất sóng.
  * Toàn bộ các trang ảnh và manifest được server đóng gói trong một file bundle mã hóa duy nhất **`.meko`**.
  * File lưu trong thư mục Sandbox riêng tư của ứng dụng (Internal Storage), các ứng dụng File Manager ngoài hoàn toàn không thể truy cập.

#### 5.2. Giải mã Trực tiếp trong Bộ nhớ (In-Memory AES-256 Decryption)
* **Mô tả:** Cơ chế then chốt bảo vệ bản quyền: **Không bao giờ xuất file PDF thô hoặc ảnh thô ra ổ cứng máy.**
* **Nguyên lý:**
  1. Khóa giải mã được trích xuất từ Hardware Keystore / KeyChain của thiết bị sau khi xác thực hợp lệ với License DRM.
  2. Khi người đọc lật đến trang nào, khối dữ liệu nhị phân của trang đó mới được nạp vào RAM, giải mã bằng thuật toán AES-256-CBC thành texture ảnh và đưa thẳng lên GPU hiển thị.
  3. Khi lật qua trang khác, texture trang cũ lập tức bị giải phóng (Garbage Collected) khỏi RAM.

#### 5.3. Chống Chụp và Quay Màn hình Thiết bị (Screen Capture Protection)
* **Trên Android:** Bật cờ `WindowManager.LayoutParams.FLAG_SECURE` trên toàn bộ Activity đọc sách. Nếu người dùng bấm phím chụp màn hình hoặc dùng app quay màn hình, hệ điều hành sẽ chặn và chỉ ghi nhận màn hình đen tuyền.
* **Trên iOS:** Lồng giao diện đọc sách bên trong một `UITextField(isSecureTextEntry = true)` container hoặc lắng nghe sự kiện `UIScreen.capturedDidChangeNotification` để tự động làm mờ (Blur) màn hình khi phát hiện đang quay video màn hình hoặc AirPlay trái phép.

#### 5.4. Nhúng Watermark Pháp lý Cá nhân hóa Động (Forensic Dynamic Watermark)
* **Mô tả:** Biện pháp tối thượng chống lại việc người dùng dùng một chiếc điện thoại khác chụp lại màn hình sách để bán lại ra chợ đen.
* **Cách thức hiển thị:**
  * Lớp phủ mờ (độ trong suốt ~12%, không gây mỏi mắt người đọc) chạy chéo góc $45^\circ$ trên từng trang sách 3D.
  * Nội dung Watermark lấy động từ thông tin người mua:  
    `Bản quyền thuộc về: Nguyễn Văn A • Email: nguyenvana@mekosoft.vn • Đơn hàng: ORD-2026-88992 • IP: 14.162.x.x`
  * Dù có dùng camera ngoài chụp lại thì hình ảnh vẫn in hằn danh tính và mã đơn hàng của chính người mua, giúp truy vết pháp lý ngay lập tức.

#### 5.5. Quản lý Giới hạn Thiết bị & Thu hồi Bản quyền từ xa (Device Attribution & Remote Revocation)
* Mỗi tài khoản chỉ được phép kích hoạt đọc sách offline trên **tối đa 3 thiết bị** cùng lúc (`maxDevices = 3`).
* Bảng `C_MekoDeviceRegistration` lưu UUID phần cứng của từng máy. Nếu người dùng đăng nhập trên máy thứ 4, hệ thống yêu cầu: *"Vui lòng hủy kích hoạt bớt 1 thiết bị cũ trên web để kích hoạt máy mới này"*.
* **Thu hồi từ xa (Remote Revocation):** Nếu phát hiện tài khoản có dấu hiệu gian lận hoặc hoàn tiền đơn hàng, Admin chuyển trạng thái License sang `REVOKED`. Lần kế tiếp app kết nối mạng, sách sẽ tự động bị xóa khỏi bộ nhớ máy.

---

### PHÂN HỆ 6: KIẾN TRÚC MỞ RỘNG ĐA ĐỊNH DẠNG (UNIVERSAL READER)

Để đáp ứng định hướng chiến lược tương lai (bán cả PDF chuyên khảo, EPUB chữ động, Audiobook):
* **Cấu trúc Dữ liệu Độc lập Định dạng:** Toàn bộ bảng `C_MekoBook` sử dụng trường `formatType` (`FLIPBOOK_3D`, `PDF`, `EPUB_REFLOWABLE`, `AUDIOBOOK`).
* **Sử dụng Chuẩn Readium Locator:** Vị trí đọc và Bookmark lưu thêm trường `locatorJson` (chứa tọa độ đoạn văn bản CFI cho EPUB hoặc mốc thời gian giây cho Audiobook).
* **Mô hình Engine Factory trên Mobile:** Ứng dụng bọc ngoài dùng chung 100% (Auth, Store, DRM, License, Bookmark list). Bên trong chỉ cần hoán đổi Component Viewer tương ứng:
  * Nếu là `FLIPBOOK_3D` $\rightarrow$ Nạp bộ uốn trang 3D WebP Mesh.
  * Nếu là `PDF` $\rightarrow$ Nạp bộ đọc PDF cuộn liên tục vector.
  * Nếu là `EPUB` $\rightarrow$ Nạp bộ dàn trang HTML/CSS đổi cỡ chữ, phông chữ.
  * Nếu là `AUDIOBOOK` $\rightarrow$ Nạp Audio Player có thanh tiến trình sóng âm.

---

## 5. CÁC YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)

1. **Hiệu năng Khung hình (Frame Rate):**
   * Hiệu ứng lật trang 3D phải luôn duy trì ổn định ở mức **60 FPS**, không bị drop khung hình dưới 50 FPS trên các thiết bị tầm trung (Android Ram 4GB, iPhone 11 trở lên).
2. **Thời gian Khởi động & Mở sách:**
   * Thời gian nạp manifest và hiển thị trang đầu tiên từ lúc người dùng bấm "Đọc sách" phải **dưới 1.5 giây** (mạng 4G/Wifi tiêu chuẩn).
3. **Tiêu thụ Bộ nhớ (RAM Usage):**
   * Lượng RAM tiêu thụ tối đa của Flipbook Viewer khi đọc liên tục không được vượt quá **45MB** nhờ cơ chế dọn dẹp texture (Garbage Collect) các trang đã lật qua.
4. **Bảo mật An toàn Thông tin:**
   * Toàn bộ API truyền thông qua giao thức HTTPS có gắn kèm token OAuth 2.0.
   * Dữ liệu sách lưu trữ offline bắt buộc phải mã hóa bằng thuật toán chuẩn quân đội **AES-256-CBC/GCM**; khóa giải mã lưu trong Secure Enclave / Android KeyStore.
5. **Khả năng tương thích Thiết bị:**
   * Hỗ trợ tối thiểu từ Android 8.0 (API Level 26) và iOS 14.0 trở lên.
   * Tự động đáp ứng giao diện trên cả màn hình điện thoại thông minh (Phone) và máy tính bảng (Tablet/iPad).
