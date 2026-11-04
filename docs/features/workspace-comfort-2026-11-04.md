# Thao tác thoải mái và giữ mạch sử dụng — 04/11/2026

## Những lựa chọn đã thống nhất

Giữ bản sắc nhẹ nhàng, Nunito, năm chủ đề và font quote tiếng Việt hiện có. Thu gọn lời nhắn nhưng giữ toàn bộ câu; minh họa nhỏ cạnh tên chức năng. Giữ Menu trên điện thoại, chia nhóm chức năng; giữ Cài đặt một trang và đổi thứ tự. Giữ kỳ, tab và bộ lọc trong phiên thay vì tự trở về kỳ hiện tại mỗi lần mở trang.

## Bảo vệ nội dung nhập

Thu nhập, Chi tiêu, Tiết kiệm và Quỹ an toàn dùng chung xác nhận bỏ thay đổi. Đóng bằng nút X, Hủy, Escape hoặc chạm ngoài đều đi qua kiểm tra. Nội dung không đổi đóng ngay; có thay đổi thì chọn **Tiếp tục nhập** hoặc **Bỏ thay đổi**. Kiểm tra bao gồm trường tùy chọn, lý do, cấu hình quỹ và chuỗi số chưa hợp lệ đang nằm trong ô nhập. Đầu tư và Mục tiêu giữ cơ chế bảo vệ tương ứng hiện có.

Không đóng khi đang lưu hoặc chưa xác nhận kết quả lưu. Xem trước, phiên bản/idempotency, xử lý xung đột và xác nhận ghi tiền giữ nguyên. Xác nhận bỏ nháp dùng dialog chung để giữ focus, Escape và stack khi mở Hướng dẫn hoặc biểu mẫu con. Nội dung biểu mẫu không được ghi vào cơ chế nhớ ngữ cảnh.

## Trạng thái xem trong phiên

`useViewState` và `SessionViewStore` chỉ nhận trạng thái trình bày: kỳ/ngày xem, tab, khoảng báo cáo và bộ lọc. Khóa gồm owner, phân hệ và trường; các sổ có state riêng. Ledger của từng quỹ tách khỏi ledger chung. Component workspace được khóa theo tài khoản để dữ liệu và editor cũ không còn khi đổi chủ.

Lưu trong `sessionStorage`; khi storage bị chặn, dùng bộ nhớ trong tab và không hứa giữ qua reload. Giá trị không đọc được hoặc sai kiểu trở về mặc định hợp lệ. Không đưa số dư, số tiền, bản nháp hay response API vào store; không ghi vào backup hoặc thay bố cục Tổng quan đã lưu.

Nút **Về kỳ hiện tại** xuất hiện khi đang xem kỳ khác. **Đặt lại bộ lọc** đưa điều kiện về mặc định. Reports giữ URL làm nguồn lựa chọn ưu tiên; khi URL không chỉ định kỳ/tab, dùng ngữ cảnh đã nhớ trong phiên. URL sai vẫn báo lỗi và không bị âm thầm thay bằng lựa chọn đã nhớ.

## Bố cục và cách tìm thao tác

- Đầu trang làm rõ tên chức năng, giảm khoảng đệm quote và minh họa. Không cắt câu, đổi lượt quote hay tự sửa layout widget.
- Chi tiêu hiện tổng hợp trước bộ lọc nâng cao. Mobile mở bộ lọc bằng nút có số điều kiện; desktop giữ các ô lọc hiển thị và có nút đặt lại khi cần. Giao dịch Tiết kiệm/Đầu tư có cùng cách mở bộ lọc phụ.
- Các thao tác phụ của Tiết kiệm/Đầu tư và xuất CSV Reports nằm trong **Thao tác khác** trên mobile; desktop tiếp tục nhìn thấy các nút. Có tên, trạng thái mở, đóng khi chạm/focus ra ngoài và Escape. Menu giữ khoảng ngang trong viewport khi đổi cỡ/ngôn ngữ; đóng dialog từ menu trả focus về nút mở đang hiển thị.
- Quỹ an toàn có nút **Ghi giao dịch** ở đầu, tổng dự phòng trước phần giải thích; giữ minh họa tiến độ theo dữ liệu thật, mô tả vai trò của ba quỹ và hướng dẫn mở rộng. Ledger hiện 10 dòng mỗi trang, giữ tổng số kết quả và phạm vi dòng.
- Tổng quan dùng liên kết nêu tên đích; không cộng các sổ thành tài sản ròng. Reports hiện trạng thái kỳ và cảnh báo liên quan cạnh số liệu; phần kỳ trước, thời điểm cập nhật và toàn bộ giải thích vẫn mở được. Nguồn trống hiện trạng thái và liên kết tới sổ tương ứng ngay cạnh chỉ số.
- Cài đặt: Giao diện/ngôn ngữ → Sao lưu/khôi phục → Cài ứng dụng → Làm trống dữ liệu. Giữ điều kiện restore tài khoản trống và toàn bộ kiểm tra/xác nhận reset.
- Menu nhóm Thu nhập & Chi tiêu, Tích lũy, cùng các mục Tổng quan/Báo cáo/Cài đặt. Nhóm Đang phát triển đóng mặc định, tự mở khi đang ở trang thuộc nhóm. Menu mobile vẫn đóng sau khi chọn cả mục dự kiến.

## Nội dung và kiểm chứng

Đã cập nhật catalog năng lực chung, Help, FAQ hai landing và preview cố định. Preview vẫn chỉ dùng số liệu minh họa; không đọc API tài chính và không dùng `useViewState` của tài khoản.

Kiểm thử gồm store bị chặn/hỏng, tách owner; close/continue/discard và số sai; điều hướng/khôi phục ngữ cảnh; URL Reports; thứ tự Cài đặt; menu lồng nhau; bounds, số liệu đầu trang, phóng chữ, theme và ngôn ngữ. Kết quả cuối và giới hạn môi trường được bổ sung vào [nhật ký validation](../07-validation.md). Ảnh audit ban đầu và ảnh sau thay đổi nằm riêng trong `artifacts/ux-audit-2026-11-04/` và `artifacts/ux-implementation-2026-11-04/`.

Kiểm chứng trình duyệt/local Auth double không chứng minh triển khai cloud hay bàn phím/vùng an toàn trên máy thật. Không thay schema hoặc tự động dịch chuyển tiền.
