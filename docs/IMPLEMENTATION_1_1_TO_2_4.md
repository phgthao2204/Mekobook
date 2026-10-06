# Chức năng 1.1 đến 2.4

## Phạm vi triển khai

- React Native Expo SDK 57; Axios; React Navigation native stack; Ionicons; nút native từ @expo/ui.
- Source: component, constants, hooks, navigation, screens, services, types, utils.
- Giữ thư viện, màn hình đăng nhập và StPageFlip của base; chuyển màn hình từ components sang screens.
- 1.1: OAuth password grant, lưu phiên trong SecureStore, gia hạn chủ động và thử lại API một lần sau 401; các request đồng thời dùng chung một lượt gia hạn.
- 1.2: thư viện API phân trang, tìm tên/tác giả, lưới/danh sách, tiến trình; lỗi API được hiển thị, không thay bằng sách mẫu.
- 1.3: chi tiết sách, năm xuất bản, tiến trình, thông tin giấy phép.
- 1.4: kiểm tra lại quyền khi mở; miễn phí hoặc giấy phép ACTIVE mới được mở; bắt đầu, đọc tiếp, đọc lại.
- 2.1: lấy metadata/cấu hình/quyền qua API; chờ ảnh trang được chọn tải thành công trước khi báo sẵn sàng; lỗi/timeout có thử lại và quay về.
- 2.2: StPageFlip nhúng sẵn, chuyển trang bằng thao tác và nút; tải trước cửa sổ trang lân cận. initialPage không đổi theo currentPage nên không reload engine khi lật.
- 2.3: nút zoom 100/150/200/300%; kéo nội dung có giới hạn khi zoom; ngăn thao tác kéo zoom gây lật trang.
- 2.4: lấy themeMode, brightness, pageTurnEffect, pageTurnSoundEnabled, dualPageMode từ User Preference API. SYSTEM lấy theme thiết bị khi mở sách; âm thanh được tổng hợp cục bộ. Không thêm API ghi cấu hình.

## Cấu hình và giới hạn

- Domain dev theo API Docs: https://serrated-catacomb-vendor.ngrok-free.dev. Đây là tunnel, có thể hết hạn.
- .env không được commit; .env.example không chứa secret. EXPO_PUBLIC_ được nhúng công khai vào bundle.
- Backend hiện đặc tả password grant với confidential client secret. Người dùng đã chấp nhận rủi ro và secret được cấu hình trong .env cục bộ cho dev nội bộ, không commit giá trị. Người dùng đã cho phép kiểm tra login/refresh và đọc API tại domain khách. Production cần cơ chế public client/proxy phù hợp. Không âm thầm chuyển sang client_credentials thay cho tài khoản độc giả.
- API docs chỉ đặc tả GET readingprogresses. Không gọi POST/PATCH lưu tiến trình chưa được đặc tả; đọc lại chỉ chọn trang 1, không xóa tiến trình server. Cần hợp đồng API bổ sung nếu muốn lưu/đồng bộ.
- Không triển khai mới các phân hệ 3–5; mục lục đã có ở base được giữ lại.
- Metadata mẫu trong tài liệu không chứng minh server thực tế hỗ trợ đúng schema. Quyền đọc vẫn phải được backend thực thi; kiểm tra trên ứng dụng không thay thế DRM phía server.
- Các ảnh trang trong WebView phải truy cập được từ content server; không nhúng Bearer token vào HTML hoặc URL ảnh. Nếu ảnh yêu cầu token, cần cơ chế URL ký/cookie hoặc proxy được backend cung cấp.

## Kiểm thử

```powershell
npm run typecheck
npm test
npx expo install --check
npx expo export --platform android --output-dir dist-acceptance
```

Các test dùng adapter HTTP và dữ liệu giả lập chỉ trong tests; ứng dụng không dùng fallback sách giả. Cần nghiệm thu thực tế trên Android/iOS với server cho đăng nhập, vuốt/kéo 3D, zoom/pan, âm thanh và hiển thị hai trang.

Kiểm tra hiện tại: TypeScript đạt, 20/20 test đạt, dependency khớp Expo SDK. Bộ test xác thực dùng credential tổng hợp, bao gồm đăng nhập/khôi phục/gia hạn/đăng xuất, refresh trả muộn sau logout, credential sai và refresh token thiếu/hết hạn. Chưa nghiệm thu thao tác thiết bị thật. Người dùng đã yêu cầu commit lên dev với các giới hạn backend/nghiệm thu đã báo; commit không đồng nghĩa đã đạt nghiệm thu end-to-end.

Kiểm tra API trực tiếp: login và refresh trả 200; Books, DRM, Reading Progress trả 200; User Preferences trả 200 nhưng danh sách rỗng. My User Account trả 403, cần backend kiểm tra scope/quyền cho tài khoản. Đã xác định lỗi invalid_grant ở lượt kiểm tra lại do dùng credential ví dụ trong phần hướng dẫn thay cho tài khoản thử nghiệm ở đầu tài liệu; dùng đúng tài khoản thử nghiệm thì thành công.

