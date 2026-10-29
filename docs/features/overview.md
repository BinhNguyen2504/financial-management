# Tổng quan cá nhân hóa — cập nhật 29/10/2026

Tổng quan giữ số liệu quan trọng của năm module. Mặc định có năm thẻ theo thứ tự Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư, Quỹ an toàn. Có 10 loại widget để tùy chỉnh, mỗi loại tối đa một widget; có thể ẩn toàn bộ. Bố cục đã lưu được giữ nguyên, kể cả cấu hình sáu widget trước đây. Bộ mặc định mới chỉ dùng khi tài khoản chưa lưu cấu hình hoặc chọn Khôi phục mặc định rồi Lưu.

| Thẻ | Số liệu |
| --- | --- |
| Thu nhập | Tổng thực nhận tháng này; nhắc khoản thu cố định chưa nhập |
| Chi tiêu | Thực chi và mức tháng; cảnh báo vượt mức và tạm tính |
| Tiết kiệm | Tổng giá trị hoặc giá trị đã biết; cảnh báo thiếu/định giá cũ |
| Đầu tư | Tổng giá trị hoặc giá trị đã biết và lãi/lỗ chưa chốt; cảnh báo định giá |
| Quỹ an toàn | Tổng dự phòng, số tháng Emergency; cảnh báo nguồn tính quỹ thay đổi |

Thu nhập/Chi tiêu dùng tháng hiện tại; tài sản và quỹ tính đến hôm nay theo Asia/Ho_Chi_Minh. Không cộng các sổ độc lập thành tài sản ròng hay số tiền có thể chi. Thu nhập chưa nhập khác với 0 đồng. Không tự truy cập ngân hàng hoặc giá thị trường.

## Widget tùy chọn

Cần chú ý chỉ tổng hợp module có widget đang hiển thị, kể cả widget phụ: Hũ theo dõi/Phân bổ thuộc Chi tiêu, Sổ sắp đáo hạn thuộc Tiết kiệm. Không kéo thêm nguồn của module đã ẩn. Nếu chỉ bật Cần chú ý hoặc lời nhắn, không đọc nguồn tài chính; hiển thị hướng dẫn bật widget module. Phần Chi tiêu mà Quỹ đọc nội bộ không tự đưa cảnh báo Chi tiêu vào Cần chú ý.

Phân bổ dùng bốn nhóm lớn nhất và Khác, giữ đúng tổng. Hũ theo dõi cho chọn tối đa năm hũ, giữ tham chiếu hũ ngừng/không còn trong tháng. Sổ sắp đáo hạn gồm sổ còn tiền gốc đã đến hạn hoặc đến hạn trong bảy ngày; trả tối đa năm dòng theo ngày và số lượng đầy đủ. Một chút bình yên không đọc nguồn tài chính.

## Tải dữ liệu và tùy chỉnh

GET `/api/v1/overview` trả `{ layout, today, fetchedAt, sources }`. Khi không có `widgets`, server đọc bố cục tài khoản rồi chọn đúng nguồn. Tham số `?widgets=…` phục vụ xem thử; response vẫn chứa bố cục đã lưu. Danh sách rỗng được hỗ trợ. Lần vào trang chỉ có một request dữ liệu Tổng quan, không gọi riêng layout, API từng module hoặc kiểm tra dữ liệu khôi phục. Các request Auth/hồ sơ của shell là độc lập.

Trước khi biết bố cục, hiển thị trạng thái đang tải chung, không dựng widget mặc định hoặc trạng thái bố cục trống. Lỗi đọc cấu hình hiện lỗi/thử lại; chỉ dùng mặc định khi xác nhận chưa có cấu hình. Không lấy mặc định để che lỗi thiếu migration.

GET/PUT `/api/v1/overview/layout` vẫn hoạt động. PUT nhận `schemaVersion`, danh sách widget theo thứ tự, `jarIds`, `expectedRevision`; trả `revision`. Xung đột 409 `LAYOUT_CONFLICT` giữ bản nháp và cho tải bản mới. Khôi phục mặc định chỉ đổi bản nháp. Xem thử đóng dialog nhưng giữ nháp; Hủy/Escape/đóng dialog bỏ nháp. Refresh không ghi đè nháp.

Mở tùy chỉnh, đổi thứ tự hoặc chọn hũ từ danh sách đã tải không tạo request đọc. Bật nội dung chưa có mới tải dữ liệu; danh sách hũ chỉ tải khi bật Hũ theo dõi. Dữ liệu thành công được giữ trong bộ nhớ của view/tài khoản để hỗ trợ hủy/bật lại; không lưu dữ liệu tài chính hoặc nháp vào localStorage.

Gợi ý khôi phục được bỏ khỏi Tổng quan. Người dùng khôi phục bản sao lưu tại Cài đặt.

## Đọc cơ sở dữ liệu

Luồng đọc riêng dùng một SELECT JSON cho mỗi nguồn cần thiết trong transaction có owner/RLS, không đọc audit, lịch sử lệnh, label trình bày hoặc tạo bản sao phục vụ ghi. Các nguồn dùng cùng một clock, được đọc độc lập; không cam kết snapshot toàn ứng dụng.

Thu nhập chỉ đọc tháng hiện tại. Chi tiêu dựng tháng hiện tại, giữ lịch sử/snapshot cần chuyển số dư. Tiết kiệm và Đầu tư giữ các revision cần tính đúng số dư; không lọc đơn giản theo tháng. Tiết kiệm dùng lại trạng thái khi ngày xem bằng hôm nay, tránh replay hai lần. Quỹ chia sẻ projection Chi tiêu trong request; khi Chi tiêu bị ẩn chỉ đọc header/quy tắc hũ cần kiểm tra nguồn quỹ. Phân bổ, danh sách hũ và danh sách đáo hạn chỉ tính/trả khi widget tương ứng bật.

Lỗi nguồn nằm tại widget; nguồn khác tiếp tục hiển thị. Refresh lỗi giữ số liệu thành công lần trước kèm cảnh báo. Lỗi Auth xóa số liệu và bản nháp khỏi view. Refresh theo foreground và nửa đêm Việt Nam, không polling. Trang await pageAccess; API private/no-store, PUT kiểm tra origin. Không thêm cache chia sẻ hoặc bảng tổng hợp.

Migration `202610290001_overview_layouts.sql` vẫn là điều kiện lưu cấu hình. Bảng có FORCE RLS và owner/revision; đọc tài khoản chưa cấu hình không tạo hàng. Layout nằm ngoài backup tài chính và kiểm tra tài khoản trống. Tối ưu lần này không thêm migration.

## Giao diện và tài liệu

Hai cột khi vùng nội dung từ 760px, còn lại một cột; dialog mobile toàn màn hình. Giữ thứ tự DOM/bàn phím, theme, sáng/tối, Việt/Anh và Privacy Mode. Landing dùng năm thẻ số liệu mẫu cố định, không đọc API tài khoản. Catalog, README, Help và tài liệu kiến trúc/UX được cập nhật cùng thay đổi.

Kết quả kiểm chứng tối ưu được ghi riêng trong `docs/07-validation.md`, tách local PostgreSQL/Auth double khỏi cloud và thiết bị thật. Lịch sử kiểm chứng triển khai widget ban đầu được giữ nguyên.
