# Đầu tư theo tổng danh mục

Đặc tả đã xác nhận và triển khai source ngày 18/10/2026 tại `/investments`. VND, nhiều ví tiền chờ, theo tổng danh mục; không quản lý mã, khối lượng hoặc từng lô. Notion là ngữ cảnh, không phải dữ liệu import hoặc giao diện để sao chép. Đầu tư độc lập với Thu nhập, Chi tiêu và Tiết kiệm; không tự cộng tài sản Đầu tư vào tài sản ròng toàn ứng dụng hoặc nhập lại vàng đang có ở Tiết kiệm.

## Bắt đầu và bốn tab

1. **Quản lý:** thêm danh mục đầu tư hoặc ví tiền chờ; tên, emoji, ghi chú và ngày bắt đầu. Có gợi ý Cổ phiếu, Quỹ cổ phiếu, Quỹ trái phiếu, Crypto và tiền chờ TCBS, chỉ tạo khi chọn lưu.
2. Nếu đã có tài sản, ghi một giao dịch mở đầu tại ngày bắt đầu của từng danh mục: vốn còn lại và giá trị thị trường; ví nhập số dư tiền. Mở đầu phải đứng trước mọi phát sinh của danh mục, kể cả giao dịch liên quan từ phía ví. Nó không phải tiền nạp mới hoặc lợi nhuận trong kỳ.
3. **Danh mục:** tổng tài sản, vốn còn giữ, tiền chờ, lãi đã/chưa chốt và tổng; bảng trên desktop, thẻ trên điện thoại. Chi tiết từng danh mục mở mua, bán, nạp, rút, chuyển ví, định giá và lịch sử liên quan.
4. **Giao dịch:** ngày, loại, danh mục/ví, tiền ròng, ghi chú; xem hai phía trước/sau và các phiên bản sửa/hủy. Có lựa chọn xem cả giao dịch đã hủy.
5. **Báo cáo:** tháng/quý/năm hoặc khoảng ngày xuyên năm; chọn danh mục hoặc ví và loại giao dịch. Có diễn biến tài sản, dòng tiền, kết quả tháng, cơ cấu, bảng thay thế và CSV.
6. **Quản lý:** cấu hình theo ngày hiệu lực và lưu trữ/khôi phục danh mục. Sao lưu/khôi phục toàn tài khoản thực hiện trong [Cài đặt](backup.md); API backup riêng giữ tương thích.

Ngày và số thực tế không vượt hôm nay tại Asia/Ho_Chi_Minh. Số tiền VND nguyên không âm dạng chuỗi, tối đa 24 chữ số mỗi đầu vào, tính bằng BigInt. Không ép tiền qua float. Phần trăm ROI lưu ở đơn vị phần trăm × 100; ví và vốn bằng 0 không có ROI.

## Giao dịch và công thức

| Loại | Cách ghi nhận |
|---|---|
| Mở đầu ví | Số dư ban đầu, cho phép 0 |
| Mở đầu tài sản | Giá vốn và định giá mở đầu riêng, cho phép 0 |
| Nạp / rút | Tăng/giảm tiền ví, ghi nguồn/đích bên ngoài nếu cần |
| Chuyển ví | Hai ví khác nhau, một thao tác, không phát sinh lợi nhuận |
| Mua | Giá vốn tăng bằng tiền mua + phí + thuế; trừ ví hoặc tính dòng vốn từ bên ngoài |
| Bán | Nhập giá vốn phần bán; giảm vốn, nhận tiền bán − phí − thuế vào ví hoặc ra bên ngoài |
| Định giá | Tổng giá trị thị trường của danh mục tại ngày chọn; không đổi tiền hoặc vốn |

Mua/bán bắt buộc nhập giá trị phần tài sản **còn giữ sau giao dịch**, không gồm tiền chờ. Nạp/Rút trên tài sản trong Notion được thống nhất thành Mua/Bán có nguồn/đích Bên ngoài. Phí/thuế hiện chỉ đi cùng Mua/Bán, không có khoản cổ tức, lãi hoặc phí riêng.

