# TÀI LIỆU KỸ THUẬT TRIỂN KHAI VÀ VẬN HÀNH LIFERAY 7.4 GA132 (STAGING SERVER)

---

## 1. Thông Tin Máy Chủ / VM

Máy chủ STAGING được cài đặt trên máy ảo Ubuntu chạy trong môi trường Proxmox.

| Hạng mục | Giá trị |
| --- | --- |
| Môi trường ảo hóa | Proxmox |
| Hệ điều hành | Ubuntu 24.04.3 LTS (Noble Numbat) |
| IP máy ảo | 192.168.1.254 |
| User hệ điều hành | ubuntu |
| Thư mục cài đặt chính | /opt/app |
| Java runtime | OpenJDK 17 LTS (build 17.0.20.1) |
| Dung lượng ổ đĩa | 47GB |
| Dung lượng đã sử dụng | khoảng 8GB |
| Dung lượng còn trống | khoảng 39GB |

### Thông tin SSH

| Hạng mục | Giá trị |
| --- | --- |
| SSH host | 192.168.1.254 |
| SSH port | 22 |
| SSH user | ubuntu / admin |
| Quyền root (sudo) | `sudo su` (Password: admin) |
| Cách truy cập | SSH nội bộ trong mạng LAN |

Lệnh SSH mẫu:
```bash
ssh ubuntu@192.168.1.254
```
Hoặc dùng các công cụ như PuTTY, Termius, MobaXterm để truy cập.

---

## 2. Thông Tin Liferay

| Hạng mục | Giá trị |
| --- | --- |
| Phiên bản | Liferay Portal CE 7.4.3.132 GA132 |
| Java khuyến nghị | OpenJDK 17 LTS |
| Liferay Home | /opt/app/liferay-portal |
| Tomcat Home | /opt/app/liferay-portal/tomcat |
| File cấu hình chính | /opt/app/liferay-portal/portal-ext.properties |
| URL truy cập | http://192.168.1.254:8080 |
| Port | 8080 |
| Cách chạy | Dịch vụ nền systemd: `systemctl status liferay` |

### Tài khoản quản trị Liferay

| Hạng mục | Giá trị |
| --- | --- |
| Email đăng nhập | test@mekosoft.vn |
| Mật khẩu mặc định | admin |
| Setup Wizard | Đã tắt bằng `setup.wizard.enabled=false` |

---

## 3. Thông Tin PostgreSQL

| Hạng mục | Giá trị |
| --- | --- |
| Phiên bản | PostgreSQL 16 Server |
| Service | postgresql |
| Port | 5432 |
| Host local | localhost |
| Host LAN | 192.168.1.254 |
| Database Liferay | lportal |
| User database | liferay |
| Password | liferay@123 |
| File cấu hình chính | /etc/postgresql/16/main/postgresql.conf |
| File phân quyền truy cập | /etc/postgresql/16/main/pg_hba.conf |

### Kết nối PostgreSQL

Kết nối từ chính VM:
```bash
psql -h localhost -U liferay -d lportal
```

Kết nối qua IP LAN:
```bash
psql -h 192.168.1.254 -U liferay -d lportal
```
Password:
```text
liferay@123
```

PostgreSQL đã được cấu hình listen LAN:
```text
0.0.0.0:5432
[::]:5432
```

---

## 4. Thông Tin pgAdmin (Tùy Chọn Quản Trị Web)

| Hạng mục | Giá trị |
| --- | --- |
| Công cụ | pgAdmin 4 web |
| Web server | Apache2 |
| URL truy cập | http://192.168.1.254/pgadmin4 |
| Port | 80 |
| Email admin | admin@local.com |
| Password | admin@123 |

### Cấu hình server PostgreSQL trong pgAdmin

Trong pgAdmin tạo server mới với thông tin:

| Hạng mục | Giá trị |
| --- | --- |
| Name | Local PostgreSQL |
| Host name/address | 127.0.0.1 |
| Port | 5432 |
| Maintenance database | lportal |
| Username | liferay |
| Password | liferay@123 |
| Save password | Bật |

Do pgAdmin và PostgreSQL chạy cùng VM nên dùng 127.0.0.1 là phù hợp nhất.

---

## 5. Thông Tin Thư Mục Quan Trọng

