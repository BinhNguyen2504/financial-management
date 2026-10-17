# Phạm vi và lộ trình

**Cập nhật 17/10/2026:** Thu nhập, Chi tiêu và Tiết kiệm đã triển khai trong source, có Auth/API/PostgreSQL/RLS. Tổng quan hiện tổng hợp hũ chi tiêu; Thiết lập có hướng dẫn cài PWA. Các module giao dịch, tài khoản, đầu tư, quỹ an toàn, mục tiêu và báo cáo toàn hệ thống vẫn là định hướng. Landing công khai tại `/`, ứng dụng yêu cầu đăng nhập. Trạng thái source không thay thế xác minh cloud; migration Tiết kiệm chưa được áp dụng lên cloud. Xem [landing/xác thực](features/landing.md) và [xác minh](07-validation.md). Roadmap ban đầu bên dưới là định hướng; các quy tắc từng module đã triển khai được ưu tiên theo đặc tả riêng.

## Những lựa chọn đã được người dùng xác nhận

- Bắt đầu bằng **web PWA**, sử dụng cả điện thoại và máy tính.
- **Cloud riêng có đăng nhập**, đồng bộ nhiều thiết bị.
- Có kế hoạch xây **app iOS bằng Flutter/Dart** về sau, ưu tiên cài trên iPhone cá nhân, chưa có ý định phát hành App Store (bổ sung ngày 15/10/2026).
- Giai đoạn này phân tích ảnh, dựng source nền và kế hoạch; người dùng sẽ cung cấp chi tiết từng tính năng sau.

Đề xuất ban đầu: một người dùng sở hữu dữ liệu riêng, VND và múi giờ Việt Nam. Chia sẻ gia đình, nhiều tiền tệ và app iOS native chưa nằm trong bản đầu. Thay đổi các giả định này khi người dùng mô tả nghiệp vụ, trước khi khóa schema.

## Thứ tự triển khai và điều kiện hoàn thành

| Giai đoạn | Kết quả cần có | Phụ thuộc | Điều kiện nghiệm thu |
| --- | --- | --- | --- |
| **P0 — hiện tại** | Phân tích 13 ảnh; kiến trúc, mô hình sơ bộ, roadmap; source chạy local; nền PWA | Ảnh và định hướng nền tảng | Build/typecheck; điều hướng desktop/mobile; manifest/icon; trang mất mạng; ghi rõ tính năng chưa có |
| **P1 — dòng tiền nền** | Auth riêng tư; tài khoản; số dư đầu kỳ; thu/chi/chuyển tiền; sửa/hủy có lịch sử; API v1 | Chốt cách ghi giao dịch, tài khoản và nợ | Thu/chi đúng số dư; chuyển nội bộ không thành thu/chi; không ghi trùng khi retry; RLS chặn truy cập chéo; dùng được hai thiết bị |
| **P2 — ngân sách và nhập nhanh** | Ngân sách có hiệu lực, số còn lại/chuyển tiếp; mẫu nhập; giao dịch định kỳ; nhập CSV thu/chi có dry-run | P1 và quy tắc ngân sách | Đổi kế hoạch không làm sai quá khứ; nhập lại CSV không nhân đôi; bỏ qua/hoàn tác batch được; xác nhận trước khi ghi |
| **P3 — tích lũy và mục tiêu** | Tiết kiệm, quỹ an toàn, goals, phân bổ từ tiền/tài khoản; đáo hạn | P1 và quy tắc lãi/quỹ | Một khoản tiền không bị tính hai lần; lãi dự kiến khác lãi thực nhận; phân bổ có giới hạn và lịch sử |
| **P4 — đầu tư** | Từng mã/nhóm tài sản; mua/bán; phí/thuế; giá vốn; realized/unrealized; phân bổ mục tiêu | P1, chốt phạm vi tài sản và phương pháp giá vốn | Mua/bán nguyên tử; bán một phần đúng giá vốn; tiền chờ khớp; giá có thời điểm; không ROI giả cho cash |
| **P5 — báo cáo và đồng bộ nâng cao** | Timeline định giá, dashboard hoàn chỉnh; export; PWA nhập offline theo hàng đợi và xử lý xung đột | P1–P4 và chính sách đồng bộ | Báo cáo đối soát được; retry/offline không trùng; sửa chéo không mất dữ liệu; sign-out không để lộ cache |
| **P6 — chuyển đổi và đưa vào dùng** | Migration Notion hoàn chỉnh, đối soát, backup/restore, preview rồi production | Dữ liệu export và các module đã nghiệm thu | Tổng khớp nguồn đã xác nhận; thử khôi phục; smoke test production; người dùng dùng thử song song với Notion |
| **P7 — Flutter iOS** | App Flutter/Dart dùng cùng API/Auth; cài trực tiếp lên iPhone cá nhân | Web ổn định, yêu cầu iOS và phương án signing cụ thể | Hai client cho cùng kết quả; lifecycle/offline/login/deep link và hạn signing được kiểm tra trên thiết bị thật |

Không chờ đến P5 mới xem số liệu: P1 có tổng thu/chi và số dư cơ bản; P2/P3/P4 có báo cáo tối thiểu cho chính module. P5 hoàn thiện dashboard liên kết và lịch sử định giá.

PWA có ngay ở P0 theo mức cài lên màn hình chính và trang dự phòng mất mạng. **Nhập liệu offline và tự đồng bộ là chức năng riêng**, xây sau khi đường ghi dữ liệu online đã đúng. Chưa dùng P0 để lưu tài chính thật.

## Bản dùng thử đầu tiên nên tập trung vào điều gì?

P1 + P2 tạo vòng sử dụng hàng ngày: chọn tài khoản → ghi thu/chi/chuyển tiền → số dư tự đổi → ngân sách tự cập nhật. Mục đích là loại bỏ việc nhập lặp ở các bảng hiện tại trước khi bổ sung nhiều biểu đồ.

Các nhánh savings/quỹ/đầu tư có thể được đổi thứ tự theo ưu tiên của người dùng. Mỗi module đi qua: đặc tả → ví dụ giao dịch → mô hình dữ liệu → luồng UI → triển khai → kiểm thử → dùng thử. Chỉ chốt ước lượng lịch sau khi đã có đặc tả module và dữ liệu import mẫu.

## Tự động hóa theo mức độ

1. Tự tính tổng, số dư, tỷ lệ và báo cáo từ giao dịch.
2. Mẫu thao tác, sao chép khoản gần đây, giao dịch định kỳ có xác nhận.
3. CSV có ánh xạ cột, nhận diện trùng và đối soát.
4. Nhắc đến hạn/đáo hạn và giá thị trường khi có nguồn phù hợp.
5. OCR hoặc tích hợp ngân hàng nếu thực sự cần và có điều kiện kỹ thuật phù hợp.

Chưa xây ở P0: AI tư vấn đầu tư, kết nối tài khoản ngân hàng, giao dịch chứng khoán tự động, scraping web, blockchain wallet hoặc hệ thống nhiều tổ chức. Các tỷ trọng/mục tiêu trong ảnh là cấu hình tham khảo của người dùng, không phải khuyến nghị đầu tư.
