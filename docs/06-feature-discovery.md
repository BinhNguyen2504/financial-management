# Chuẩn bị đặc tả từng tính năng

Thu nhập đã chốt theo [đặc tả](features/income.md). Chi tiêu đã chốt và triển khai theo [đặc tả ngày 15/10/2026](features/expenses.md). Những câu hỏi ngân sách/chi tiêu đã được trả lời tại đó không còn là blocker của module này; agenda bên dưới dành cho các module còn lại.

Người dùng sẽ cung cấp chi tiết sau; danh sách dưới đây là agenda làm việc, không yêu cầu trả lời hết ngay. Nên bắt đầu với **Tài khoản + Thu/Chi + Chuyển tiền** vì các phần khác dựa trên số liệu này.

## Mẫu trao đổi cho mỗi tính năng

```text
Tên tính năng:
Mục đích sử dụng:
Luồng hiện tại trên Notion:
Điểm mất thời gian / sai số thường gặp:
Thao tác mong muốn trên điện thoại:
Trường dữ liệu cần nhập:
Quy tắc tính và ngày hiệu lực:
2–3 ví dụ đầu vào → kết quả mong muốn:
Các ngoại lệ (sửa/xóa/hoàn tiền/backdate/thiếu dữ liệu):
Báo cáo hoặc thông báo cần có:
Dữ liệu lịch sử cần giữ và nguồn export:
Điều kiện bạn coi tính năng là dùng được:
```

Ví dụ nên dùng số giả. Khi chuyển dữ liệu thật, import local/staging theo kế hoạch thay vì gửi các thông tin đăng nhập trong hội thoại.

## Cần chốt trước khi làm P1

1. Thu/chi ghi từng giao dịch hay tổng theo ngày/tháng? Có cần cả hai, đặc biệt với dữ liệu cũ?
2. Danh sách tài khoản hoạt động; HSBC là credit card hay tài khoản thanh toán? “Method” hiện là nơi giữ tiền hay phương thức trả tiền?
3. Ghi nhận ngày phát sinh hay ngày tiền thực vào/ra? Có khoản pending và công nợ cần theo dõi không?
4. Chọn ngày bắt đầu và số dư đầu kỳ; cần giữ lịch sử từ năm nào?
5. Có cần quản lý dư nợ hiện tại, lịch trả gốc/lãi và khoản cho vay không?
6. Email hay Google cho login; chỉ một người dùng sở hữu dữ liệu hay có kế hoạch chia sẻ gia đình?

## Theo từng module

| Module | Quy tắc cần làm rõ |
| --- | --- |
| Thu nhập | Đã chốt: tổng thực nhận theo tháng, danh mục cố định và phát sinh; xem đặc tả riêng. |
| Chi tiêu | Nhóm cá nhân/gia đình; khoản nào là chi phí, trả gốc, hỗ trợ hoặc chuyển sang tích lũy; hoàn tiền và chia giao dịch? |
| Ngân sách | Envelope cộng dồn hay hạn mức tháng; cho âm không; thay đổi giữa tháng; reset/chuyển tiếp cuối năm; khoản không dùng thì xử lý ra sao? |
| Tài khoản | Đối soát thủ công hay theo sao kê; phí chuyển tiền; tài khoản đóng/ẩn; xử lý giao dịch đã ghi nhầm? |
| Tiết kiệm | Lãi nhập tay hay tính dự kiến; phương pháp kỳ hạn/ngày; tái tục, rút trước hạn, nạp thêm; vàng dùng đơn vị gì? |
| Đầu tư | Từng mã hay nhóm; bình quân/FIFO/theo lô; phí/thuế; bán một phần; cổ tức, chia tách; giá do người dùng nhập hay provider? |
| Quỹ | Mức an toàn đang dùng là 85 hay 150 triệu hay đã đổi; các khoản chi thiết yếu; mục tiêu cố định hay theo số tháng; một nguồn chia nhiều quỹ thế nào? |
| Mục tiêu | Current lấy theo tiền góp hay định giá; deadline; mức ưu tiên; có cho mục tiêu cùng tham chiếu một quỹ? |
| Phân bổ | Vàng thuộc nhóm hiển thị nào; cash gồm tiền chờ không; mục tiêu tỷ trọng áp dụng cho phần đầu tư hay toàn bộ tài sản? |
| Báo cáo | Chọn kỳ nào mặc định; cần số dư theo ngày hay chốt tháng; snapshot trước đây là giá vốn hay giá trị thị trường? |
| Offline | Cần chỉ xem hay ghi khi mất mạng; dùng chung thiết bị không; khi sửa chéo thì muốn giải quyết ra sao? |
| Import | Có CSV/export từng database và công thức Notion không; giữ tổng hợp hay có dữ liệu giao dịch chi tiết; chính sách trùng và hoàn tác? |

