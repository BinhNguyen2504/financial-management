# Báo cáo chung — 02/11/2026

Trạng thái: triển khai source; validation local ghi riêng trong docs/07-validation.md. Không suy ra đã triển khai cloud, real Auth/RLS hoặc kiểm thử thiết bị vật lý.

## Xem và đối chiếu

Mở `/reports`, mặc định Tổng hợp/tháng hiện tại. Có tab Thu–chi, Tiết kiệm, Đầu tư, Quỹ an toàn, Mục tiêu. Chọn tháng/quý/năm, URL giữ lựa chọn khi tải lại hoặc quay về. Các kỳ nằm trong một năm, kỳ trước có thể thuộc năm trước. Không có khoảng ngày tùy chọn hoặc báo cáo nhiều năm trong một kỳ.

Mọi số trong kỳ hiện tại dừng tại hôm nay theo Asia/Ho_Chi_Minh. Tháng chưa diễn ra không trở thành thực tế. Kỳ chưa kết thúc vẫn so với toàn bộ kỳ trước và có nhãn rõ, không chia số tháng theo tỷ lệ ngày. Chênh lệch tuyệt đối tính bằng BigInt; phần trăm chỉ có khi mốc trước dương. Giá trị 0 khác chưa nhập, thiếu định giá hoặc nguồn lỗi; dữ liệu chưa đầy đủ có cảnh báo.

Bấm chỉ số để xem các dòng đóng góp vào số đó; 20 dòng/trang, chỉ đọc. Giá trị cuối kỳ đối chiếu với vị thế/số dư, dòng tiền đối chiếu giao dịch. Nếu nguồn thay đổi, cập nhật báo cáo trước khi xem chi tiết. Nút sang module gốc dành cho điều chỉnh. Bảng có sắp xếp, phân trang; CSV không bị cắt theo trang bảng.

## Ý nghĩa số liệu

- Thu nhập dùng tổng tháng đã ghi nhận, phân biệt cố định/phát sinh và khoản chưa nhập.
- Chi tiêu dùng materialize sổ hũ: chi tháng suy từ tiền có trừ dư cuối; hũ tích lũy dùng các lần sử dụng. Tiền góp hũ không phải thực chi. Năm đã chốt đọc snapshot; năm cũ chưa chốt mang nhãn có thể thay đổi. API báo cáo riêng của Chi tiêu vẫn giữ phạm vi năm hiện tại.
- Chênh lệch theo sổ = Thu nhập đã ghi nhận − Chi tiêu theo sổ hũ. Đây chưa phải số dư tài khoản hoặc tiền có thể sử dụng.
- Tiết kiệm giữ nghiệp vụ đầu/cuối kỳ, nạp/rút bên ngoài, kết quả trong kỳ và phân bổ theo danh mục; không dùng giá tương lai, giá cũ có cảnh báo.
- Đầu tư: tổng = tài sản đang giữ + tiền chờ; lãi/lỗ = giá trị tài sản − giá vốn phần đang giữ. Bán hết trả giá vốn/giá trị tài sản/lãi lỗ về 0, giữ tiền trong ví. Không trình bày lãi đã bán.
- Quỹ an toàn: giải quyết bản sửa/hủy mới nhất trước, rồi lọc ngày giao dịch theo giờ Việt Nam. Từ 26/11/2026, số dư gồm danh mục Tiết kiệm đã gắn, lấy tại ngày báo cáo và chỉ từ lúc liên kết được lưu; mục góp/rút chỉ gồm giao dịch trong sổ Quỹ và báo cáo có cảnh báo. Tab Quỹ đọc thêm sổ Tiết kiệm (chỉ liệt kê là nguồn khi có liên kết); tiến độ của quỹ có liên kết đã đủ mục tiêu ghi 100%; có liên kết mà không đọc được Tiết kiệm thì phần Quỹ báo lỗi thay vì hiện số thiếu. Số đầu/cuối kỳ replay riêng; mục tiêu theo cấu hình đã xác nhận tại cuối kỳ. Góp/rút loại số dư ban đầu và chuyển nội bộ. Chuyển giữa quỹ/nơi giữ giữ nguyên tổng.
- Mục tiêu dùng tiến độ hiện tại, ghi thời điểm cập nhật, kể cả đang xem kỳ cũ. Không dựng lịch sử tiến độ và không cộng Mục tiêu liên kết vào tài sản nguồn.

Từ 28/11/2026, riêng tab Tổng hợp có tổng **Tài sản đã ghi nhận** theo quy tắc ở mục dưới; đây không phải tài sản ròng. Các tab khác vẫn giữ riêng từng sổ. Báo cáo không có ghi sổ, chuyển tiền, dự báo lợi nhuận, PDF hoặc tự chốt kỳ.

## Tổng hợp: tài sản đã ghi nhận và sức khỏe tài chính — 28/11/2026