- Lãi đã chốt = tiền bán − phí − thuế − giá vốn phần bán.
- Lãi chưa chốt = giá trị còn giữ − giá vốn còn lại.
- Tổng lãi/lỗ theo dõi = tổng đã chốt + chưa chốt. Phí mua nằm trong giá vốn, phí bán đã trừ khỏi tiền nhận; không trừ lại vào tổng lãi/lỗ.
- ROI chưa chốt = lãi chưa chốt / giá vốn còn lại. Tiền chờ không có ROI; giá vốn bằng 0 hiển thị `—`, kể cả khi giá trị thị trường dương.
- Ví dụ: bán 30.000.000, giá vốn bán 25.000.000, phí/thuế 200.000 → nhận 29.800.000 và lãi 4.800.000.
- “Bán hết” điền toàn bộ vốn còn lại tại ngày/thứ tự giao dịch và giá trị sau bán bằng 0; tiền bán vẫn do người dùng nhập. Cho phép bán thu 0 để ghi mất toàn bộ vốn. Có thể bán tài sản vốn 0 khi tiền bán lớn hơn 0.
- Không cho âm ví, âm vốn, phí/thuế vượt tiền bán, chuyển cùng ví hoặc dùng danh mục đầu tư làm ví thanh toán.

## Sửa đổi và điều kiện xóa

Sửa/hủy thêm revision có lý do và thời điểm, không cập nhật hoặc xóa trực tiếp bản cũ. Bản sửa giữ ID và loại giao dịch; được sửa ngày, danh mục và số tiền nếu toàn bộ lịch sử sau đó vẫn hợp lệ. Định giá là sự kiện có revision như giao dịch, lưu trong bảng định giá riêng.

Thứ tự tính theo ngày và thứ tự ghi **gốc** trong ngày; sửa không đẩy giao dịch xuống sau các giao dịch phụ thuộc. Định giá ở các mốc sau giữ nguyên số đã khai báo khi sửa quá khứ, không tự ước tính lại.

Xóa là lưu trữ, giữ lịch sử và khôi phục được. Tại thời điểm lưu trữ:

- Danh mục đầu tư: cả vốn và giá trị phải bằng 0; thiếu định giá không bằng 0.
- Ví tiền chờ: số dư phải bằng 0.
- Lãi đã chốt không cản lưu trữ. Mọi sửa/hủy lùi ngày cũng phải bảo toàn điều kiện tại từng mốc lưu trữ.

Ngày hiệu lực và thứ tự ghi xác định lưu trữ/khôi phục trong cùng ngày: có thể bán hết rồi lưu trữ cùng ngày, nhưng không thêm giao dịch vào giai đoạn đã lưu trữ. Loại danh mục chỉ đổi khi chưa từng có phát sinh, kể cả lịch sử đã hủy. Metadata có ngày hiệu lực; báo cáo cũ giữ tên tại ngày đó.

## Định giá và báo cáo

Dùng định giá gần nhất không muộn hơn ngày báo cáo. Mở đầu và mua/bán cũng cung cấp một mốc định giá rõ ràng. Giá trị mang từ tháng cũ hiện ngày cập nhật và cảnh báo cũ. Không lấy số ở tương lai cho báo cáo quá khứ; thiếu định giá trả tổng đầy đủ `null`, vẫn có phần giá trị đã biết. Không coi thiếu số liệu là tài sản 0.

Tổng tài sản gồm tài sản đầu tư và ví tiền chờ. Lãi đã chốt chỉ tính từ ngày bắt đầu theo dõi; lãi chưa chốt dùng giá vốn mở đầu thực tế nên có thể gồm biến động trước ngày bắt đầu. Không nhập lãi đã chốt lịch sử từ ảnh.

Kết quả trong kỳ = tài sản cuối − tài sản đầu − vốn ngoài nạp ròng − dòng chuyển nội bộ ròng vào phần được lọc − tài sản mở đầu trong kỳ. Toàn module có chuyển nội bộ ròng bằng 0; báo cáo riêng danh mục/ví vẫn đối chiếu dòng chuyển liên quan. Tiền mua trực tiếp từ ngoài là vốn vào; bán về ngoài là vốn ra. Đây là chỉ số khác tổng lãi/lỗ đang theo dõi.

Lọc loại giao dịch chỉ lọc chỉ số hoạt động và dòng giao dịch xuất CSV. Số dư, kết quả kỳ và bảng danh mục dùng toàn bộ lịch sử cần thiết. Quý/năm lấy tài sản cuối kỳ, không cộng các số dư tháng. Tháng hiện tại tạm tính; tháng tương lai và tháng trước ngày bắt đầu theo dõi có ô trống, không tạo đường lịch sử giả. Biểu đồ dùng tỷ lệ từ BigInt rồi mới chuyển tọa độ; không cộng tiền bằng Number.