## Sau khi nhận chi tiết

Viết đặc tả ngắn trong `docs/features/<feature>.md`, ghi trạng thái draft/confirmed và ví dụ đã thống nhất. Với thay đổi lớn (giá vốn, currency, budget rollover), ghi một quyết định kiến trúc kèm lý do. Chỉ sau đó mới cập nhật schema, xây UI thật và kiểm thử tương ứng. Không lấy bảng phạm vi P0 thay cho đặc tả được xác nhận.

## Quyết định Đầu tư — 18/10/2026

Đã xác nhận: tổng danh mục, nhiều ví, VND, mở đầu rồi ghi mới; mua/bán trực tiếp với Bên ngoài được phép. Giá vốn bán và giá trị sau mỗi mua/bán nhập tay; phí/thuế đi cùng giao dịch. Nạp/rút chỉ dành cho ví. Sửa/hủy có lý do và lịch sử; xóa là lưu trữ khi hết vốn lẫn giá trị. Có định giá riêng, lấy mốc gần nhất với nhãn cũ; báo cáo đầy đủ kỳ/biểu đồ/CSV/JSON. Bốn tab, không chốt tháng, không DCA/tỷ trọng mục tiêu, cổ tức hoặc liên kết tiền module khác. Các câu hỏi về FIFO/mã/tỷ giá trong bảng phía trên dành cho mở rộng sau, không còn là blocker của bản tổng danh mục.


## Bổ sung backup toàn tài khoản — 18/10/2026

Đã chốt và triển khai trong source: JSON không mật khẩu, chỉ nhập vào tài khoản trống; kèm hồ sơ và tùy chọn áp dụng mặc định tắt. Toàn bộ thao tác trong Cài đặt, gợi ý duy nhất trên Tổng quan. Chi tiết và giới hạn: [backup](features/backup.md).

## Quyết định Quỹ an toàn — 19/10/2026

Đã chốt và triển khai theo [đặc tả Fund](features/funds.md): ba quỹ cố định, living expense từ mức cấu hình các hũ chi tháng đã chọn, hệ số tự nhập, nguồn đổi phải xem trước/xác nhận, ưu tiên do người dùng sắp. Sổ tiền độc lập, nhiều nơi giữ, chuyển liên quỹ và sửa/hủy có lịch sử. Các con số Notion không được dùng làm số mặc định. Financial Goals tách riêng; câu hỏi Quỹ ở agenda cũ phía trên đã được giải quyết.

## Help theo trang — 20/10/2026

Đã bổ sung hướng dẫn trong source cho 12 trang; nút chung theo trang và các điểm giải thích tại chỗ, bao gồm trong form. Các trang planned chỉ giới thiệu và chỉ đến tính năng hiện có. Tên/trạng thái lấy từ catalog; không thêm module Help vào menu và không coi nội dung hướng dẫn là bằng chứng triển khai cloud. Xem [Help](features/help.md).

## Tổng quan cá nhân hóa — 29/10/2026

Đã chốt 10 widget, mặc định 6 widget bao phủ năm module và Cần chú ý. Người dùng thêm/ẩn/đổi thứ tự, chọn tối đa 5 hũ, xem thử rồi Lưu/Hủy; bố cục theo tài khoản. Kỳ tháng này/hiện tại, phần chào thu gọn, chưa có tài sản ròng liên module. [Đặc tả và ranh giới dữ liệu](features/overview.md).

## Quyết định Mục tiêu — 30/10/2026

Đã chốt hai loại, hai cách ghi nhận, tỷ lệ cố định tối đa 100% cho chi dùng và cột mốc được trùng nguồn; cơ sở vốn/giá trị chọn từng mục tiêu. Quỹ chỉ liên kết cột mốc. Có góp/rút/chuyển, ưu tiên thứ tự, góp dự định, xác nhận hoàn thành; tạm dừng giữ phần chia. Chỉ trang Goals. Các câu hỏi Goals cũ được thay bằng [đặc tả](features/goals.md).
