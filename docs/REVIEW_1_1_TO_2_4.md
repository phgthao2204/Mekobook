# Rà soát đặc tả 1.1–2.4 — 07/10/2026

Phạm vi: ứng dụng Mekobook, giữ base và các bổ sung đã có tại commit 4346d89. Không triển khai phân hệ 3–5, không ghi tiến trình hoặc cấu hình khi chưa có hợp đồng API.

| Mục | Đã có / đã hoàn thiện ở ứng dụng | Giới hạn nghiệm thu |
| --- | --- | --- |
| 1.1 | OAuth, refresh, khôi phục phiên, đăng xuất, màn hình tài khoản và tải lại hồ sơ | Login/refresh live đạt; API hồ sơ vẫn trả 403. Không giả lập họ tên/email để coi là đạt. |
| 1.2 | Sách từ API, phân trang, tìm kiếm, lưới/danh sách, tiến trình | API có 20 sách. Sửa lỗi tiến trình lỗi làm mất cả thư viện; trạng thái thiếu dữ liệu được ghi rõ, không coi là chưa đọc. Hiển thị tiến trình cả trang 1. |
| 1.3 | Metadata, năm xuất bản nếu API cung cấp, tiến trình, giấy phép | Metadata vẫn xem được khi API phụ lỗi; quyền sách trả phí đóng khi không kiểm tra được. API thực tế thiếu năm xuất bản và trả workflow status thay DRM status. |
| 1.4 | Bắt đầu, tiếp tục, đọc lại, kiểm tra lại quyền khi mở | Sửa đọc tiếp/đọc lại cho tiến trình trang 1. Không tự đoán trang tiếp tục nếu API tiến trình lỗi. Sách trả phí còn chờ hợp đồng trạng thái DRM. |
| 2.1 | Mở trang đã chọn, tải ảnh, tên/trang/tổng trang/tỷ lệ, lỗi và thử lại | Live metadata/ảnh JPEG đạt. Thử lại giữ trang hiện tại thay vì quay về trang mở ban đầu. Chưa nghiệm thu trực quan trên thiết bị thật. |
| 2.2 | StPageFlip, bóng/uốn trang, vuốt/kéo/nút, tải trước trang lân cận | Sửa lỗi tải trước trang lân cận làm che trang hiện tại; hủy fetch lỗi thời và thu hồi blob URL. Refresh token native không reload sách về trang cũ. Không khẳng định 60 FPS khi chưa đo. |
| 2.3 | Zoom 100/150/200/300%, kéo giới hạn, tránh kéo zoom thành lật trang | Logic đã có test bridge; cần thao tác thiết bị thật. Đặc tả không bắt buộc pinch-to-zoom. |
| 2.4 | Đọc cấu hình theme/độ sáng/hiệu ứng/âm thanh/một-hai trang, SYSTEM lấy theme khi mở | Sửa màu nút quay lại/zoom cho DARK và SEPIA. API cấu hình rỗng nên mặc định được áp dụng; chưa chứng minh cấu hình thật/âm thanh trên thiết bị. |

## Những sửa đổi trong đợt này

- Giữ nguyên profile và tải ảnh có xác thực đã có ở base mới.
- Phân biệt lỗi API phụ với thiếu dữ liệu hợp lệ; không bỏ qua quyền DRM của sách trả phí.
- Không reload native engine khi token đổi; gửi token mới qua bridge, không đặt token trong URL.
- Từ chối response HTML khi fetch yêu cầu ảnh; bỏ qua lỗi preload ngoài trang đang đọc.
- Hủy fetch ảnh ra khỏi cửa sổ tải trước; không nhận kết quả cũ hoặc cấp blob URL sau khi hủy.
- Bổ sung test trang 1, lỗi API phụ và vòng đời tải ảnh có token.

## Kiểm chứng và điều kiện bàn giao

- TypeScript đạt, 24/24 test đạt và `git diff --check` đạt sau sửa đổi; test không dùng credential thật.
- Export JavaScript/assets cho Android, iOS và web thành công sau lượt sửa cuối.
- Kiểm tra read-only qua service thật: login/refresh thành công; 20 sách; ảnh trang image/jpeg; profile 403; cấu hình đọc 0 bản ghi; giấy phép trả workflow object.
- Không sửa quyền máy chủ, không POST/PATCH readingprogresses. Người dùng đã yêu cầu commit các sửa đổi lên dev ngày 08/10/2026; commit không thay thế nghiệm thu các phần còn phụ thuộc backend/thiết bị.
- Export JavaScript/assets không thay thế APK/IPA hoặc nghiệm thu thao tác UI. Không đánh dấu 8/8 đã nghiệm thu hoàn toàn khi những giới hạn trên còn tồn tại.
- Backend cần cấp quyền hồ sơ và trả trạng thái hiệu lực giấy phép theo đặc tả (ACTIVE/EXPIRED hoặc hợp đồng thay thế rõ ràng), bổ sung dữ liệu cấu hình/năm xuất bản nếu cần nghiệm thu các trường này.