Privacy Mode che tiền, giá trị, phí/thuế, dữ liệu trước/sau, lịch sử, tooltip và nhãn trợ năng; tỷ lệ vẫn giữ. Form có nút hiện riêng và tự che lại khi rời nền. CSV/JSON luôn đầy đủ số tiền, có nhắc ở khu vực sao lưu; CSV bảo vệ ô văn bản bắt đầu bằng công thức.

## API và lưu trữ

| Endpoint | Hợp đồng |
|---|---|
| `GET /api/v1/investments` | `asOf=YYYY-MM-DD` hoặc `month=YYYY-MM`, trả book và trạng thái không muộn hơn hôm nay |
| `POST /api/v1/investments/preview` | Kiểm tra command và trả trước/sau; không ghi |
| `POST /api/v1/investments/commands` | Lưu nguyên tử, version và idempotency |
| `GET /api/v1/investments/reports` | `from`, `to`, `categoryId` (gồm ví), `kind`, `transactionKind`; `format=csv` để tải |
| `GET /api/v1/investments/backup` | Toàn book và audit, `schemaVersion: 1` |

Command `{ id: UUID, expectedVersion: number, action }`. Action gồm createCategory, configureCategory, archiveCategory, restoreCategory, postTransaction, reviseTransaction; schema nguồn ở `src/domain/investments/schema.ts`. Định giá dùng post/reviseTransaction với kind `valuation`.

Migration `supabase/migrations/202610180001_investments.sql` bổ sung sáu bảng: investments_books, investments_categories, investments_transactions, investments_valuations, investments_audit, investments_commands. Quan hệ cùng owner, lịch sử append-only, JSONB giữ chuỗi tiền chính xác; không lưu thêm số dư để cộng trùng. Mua/bán gồm ảnh hưởng hai phía trong một transaction DB; không tạo hai lệnh độc lập.

Dùng role runtime `expense_api`, Auth cookie/bearer xác minh phía server, RLS từng bảng, advisory lock theo owner, version conflict và command ID chống trùng. API không nhận owner từ client; private/no-store. Cookie POST kiểm Origin. Trang `/investments` await `pageAccess` trước khi render workspace.

Form xem trước rồi xác nhận lưu; lỗi mạng giữ nội dung, version conflict cho tải dữ liệu mới và xem trước lại. Nếu mất phản hồi sau lúc gửi lưu, khóa sửa nội dung và thử lại cùng ID để không tạo bản ghi trùng.

## Migration, review và giới hạn

Chạy migration mới bằng role migration/admin sau các migration hiện có, thử staging trước; không chạy lại migration cũ và không dùng service-role ở runtime. Triển khai source/local không tự áp dụng migration, seed hoặc reset cloud.

`npm run data:preview` có thêm bảy danh mục/ví Đầu tư, số mở đầu, mua, bán lãi/lỗ, chuyển ví, rút, định giá mới/cũ và danh mục đã tất toán; dùng production app + PostgreSQL/Auth double local cô lập. Đường dẫn mặc định mở `/investments`, vẫn có toàn bộ dữ liệu mẫu các module trước. Xem `docs/10-sample-data.md`.

Kiểm tra: `npm test`, `npm run test:db`, `npm run typecheck`, `npm run build`; `TEST_WEBKIT=1 npm run test:e2e -- investments.spec.ts landing.spec.ts`. Bằng chứng browser là desktop Chromium, Chromium mô phỏng điện thoại và WebKit mô phỏng iPhone; không thay thế kiểm tra Supabase cloud, deploy hoặc thiết bị thật.

Chưa có từng mã/lô, ngoại tệ/tỷ giá, giá trực tuyến, cổ tức/lãi riêng, chốt tháng, DCA/tỷ trọng mục tiêu, liên kết tiền sang module khác hoặc nhập/khôi phục backup riêng Đầu tư. Backup toàn tài khoản đã có tại Cài đặt.

## Bộ mẫu theo ảnh Notion cho cùng tài khoản — 18/10/2026

`data:investments:sample -- --base <bộ mẫu Tiết kiệm>/sample-data.json` tạo phần bổ sung Đầu tư có marker cùng bộ review, các số vốn/định giá tham khảo ảnh và nhiều tình huống tự tạo. Không ghi đè ba module trước. Có SQL migration+seed nguyên tử cho admin, seed qua runtime sau khi có schema, backup và reset đủ 28 bảng. Reset mặc định chưa xác nhận, chỉ được dùng sau review.

