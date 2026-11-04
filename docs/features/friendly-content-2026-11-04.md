# Nội dung và thao tác dành cho người dùng phổ thông — 04/11/2026

## Mục tiêu và hợp đồng

Mỗi trang giúp người dùng biết trang dùng để làm gì, bắt đầu thế nào và đọc số liệu ra sao. Giữ năm chủ đề, font, minh họa, toàn bộ lời nhắn, các route, ID dữ liệu, bố cục Tổng quan đã lưu và các bước xác nhận ghi tiền. Không thêm cách tính tiền, liên kết sổ, tài sản ròng hay chấm điểm sức khỏe tài chính.

Hệ thống Help giữ các section ID và tải bài đầy đủ khi mở. `pageGuidance` chứa hướng dẫn ngắn theo trang, dùng chung cho phần mở rộng tại chỗ và đầu bảng Hướng dẫn. Hướng dẫn không đọc API tài chính, không lưu trạng thái onboarding, không chứa dữ liệu tài khoản. `EmptyState` thống nhất thứ bậc tiêu đề, giải thích và hành động; nơi dùng chịu trách nhiệm phân biệt trống, lọc, lỗi và kỳ chưa nhập.

## Đối chiếu nội dung và tác vụ

| Trang | Số liệu hoặc mục đích | Bắt đầu / việc tiếp theo | Điểm cần hiểu |
| --- | --- | --- | --- |
| Tổng quan | Thu, chi tháng và giá trị hiện tại từng sổ | Liên kết cuối mỗi thẻ nêu tên đích và việc cần làm | Các sổ có thể theo dõi cùng khoản tiền; không cộng tổng tài sản |
| Thu nhập | Tiền thực nhận trong tháng | Nguồn thu đều đặn hoặc khoản thu thêm | Chưa nhập khác 0; sửa số thu tháng thay số cũ |
| Chi tiêu | Tiền dự kiến, đã chi, còn trong hũ | Tạo hũ khi kỳ trống; đặt lại bộ lọc khi không có kết quả | Hũ chi tháng suy ra từ tiền có và số dư; tích lũy theo lần dùng tiền |
| Tiết kiệm | Gốc, giá trị và lãi/lỗ | Tạo danh mục rồi ghi số dư/giao dịch | Kiểm tra ngày giá, lãi và giá vàng |
| Đầu tư | Tài sản đang giữ và tiền chờ | Tạo danh mục, ghi tiền hoặc tài sản mở đầu | Lãi/lỗ đang giữ chỉ thuộc phần chưa bán |
| Quỹ an toàn | Dự phòng và tháng bảo vệ | Xác nhận sinh hoạt, quy mô quỹ, ghi tiền đã dành riêng | Quỹ khẩn cấp / Quỹ phát sinh / Quỹ chi dự kiến; không tự chuyển tiền |
| Mục tiêu | Đã chuẩn bị và còn thiếu | Liên kết nguồn hoặc sổ góp riêng | Theo dõi không phải giữ/chuyển tiền |
| Báo cáo | Số theo kỳ và so sánh | Chọn kỳ, xem chi tiết, xuất bảng dữ liệu | Giữ kỳ gốc, cảnh báo tạm tính và thiếu giá |
| Cài đặt | Giao diện, ngôn ngữ và sao lưu | Chọn tùy thích hoặc tải backup | Restore cần tài khoản trống; reset có xác nhận riêng |
| Hồ sơ | Thông tin cá nhân tùy chọn | Sửa tên/thông tin muốn lưu | Không thay đổi số liệu tài chính |
| Đang phát triển | Khả năng dự kiến | Liên kết Thu nhập và Chi tiêu hiện có | Không trình bày câu hỏi khám phá sản phẩm như tác vụ của khách hàng |

## Tính tương thích và trình bày

Tên Việt đổi ở lớp trình bày; khóa `emergency`, `rainy_day`, `sinking`, widget IDs, Help anchors và backup không đổi. Tên do người dùng nhập không được dịch hoặc đổi tự động. Dictionary giữ khóa thông báo cũ để tương thích nội dung được trả về/lưu trước đó.

Nút tùy chỉnh Tổng quan là thao tác phụ. Thẻ đọc theo thứ tự số liệu, trạng thái và liên kết việc tiếp theo; không tạo biểu mẫu ghi tiền khác ở Tổng quan. Bố cục lưu 0/2/8 thẻ tiếp tục có hiệu lực, chỉ tải nguồn của thẻ đang bật. Phần hướng dẫn tại chỗ đóng mặc định, mở được bằng bàn phím; Help giữ cơ chế nested dialog và focus hiện có.

Biểu mẫu và các nhóm trường hiện có được giữ; không thêm bước xác nhận. Luồng chống bỏ nháp, xem trước, idempotency, xung đột, bộ lọc và kỳ đã nhớ tiếp tục thuộc các controller hiện tại. Landing và preview giải thích cùng năng lực; preview chỉ dùng số liệu minh họa cố định.

## Kiểm chứng

Kết quả cập nhật trong [nhật ký validation](../07-validation.md). Ảnh mới nằm trong `artifacts/friendly-content-2026-11-04/`, tách khỏi ảnh lượt trước. Kiểm thử dùng PostgreSQL và Auth double cục bộ; không chứng minh cloud deployment, Auth thật hoặc hành vi thiết bị vật lý. Chưa thực hiện nghiên cứu sử dụng với khách hàng thực.

## Tổng hợp kiểm chứng — 05/11/2026

- Help mở đầu theo thứ tự **Trang này giúp gì → Bắt đầu thế nào → Đọc kết quả ra sao**; các anchor và bài chi tiết hiện có được giữ.
- `npm run check` đạt, gồm 336 unit test. Lượt browser chính đạt 242/244; hai ca selector cũ đã sửa và chạy lại 8/8 trên bốn cấu hình. Trạng thái trống Chi tiêu bổ sung đạt 4/4; Help và English cuối đạt 16/16.
- Tổng cộng 248 tình huống riêng có kết quả cuối đạt qua các lượt riêng, không phải một lượt sạch duy nhất. Xem [nhật ký validation](../07-validation.md) và `artifacts/friendly-content-2026-11-04/verification-summary.json`.
- Snapshot Help cuối khớp source ứng dụng tại thời điểm tổng hợp, ngoại trừ bốn file landing/preview đang được thay đổi song song đã liệt kê trong validation. Kết quả đợt này không thay thế kiểm chứng cho các thay đổi landing mới.
