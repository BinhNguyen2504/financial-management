# Rà soát UI/UX — 17/10/2026

Giữ phong cách Zen, bảng Chi tiêu trên desktop và thẻ trên điện thoại.

- Bảng: tiêu đề cột tiền và giá trị cùng căn phải; số dùng tabular numerals. Ô tiền và nhóm thao tác căn giữa theo chiều cao dòng. Cột thao tác giữ vị trí nút sửa thống nhất, có chỗ cho Dùng tiền. Bảng rộng cuộn trong vùng riêng.
- Thu nhập: tên/mô tả, số tiền và nút thao tác có vùng riêng trên desktop; xếp dọc trên điện thoại. Không lặp lại ghi chú khi nội dung giống mô tả. Giảm chiều cao dòng tổng tiền và khoảng trống không cần thiết ở phần đầu trang.
- Thông báo lỗi: chữ và nút thử lại cách nhau rõ ràng, tự xuống hàng trên màn hình nhỏ. Thử lại tải dữ liệu mà không chuyển khỏi trang.
- Dialog dùng chung: bấm nền hoặc Escape đóng lớp trên cùng; nút X và Hủy vẫn hoạt động. Bắt đầu kéo/chọn chữ bên trong rồi thả ra ngoài không đóng nhầm. Trong lúc kiểm tra/lưu bất đồng bộ, thao tác đóng được chặn đến khi có kết quả.
- Dialog con: giữ dialog cha và vị trí cuộn khi mở form sửa/xóa/biểu tượng/phân loại. Hủy, Escape hoặc bấm nền quay lại cha và khôi phục focus. Khi lưu thành công, kết thúc luồng như trước và tải lại dữ liệu. Lớp bị che có inert/aria-hidden; từng dialog có ID tiêu đề riêng. Khóa cuộn nền đến khi đóng dialog cuối.
- Safari/WebKit: quản lý focus ở mousedown, tránh hành vi mặc định làm nút mất focus trước click. Khắc phục focus không quay về nút mở và trường hợp menu tài khoản đóng trước sự kiện click Đăng xuất sau khi điều hướng bằng bàn phím.
- Minh họa: tám cảnh SVG dùng chung bảng màu sáng/tối — chăm cây, hũ, mầm non, giỏ thu hoạch, vườn cây, đường tới mục tiêu, nhà kính và đá cân bằng. Phân bố theo nội dung trang; hình trang trí không tham gia cây truy cập. Giới hạn kích thước minh họa để không tạo khoảng trống lớn trên điện thoại.

Kiểm thử hồi quy mới nằm trong `tests/browser/ui-feedback.spec.ts`. Chạy bằng Node 22.12.0:

```sh
TEST_WEBKIT=1 npm run test:e2e
```

Runner dùng production build Next riêng, PostgreSQL và Auth double local. Kiểm tra gồm desktop Chromium, Chromium mô phỏng điện thoại và WebKit mô phỏng iPhone; sáng/tối, reduced motion, viewport 320/768/1024/1440/1920, đo tọa độ căn cột/nút, lỗi mạng/thử lại và dialog lồng nhau. Kết quả này không thay thế nghiệm thu cloud hoặc thiết bị vật lý.