Đã chạy `scripts/check-api.cjs` qua chính các service của ứng dụng: login/refresh thành công, 20 sách thực tế, chuẩn bị sách miễn phí từ tiến trình API và tải ảnh trang HTTP 200 image/jpeg. Script chỉ đọc dữ liệu, SecureStore giả lập trong bộ nhớ và không in credential/token. Tài khoản thử nghiệm được truyền qua biến môi trường tiến trình MEKOBOOK_TEST_USERNAME/MEKOBOOK_TEST_PASSWORD, không lưu trong source.

API trả URL ảnh từ http://192.168.1.254:8080 (alias của Liferay theo deployment docs). Đã chuẩn hóa riêng alias này và localhost sang domain API công khai; không thay các host bên ngoài khác. Bìa và ảnh trang mẫu qua domain ngrok trả 200 kể cả không gửi Bearer. Chưa chứng minh tất cả trang/sách đều tải được hoặc DRM phía server thực thi đầy đủ.

DRM thực tế trả `status` dạng object workflow của Liferay, khác chuỗi ACTIVE/EXPIRED trong tài liệu. Ứng dụng chuẩn hóa thành UNKNOWN và hiển thị thiếu trạng thái hiệu lực, tránh lỗi render object. Không xem workflow approved hoặc chỉ ngày bắt đầu/kết thúc là bằng chứng quyền đọc. Sách trả phí bị chặn khi chưa xác nhận giấy phép; backend cần cung cấp trường trạng thái DRM đúng hợp đồng. Không ghi token, password hay secret trong báo cáo.

Dependency đã cài trực tiếp trong repo bằng npm ci sau khi giải phóng dung lượng ổ D; không còn dùng junction. Export Android và iOS đã chạy lại thành công sau sửa URL và chuẩn hóa DRM. Bundle export chỉ xác nhận đóng gói JavaScript/assets, không phải APK/IPA hay kiểm thử thiết bị thật.

## Thay đổi so với yêu cầu ban đầu

Sửa lỗi ảnh trang web: ngrok trả HTML cảnh báo khi nhận User-Agent Safari dù URL ảnh trả HTTP 200. Dev media proxy /__mekobook_media chỉ chuyển tiếp GET/HEAD ảnh JPEG/PNG/WebP trong /flipbooks/ trên domain đã phê duyệt, thêm ngrok-skip-browser-warning và không chuyển tiếp Bearer/cookie. URL ảnh bìa/trang/thumbnail được đổi sang URL proxy tuyệt đối chỉ trên web __DEV__; native và web production giữ URL nội dung server. Đã kiểm tra GET ảnh trang 2/3 giống Safari qua proxy trả 200 image/jpeg với bytes JPEG thật. Chưa nghiệm thu trực quan bằng MCP do lỗi sandbox runtime. Production cần content server không có trang cảnh báo ngrok; không dùng proxy Metro production.

Sau khi test web: OPTIONS của Books/Reading Progress thiếu header CORS, dù OAuth OPTIONS cho phép origin localhost. Đã bổ sung proxy chỉ trong Metro dev tại /__mekobook_api và interceptor chỉ bật trên browser __DEV__. Proxy cố định domain thử nghiệm được phê duyệt, chỉ GET API trong scope và POST OAuth token; không chuyển tiếp API ghi tiến trình, domain tùy ý hoặc cookie. Đã xác nhận qua proxy: login 200, Books 200/20 cuốn, Reading Progress 200. Production web cần backend cấu hình CORS đúng hoặc backend-for-frontend; proxy này không nằm trong web export.

Theo yêu cầu test bằng URL: đã thêm react-native-web, iframe StPageFlip dành riêng cho web và sessionStorage dành riêng cho phiên dev web. Native tiếp tục dùng WebView/SecureStore. Chạy `npx expo start --web --lan`; localhost:8081 đã trả HTTP 200 và Metro bundle web thành công. Preflight OAuth từ origin localhost:8081 được backend chấp nhận. Chưa nghiệm thu thao tác UI trình đọc web; công cụ kiểm tra trình duyệt chưa khởi tạo được. Token trong sessionStorage không được mã hóa và OAuth secret trong bundle có thể đọc được: chỉ test nội bộ, không công bố bản này như bản production.

Yêu cầu ban đầu là JSON và bộ nhớ thiết bị, không backend. Việc chuyển repo/kiến trúc, OAuth và tích hợp API là phần chuyển đổi bổ sung. Tài khoản, quyền DRM, ghi chú/vùng đánh dấu, tủ sách cá nhân và danh sách thiết bị là chức năng mới so với bản đầu. Zoom, chế độ một/hai trang, theme/độ sáng/âm thanh và trạng thái tải đã nằm trong bản đầu; chỉ nguồn dữ liệu/cách tích hợp thay đổi.
