# Dialog làm trống dữ liệu tài chính — 04/11/2026

## Mục đích

Người dùng cần nhận ra tài khoản đích, phạm vi xóa và việc phải lưu backup trước khi xác nhận. Dialog cũ để email lẫn văn bản, thiếu nhóm nội dung, giấu bước 2 và chưa định nghĩa border/nền/padding cho ô xác nhận.

## Giao diện và hành vi

- Tiến trình hai bước nằm đầu dialog và giữ trong tầm nhìn khi cuộn. Bước hiện tại có `aria-current="step"`, chữ trạng thái và dấu hiệu trực quan; không chỉ dựa vào màu.
- Email trong khối nền riêng, chữ đậm và xuống dòng đầy đủ. Phạm vi xóa, số bản ghi từng phân hệ và thông tin giữ lại có tiêu đề riêng. Số bản ghi không đồng nghĩa số giao dịch. Phạm vi gồm cả Mục tiêu, không ghi cứng số phân hệ trong cảnh báo.
- Bước 1 có nút tạo/tải JSON hiện tại trong footer để luôn thấy thao tác tiếp theo. Backup hợp lệ mở bước 2, chuyển focus vào tiêu đề và cuộn tiêu đề vào vùng nhìn; không focus input để tránh tự mở bàn phím mobile.
- Bước 2 gom thông báo backup, link lưu lại JSON, hạn dùng, checkbox xác nhận đã lưu và input một dòng. Border/nền/padding/focus được khai báo riêng theo token; chữ tối thiểu 16px, chiều cao tối thiểu 44px.
- Nút xóa chỉ hiện ở bước 2; cần checkbox và cụm `XÓA TOÀN BỘ` khớp chính xác. Tạo file không tự đánh dấu đã lưu. Tạo backup mới xóa xác nhận trước. Khi server từ chối vì hết hạn hoặc thay đổi dữ liệu, trở về bước 1 và focus lỗi.
- Giữ nguyên xử lý lỗi quyền, khóa thao tác trong lúc gửi và retry cùng operation/request khi chưa biết kết quả. Hủy không gọi reset. API, JSON backup và database không đổi.

## Đồng bộ sản phẩm

README, tài liệu backup/UX và Help Việt/Anh đã cập nhật. Catalog, cả hai landing và preview được rà soát: năng lực, trạng thái module và ví dụ tài chính không đổi, nên giữ nguyên copy/dữ liệu minh họa. Các input khác trong Settings là file ẩn hoặc checkbox, không có ô text thứ hai cùng lỗi border.

## Kiểm chứng

- Lượt cuối chạy sạch **52/52 browser**: reset và bố cục khôi phục trên Chromium desktop/mobile, Firefox và WebKit/iPhone giả lập. Cả năm theme sáng/tối đều được kiểm tra; có ảnh 320/390px, màn hình ngang 844×390 và chữ phóng 200%.
- Input được kiểm border ở trạng thái chưa focus (tương phản ít nhất 3:1), chữ ít nhất 4.5:1, chiều cao 44px, chữ 16px và outline khi focus ít nhất 3px. Email dài hiển thị đầy đủ, hai bước thẳng hàng và vùng cuộn không tràn ngang.
- Kiểm tra luồng bao gồm backup lỗi, tải lại file, checkbox chưa chọn, xác nhận sai/đúng, tạo backup mới, hết hạn, dữ liệu thay đổi, lỗi quyền và retry cùng yêu cầu khi mất phản hồi. Các bài backend/reset sẵn có trong bộ browser tiếp tục qua.
- **16/16** kiểm tra Help/i18n trên source cuối qua; lint/format phạm vi sửa, typecheck, kiến trúc (324 source / 0 vi phạm) và production build cô lập qua.
- Log: `artifacts/reset-dialog-verified.log`, `artifacts/reset-dialog-verified-build.log`; ảnh trong `artifacts/reset-dialog-verified/`. `artifacts/reset-dialog-source-manifest.json` xác nhận năm file sản phẩm khớp snapshot build và ghi hash hai bộ browser. Các lượt trước giữ riêng trong `reset-dialog-before`, `reset-dialog-after` và `reset-dialog-final`; lượt cuối nêu trên là bằng chứng sau sửa căn hàng/khoảng cuộn.

Bộ browser dùng production build cô lập, PostgreSQL local và Auth contract double với dữ liệu tổng hợp. Không ghi/reset dữ liệu tài khoản thật, không áp dụng migration hoặc deploy. Browser mobile không thay bằng chứng bàn phím/thiết bị vật lý hay Auth/RLS cloud. Lịch sử kiểm chứng ở [validation](../07-validation.md).