| Đường dẫn | Ý nghĩa |
| --- | --- |
| /opt/app | Thư mục gốc chứa ứng dụng |
| /opt/app/liferay-portal | Liferay Home |
| /opt/app/liferay-portal/portal-ext.properties | File cấu hình chính của Liferay |
| /opt/app/liferay-portal/tomcat | Tomcat bundle đi kèm Liferay |
| /opt/app/liferay-portal/tomcat/bin | Chứa script start/stop, setenv.sh |
| /opt/app/liferay-portal/tomcat/logs/catalina.out | Log chính của Tomcat / Liferay |
| /opt/app/liferay-portal/logs | Log Liferay |
| /opt/app/liferay-portal/deploy | Thư mục deploy module / theme |
| /opt/app/liferay-portal/osgi/modules | Module OSGi mở rộng |
| /opt/app/liferay-portal/osgi/configs | File cấu hình OSGi động |
| /opt/app/liferay-portal/data | Data runtime của Liferay (kho Documents & Media) |
| /opt/app/liferay-portal/elasticsearch-sidecar | Elasticsearch sidecar local |
| /opt/app/download | Thư mục chứa file cài đặt tải về |

---

## 6. Tổng Hợp URL Truy Cập

| Dịch vụ | URL | Ghi chú |
| --- | --- | --- |
| **Liferay Public Domain (ngrok)** | **https://serrated-catacomb-vendor.ngrok-free.dev** | Dành cho DEV truy cập qua Internet / HTTPS |
| **Liferay Portal LAN** | http://192.168.1.254:8080 | Truy cập nội bộ mạng LAN |
| **Kho Static Webapps (Flipbooks)** | http://192.168.1.254:8080/flipbooks/ | Phục vụ trực tiếp ảnh trang lật 3D & bìa sách |
| **Headless REST API Books** | http://192.168.1.254:8080/o/c/books | Endpoint danh mục sách (20 cuốn demo) |
| **Headless REST API Kệ sách** | http://192.168.1.254:8080/o/c/personalshelfs | Endpoint kệ sách cá nhân của độc giả |
| **Headless REST API Bản quyền** | http://192.168.1.254:8080/o/c/drmlicenses | Endpoint tủ sách sở hữu DRM của độc giả |
| **PostgreSQL LAN** | 192.168.1.254:5432 | Port kết nối Database |
| **SSH Server** | ssh ubuntu@192.168.1.254 | Port 22 |

---

## 6.1. Quy Hoạch & Hướng Dẫn Truy Cập Documents & Media (D&M)

Toàn bộ kho tài liệu số của Mekobook được lưu trữ trên Site mặc định mang tên **`Liferay`** (Site ID: **`20117`**, Friendly URL: `/web/guest`).

### Cấu trúc cây thư mục trong Documents & Media:
```
Mekobook Library/ (Thư mục gốc ID: 32804)
├── Covers/        (Folder ID: 32806) -> 20 ảnh bìa sách Mekosoft chuẩn tiếng Việt có dấu
├── Originals/     (Folder ID: 32808) -> 20 tệp PDF gốc 35 - 90 trang, font Arial tiếng Việt
└── Zips/          (Folder ID: 32810) -> Thư mục lưu trữ các gói tài liệu nén FlipBuilder .zip
```

### Các bước xem trên giao diện quản trị Liferay:
1. Đăng nhập Liferay với quyền Admin (`test` / `admin`).
2. Mở thanh **Product Menu** (biểu tượng menu góc trên bên trái).
3. Đảm bảo mục chọn Site ở trên cùng đang là **Liferay**.
4. Vào mục **Content & Data** -> Bấm chọn **Documents and Media**.
5. Nhấp vào thư mục **Mekobook Library** để duyệt ảnh bìa trong `Covers` và file PDF trong `Originals`.

---

## 7. Các Lệnh Vận Hành Nhanh Cho Dev & Ops

### Quản lý dịch vụ ngrok (Tunnel Internet)
```bash
# Xem trạng thái ngrok
sudo systemctl status ngrok

# Khởi động lại ngrok
sudo systemctl restart ngrok

# Kiểm tra URL public hiện tại của ngrok qua API nội bộ
curl -s http://127.0.0.1:4040/api/tunnels | jq .
```

### Quản lý dịch vụ Liferay qua Systemd
```bash
# Xem trạng thái Liferay
sudo systemctl status liferay

# Khởi động Liferay
sudo systemctl start liferay

# Dừng Liferay
sudo systemctl stop liferay

# Khởi động lại Liferay
sudo systemctl restart liferay

# Xem log Liferay thời gian thực
tail -f /opt/app/liferay-portal/tomcat/logs/catalina.out
```

### Quản lý dịch vụ PostgreSQL
```bash
# Xem trạng thái PostgreSQL
sudo systemctl status postgresql

# Khởi động lại PostgreSQL
sudo systemctl restart postgresql
```
