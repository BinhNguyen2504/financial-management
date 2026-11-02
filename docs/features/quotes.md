# Một chút bình yên — 02/11/2026

Mỗi trang trong không gian ứng dụng có một lời nhắn. Kho gồm **200 câu tự viết**, chia đều tám nhóm: bình yên, thói quen, tiền bạc, kiên nhẫn, mục tiêu, chăm sóc bản thân, lòng biết ơn và niềm vui. Mỗi câu có bản Việt/Anh, mỗi bản **1–35 từ**, đếm bằng khoảng trắng. Không gán tác giả, không dùng emoji, không đưa lời hứa tài chính.

## Khi nào đổi câu

- Vào ứng dụng, reload và chuyển pathname: lấy một câu mới. Back/Forward qua trang cũng đổi câu; document trở lại từ bfcache tiếp tục tiến độ mới nhất của tab.
- Xáo trộn 200 câu, dùng hết một lượt mới lặp; câu đầu lượt tiếp theo khác câu cuối lượt trước. Không đổi theo ngày hoặc lịch hẹn.
- Đổi theme, ngôn ngữ, query/hash, bộ lọc, mở dialog, tải lại số liệu hay quay lại tab: giữ nguyên ID. Đổi ngôn ngữ chỉ hiển thị bản dịch tương ứng.
- Lượt đọc dùng `sessionStorage` riêng từng tab (`fm-quote-sequence`), ngoài tài khoản và backup tài chính. Chỉ lưu phiên bản kho, ID vừa đọc và danh sách ID còn lại. Khi kho đổi phiên bản hoặc dữ liệu lưu hỏng, tạo lượt mới; giữ tránh câu liền trước nếu ID còn hợp lệ.
- Storage bị chặn thì tiếp tục bằng bộ nhớ trong document; không bảo đảm nhớ lượt qua reload lúc đó. Đóng tab kết thúc lượt lưu. Các tab không đồng bộ câu.

## Hiển thị

Dải quote nằm trước nội dung chính. Riêng Tổng quan, widget `peace` đã bật trong bố cục đang xem sẽ chứa câu đó; nếu widget tắt thì hiện đầu trang. Không sửa schema, mặc định, thứ tự hay bố cục tài khoản để đặt quote. Xem thử/Hủy chỉ chuyển vị trí, không lấy câu mới. Chờ biết bố cục trước khi hiện; lỗi đọc cấu hình hiện quote ở đầu trang, thử lại thành công có thể đưa về widget mà vẫn giữ câu.

Chữ serif nghiêng có vai trò riêng, dấu ngoặc kép SVG trang trí và nền tint phẳng theo theme. Màu chữ dùng token; không có emoji, gradient, ticker, timer hoặc animation tự chạy. Text xuống dòng đầy đủ, không cắt chữ. Nhãn của dải được lược trong widget vì header đã có cùng tên. SSR/client đầu dùng cùng khung chờ; chọn câu sau mount, không random trong render. Không tự nhận focus hoặc dùng live region.

Trang giới thiệu không tham gia lượt đọc. Bên trong phần xem thử ứng dụng có đúng một câu minh họa cố định, dịch Việt/Anh, không thay khi chuyển tab minh họa hoặc reload. Trang đăng nhập không hiển thị quote. Không đọc API tài chính để chọn nội dung.

## Cấu trúc

`src/features/quotes/` chứa catalog, bộ xáo trộn, controller theo phiên, provider và card trình bày dùng chung. `DailyNote` đọc câu từ provider, còn preview truyền nội dung cố định trực tiếp cho card, không import controller. Controller chỉ khởi tạo browser storage khi nhận sự kiện vào trang, không có state chia sẻ giữa request SSR. Theo dõi pathname bằng API Next.js trong bản đã cài; effect lặp và remount card không tiêu thụ thêm câu.

Thêm/sửa nội dung phải giữ ID ổn định, cập nhật phiên bản catalog và chạy kiểm tra đủ hai ngôn ngữ, trùng câu, emoji và 35 từ. Bằng chứng kiểm tra ghi tại [lịch sử kiểm chứng](../07-validation.md); source status không chứng minh triển khai cloud hoặc thiết bị vật lý.
