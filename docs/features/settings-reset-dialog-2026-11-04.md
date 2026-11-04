# Dialog làm trống dữ liệu tài chính — 04/11/2026

## Mục đích

Người dùng cần nhận ra tài khoản đích, phạm vi xóa và việc phải lưu backup trước khi xác nhận. Dialog cũ để email lẫn văn bản, thiếu nhóm nội dung, giấu bước 2 và chưa định nghĩa border/nền/padding cho ô xác nhận.

## Giao diện và hành vi

- Tiến trình hai bước nằm đầu dialog và giữ trong tầm nhìn khi cuộn. Bước hiện tại có `aria-current="step"`, chữ trạng thái và dấu hiệu trực quan; không chỉ dựa vào màu.
- Email trong khối nền riêng, chữ đậm và xuống dòng đầy đủ. Phạm vi xóa, số bản ghi từng phân hệ và thông tin giữ lại có tiêu đề riêng. Số bản ghi không đồng nghĩa số giao dịch. Phạm vi gồm cả Mục tiêu, không ghi cứng số phân hệ trong cảnh báo.
- Bước 1 tạo/tải JSON hiện tại. Backup hợp lệ mở bước 2, chuyển focus vào tiêu đề và cuộn tiêu đề vào vùng nhìn; không focus input để tránh tự mở bàn phím mobile.
- Bước 2 gom thông báo backup, link lưu lại JSON, hạn dùng, checkbox xác nhận đã lưu và input một dòng. Border/nền/padding/focus được khai báo riêng theo token; chữ tối thiểu 16px, chiều cao tối thiểu 44px.
- Nút xóa chỉ hiện ở bước 2; cần checkbox và cụm `XÓA TOÀN BỘ` khớp chính xác. Tạo file không tự đánh dấu đã lưu. Tạo backup mới xóa xác nhận trước. Khi server từ chối vì hết hạn hoặc thay đổi dữ liệu, trở về bước 1 và focus lỗi.
- Giữ nguyên xử lý lỗi quyền, khóa thao tác trong lúc gửi và retry cùng operation/request khi chưa biết kết quả. Hủy không gọi reset. API, JSON backup và database không đổi.

## Đồng bộ sản phẩm

README, tài liệu backup/UX và Help Việt/Anh đã cập nhật. Catalog, cả hai landing và preview được rà soát: năng lực, trạng thái module và ví dụ tài chính không đổi, nên giữ nguyên copy/dữ liệu minh họa. Các input khác trong Settings là file ẩn hoặc checkbox, không có ô text thứ hai cùng lỗi border.

## Kiểm chứng

Kết quả thực tế và giới hạn môi trường được ghi thêm trong `docs/07-validation.md` sau khi hoàn tất kiểm thử. Bộ browser dùng production build cô lập, PostgreSQL local và Auth contract double với dữ liệu tổng hợp. Không dùng kết quả này làm bằng chứng Auth cloud hoặc thiết bị vật lý.