Thứ tự trên tab: dòng kỳ báo cáo → card tài sản → card sức khỏe → số liệu trong kỳ (Thu, Chi, Chênh lệch) → chi tiết kỳ → biểu đồ → sáu bảng chi tiết thu gọn. Kỳ chưa diễn ra không có hai card đầu. Request chi tiết số liệu không tính tổng quan. CSV tab Tổng hợp gồm thêm khối tài sản và sức khỏe; bảng vẫn đầy đủ.

Chú thích nằm trong card mà nó giải thích: chú thích dòng tiền ở cuối khối số liệu (Tổng hợp, Thu–chi); chú thích Mục tiêu kèm giờ cập nhật ở card bảng Mục tiêu (ở Tổng hợp thêm trong card biểu đồ khi đang chọn chỉ số Mục tiêu). Câu “không cộng thành tài sản ròng” ở cuối mọi tab được thay bằng chú thích trong card tài sản.

### Tài sản đã ghi nhận

`Tiết kiệm + Đầu tư (gồm tiền chờ) + Quỹ an toàn − phần Quỹ đang liên kết từ Tiết kiệm`, tại ngày chốt số của kỳ.

- Nguồn lỗi hoặc thiếu định giá: tổng là “—” kèm lý do, không thay bằng 0. Sổ chưa ghi giao dịch nào tính 0 và card nói rõ; cả ba chưa ghi thì tổng và cơ cấu là “—”. Liên kết Quỹ chỉ làm sổ Quỹ thành “đã ghi” khi danh mục Tiết kiệm đã có giao dịch đến ngày đó.
- Thay đổi so với ngày trước đầu kỳ gồm góp/rút, đổi định giá và số dư mới ghi, không phải lợi nhuận. Không so sánh khi có sổ bắt đầu ghi trong kỳ, đầu kỳ chưa ghi gì hoặc đầu kỳ thiếu dữ liệu. Liên kết Quỹ tạo trong kỳ không làm tăng tổng.
- Cơ cấu: tiền mặt, tiền gửi, vàng (từ Tiết kiệm), đầu tư, quỹ ngoài phần liên kết; năm dòng cộng đúng bằng tổng, tỷ trọng cắt ở hai chữ số thập phân.
- Chưa trừ nợ (ứng dụng chưa ghi nợ). Tiền nhập tay ở hai sổ không được tự loại trùng. Không gồm tiền còn trong hũ Chi tiêu và sổ riêng của Mục tiêu.

### Sức khỏe tài chính

Mỗi chỉ số xếp mức riêng, không có điểm tổng. Chỉ số theo tháng dùng các tháng đã kết thúc trong kỳ; kỳ chưa có tháng kết thúc thì dùng tháng liền trước tháng hiện tại và ghi rõ. Tháng bị loại được liệt kê kèm lý do.

| Chỉ số | Tốt | Cần chú ý | Cần cải thiện | Chưa đủ dữ liệu |
| --- | --- | --- | --- | --- |
| Quỹ dự phòng: số dư quỹ khẩn cấp / chi sinh hoạt tháng đã xác nhận, tại ngày chốt | ≥ 6 tháng | 3 đến dưới 6 | dưới 3 | Chưa xác nhận mức sinh hoạt, chưa ghi hoặc liên kết gì vào quỹ khẩn cấp, hoặc nguồn lỗi |
| Tỷ lệ để dành: (Σthu − Σchi) / Σthu | ≥ 20% | 0 đến dưới 20% | âm | Không còn tháng hợp lệ. Loại tháng chưa ghi hoặc còn thiếu thu, không có hũ, có hũ chi chưa bỏ tiền, tổng chi bằng 0 |
| Giữ ngân sách: hũ chi tháng đang dùng đã nhập số dư cuối | không hũ vượt | tổng vượt ≤ 5% ngân sách của các hũ được tính | vượt hơn 5% | Không có hũ nào đã nhập số dư cuối; tháng có hũ chưa bỏ tiền bị loại |
| Tiến độ mục tiêu đang thực hiện, theo hôm nay | có ít nhất một mục tiêu đúng kế hoạch, không có mục tiêu quá hạn, chậm hoặc không đọc được nguồn | có mục tiêu mà mức góp dự kiến thấp hơn mức cần | có mục tiêu quá hạn | Không có mục tiêu đang thực hiện, chưa đặt hạn, hoặc không đọc được nguồn |

- Tỷ lệ để dành giữ quy tắc engine: hũ chi chưa nhập số dư cuối tính là đã chi hết; số lượt hũ như vậy được hiển thị.
- Phần thừa của hũ này không bù phần vượt của hũ khác.
- Mục tiêu không đọc được nguồn được xét trước điều kiện quá hạn. Mục tiêu đã đủ tiền là đúng kế hoạch; mục tiêu chưa đặt hạn không bị xếp xấu; mục tiêu tạm dừng không tính.
- Chế độ che tiền che số tiền, tỷ trọng, tỷ lệ, số tháng và thanh cơ cấu; nhãn mức và số đếm vẫn hiện.