Lần kiểm tra tài khoản mục tiêu: đã có Tiết kiệm trên cloud, chưa có schema Đầu tư; runtime không có quyền tạo bảng. Đã lưu backup các module trước và chuẩn bị file 01-enable-and-seed.sql, **chưa nạp Đầu tư cloud**. Xem [hướng dẫn dữ liệu review](../10-sample-data.md#bộ-review-đầu-tư-cùng-tài-khoản-và-reset-28-bảng--18102026).


## Giao diện chi tiết — 18/10/2026

Chi tiết danh mục ưu tiên giá trị/vốn/lãi lỗ, lịch sử có lọc và phân trang. Chi tiết giao dịch ưu tiên phiên bản hiện hành, ảnh hưởng Trước/Sau, tách tab lịch sử sửa/hủy. Mở form không đóng parent; lưu thành công cập nhật và quay về đúng nơi. Preview dùng nhãn Trước/Sau và footer luôn tiếp cận được. Xem [quy chuẩn dialog](ui-feedback.md).

## Help theo ngữ cảnh — 20/10/2026

Hướng dẫn tổng danh mục, ví tiền chờ, giá vốn bán nhập tay, giá trị sau giao dịch, định giá và kết quả kỳ; không mô tả quản lý từng mã hoặc lấy giá trực tuyến. Xem [Help theo từng trang](help.md).

## Quy chuẩn giao diện dùng chung — 20/10/2026

Bảng rộng cho chọn cột và giữ lựa chọn trên trình duyệt; cột định danh/thao tác luôn hiện. Form sửa vô hiệu lưu/xem trước khi dữ liệu nghiệp vụ chưa đổi, kể cả khi chỉ nhập lý do. Tiền nguyên bỏ số 0 đầu khi blur/submit; field bắt buộc và lỗi có chỉ báo, nội dung lỗi tiếng Việt và tổng hợp lỗi dẫn về trường tương ứng. Thao tác sửa/hủy có icon, hành động hủy giao dịch dùng màu nguy hiểm; đóng form con tiếp tục giữ ngữ cảnh dialog cha. Xem [đối chiếu phản hồi toàn ứng dụng](interface-feedback-2026-10-19.md).

## Phản hồi nhập liệu — 21/10/2026

Tiền, giá theo đơn vị, phí và thuế đọc số VND dưới ô; số lượng và tỷ lệ giữ đơn vị riêng. Lỗi kiểm tra hoặc API ở đúng trường, kèm focus. Toast phân biệt ghi thành công, thất bại và chưa rõ kết quả; lỗi tải lại sau ghi có thông báo riêng. Footer dialog giữ vị trí khi nội dung dài.

## Anh/Việt — 22/10/2026

Giao diện, Help và thông báo dùng ngôn ngữ trong Cài đặt; định dạng vi-VN/en-GB, vẫn VND và giờ Việt Nam. Tên/ghi chú và dữ liệu tài chính giữ nguyên. CSV nhận `locale=vi|en` (mặc định vi), dịch tên cột/nhãn hệ thống nhưng giữ số/ngày dạng chuẩn và chống công thức CSV. Không có migration hay đổi cấu trúc backup. Xem [đặc tả ngôn ngữ](localization.md).

## Bố cục và cuộn — 23/10/2026

Tab workspace một hàng cuộn ngang; điều hướng phím giữ vị trí trang. Bảng danh mục/báo cáo tách toolbar khỏi vùng dữ liệu cuộn ngang. Xem [ma trận rà soát](layout-scroll-2026-10-23.md).

## Minh họa riêng theo chủ đề — 26/10/2026

Tiêu đề dùng vườn cây ăn quả, thuyền buồm, cân tài sản, lò gốm hoặc cầu đá theo năm theme, khác hình Tiết kiệm. Trạng thái trống dùng cảnh khởi đầu thay cho việc lặp hình tiêu đề. Minh họa hiện cả trên điện thoại và trong preview thành viên, hỗ trợ sáng/tối; hình trang trí tĩnh không phản ánh số dư, kết quả hoặc cam kết sinh lời. Xem [bảng minh họa](themes.md#minh-họa-tiết-kiệm-và-đầu-tư--26102026).

## Tỷ lệ minh họa tiêu đề — 26/10/2026

Giữ bộ năm cảnh Đầu tư riêng, dùng bố cục tiêu đề chung thay các kích thước cũ 180/120/96px. Khung hình mới 240–320px trên desktop/tablet và 216px ở hàng riêng dưới chữ trên điện thoại. Không đổi cảnh khởi đầu hoặc các chỉ số tài chính. Xem [chủ đề giao diện](themes.md).