Code: `src/domain/reports/health.ts` (thuần, BigInt), snapshot lấy từ `build.ts`. Không đổi repository, API chi tiết, schema hoặc migration; response `/api/v1/reports` thêm trường tùy chọn `overview` cho tab summary.

## API và an toàn dữ liệu

GET `/api/v1/reports?tab=summary&period=month&year=2026&month=11` trả report query, period/from/to/asOf/partial/future, previousPeriod, generatedAt, versions, sources, warnings, metrics và tables. Tab là summary|cashflow|savings|investments|funds|goals. Year 2000–2099, month 1–12; mặc định năm/tháng Việt Nam hiện tại. Quý được xác định từ month.

GET `/api/v1/reports/details` nhận cùng bộ lọc và metric, versions, page>=1. Trả rows/columns/total/page/label; mỗi trang 20 dòng. Nguồn đổi, reset generation đổi hoặc ngày nghiệp vụ/kỳ đối chiếu không còn khớp trả 409 REPORT_CHANGED. Source lỗi không trả số 0; các source còn đọc được vẫn hiển thị, Mục tiêu liên kết đánh dấu nguồn không khả dụng.

Owner lấy từ Auth đã xác minh. Đọc trong transaction PostgreSQL repeatable-read/read-only, runtime role/RLS và savepoint từng source. Không đọc audit/command hoặc lưu baseline mutation. Không migration, seed, reset hoặc ghi tài chính. Trang await pageAccess và cả hai API private/no-store. Không persist dữ liệu tài chính trên trình duyệt. Response cũ không thay thế lựa chọn mới; tài khoản đổi remount workspace.

CSV UTF-8 BOM/CRLF, VND nguyên dạng chuỗi, metadata kỳ hiện tại/kỳ so sánh/asOf, cảnh báo và trạng thái nguồn. Xuất toàn bộ dữ liệu tab đang xem, có nhãn Mục tiêu hiện tại, vi/en và escape dấu nháy/newline/công thức. Chế độ che tiền không làm mất số đầy đủ trong file người dùng chủ động tải, cùng quy ước CSV hiện có.

## Giao diện và tài liệu

Dùng shell/font/token/theme sẵn có, hướng Achromatic ledger; biểu đồ SVG theo số liệu thật, không nối qua điểm thiếu, bảng thay thế, tooltip hỗ trợ chuột/chạm/Tab. Help vi/en, catalog, README, kiến trúc, UX và preview landing cập nhật cùng tính năng. Preview dùng 28.500.000 thu, 12.000.000 chi, chênh lệch tính từ hai số này; không đọc API tài chính.

### Phân tách bảng — 05/11/2026

Mỗi bảng trong mọi tab có card riêng với viền và khoảng cách 24px. Tên bảng và đơn vị VND nằm cùng hàng; caption giữ cho công nghệ hỗ trợ, không lặp tên giữa card. Header dùng nền `surface-alt`, chữ đậm và đường phân cách rõ hơn hàng dữ liệu; số căn phải với chữ số tabular. Áp dụng cả bảng đối chiếu trong dialog, giữ sắp xếp, phân trang, lựa chọn cột và cuộn ngang bên trong bảng trên màn hình nhỏ. Landing dùng cùng cách phân biệt header với dữ liệu minh họa cố định; catalog, nội dung giới thiệu và README đã đồng bộ. Không đổi phép tính, API, dữ liệu hoặc schema.

### Cải thiện thao tác — 04/11/2026

Đối chiếu [thiết kế dùng chung](workspace-comfort-2026-11-04.md): đầu trang gọn, bảo vệ nháp và giữ ngữ cảnh xem theo tài khoản trong phiên. Các lựa chọn nghiệp vụ, dữ liệu và lịch sử hiện có được giữ. Phần khôi phục/làm trống nằm sau lựa chọn giao diện trong Cài đặt; không thay điều kiện restore/reset.

### Tối ưu tải dữ liệu — 04/11/2026

Đối chiếu [hợp đồng dùng chung](performance-2026-11-04.md): đọc snapshot/projection, phản hồi view sau commit cho sáu sổ, chi tiết Báo cáo theo metric và foreground chống tải lặp ở Cài đặt. Giữ quy tắc tiền, lịch sử, phiên bản và owner/RLS; không thêm migration hoặc suy ra trạng thái cloud.


## Nội dung cho người dùng phổ thông — 04/11/2026

Đã rà soát cách gọi, hướng dẫn bắt đầu/đọc số liệu và khả năng tìm thao tác theo [bảng đối chiếu nội dung và tác vụ](friendly-content-2026-11-04.md). Giữ nguyên nghiệp vụ và dữ liệu; kết quả kiểm chứng mới ghi riêng trong nhật ký validation.
