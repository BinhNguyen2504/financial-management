# Tiết kiệm

Triển khai ngày 17/10/2026 tại `/savings`. Tiền/ví, sổ tiền gửi và vàng dùng chung một lịch sử liên tục qua nhiều năm. Đây là tài sản **trong Tiết kiệm**, chưa phải toàn bộ tài sản ròng. Ảnh Notion chỉ là ngữ cảnh; không nhập tự động số liệu hay suy diễn đơn vị vàng từ ảnh.

## Bắt đầu và thao tác

1. Thêm danh mục, chọn loại tài sản, emoji và tháng bắt đầu. Vàng phải chọn `chỉ`, `lượng/cây` hoặc `gram`; chưa chuyển đổi giữa các đơn vị.
2. Nếu đã có tài sản, ghi giao dịch mở đầu tại ngày bắt đầu theo dõi: tiền, từng sổ gửi, hoặc từng đợt vàng với giá vốn và giá định giá riêng. Các khoản mở đầu cùng danh mục phải cùng ngày và trước mọi giao dịch của danh mục; không tính là nạp mới.
3. Ghi nạp/rút/chuyển, mở sổ/nhận lãi/rút gốc/tái tục hoặc mua/bán vàng. Chọn nguồn/đích tiền là ví trong Tiết kiệm hoặc bên ngoài. Chuyển nội bộ không được ghi thêm như khoản Thu nhập hoặc Chi tiêu.
4. Xem trước ảnh hưởng rồi xác nhận lưu. Bản nháp giữ trong form nếu lỗi mạng, Auth tạm thời hoặc xung đột; bấm tải dữ liệu mới trong form để giữ nội dung và xem trước lại.
5. Cập nhật giá bán lại dự kiến của vàng theo ngày. Giá mua và giá bán thực tế trong giao dịch không tự thay thế lịch sử giá, ngoại trừ giá định giá mở đầu được nhập rõ.
6. Chốt tháng đã kết thúc theo thứ tự từ tháng bắt đầu sớm nhất. Cần đủ giá; giá mang từ tháng cũ phải xác nhận. Mở lại kèm lý do làm mất hiệu lực các lần chốt sau đó, vẫn giữ snapshot cũ trong backup.

Tên, mô tả, emoji và trạng thái danh mục có tháng hiệu lực. Lưu trữ/xóa chỉ khi không còn tài sản, chọn tháng sau giao dịch cuối cùng; khôi phục được. Không xóa lịch sử, giá vốn hoặc báo cáo cũ.

## Quy tắc tính

- Tiền VND nguyên dạng chuỗi, tối đa 24 chữ số cho từng đầu vào. Số lượng vàng tối đa 18 chữ số nguyên và 6 chữ số lẻ; tính bằng BigInt với scale 1.000.000. Giá VND/đơn vị là số nguyên. Giá trị giao dịch/định giá làm tròn nửa lên đến đồng.
- Phí/thuế mua nằm trong giá vốn. Khi bán, chọn một hoặc nhiều đợt; form liệt kê từ cũ đến mới. Giá vốn phân bổ theo tỷ lệ lượng bán, làm tròn xuống, phần dư giữ cho lần bán cuối.
- Tiền bán ròng = lượng × giá bán − phí − thuế. Lãi/lỗ đã chốt = tiền bán ròng − giá vốn bán. Lãi/lỗ chưa chốt = giá trị phần còn giữ − giá vốn còn lại.
- Sổ tiền gửi giữ từng sổ riêng. Lãi thực nhận có thể nhập gốc hoặc nhận tiền vào ví/bên ngoài. Rút trước hạn nhập gốc, lãi và phí thực tế; không tự tính lãi ngân hàng. Tái tục chuyển toàn bộ gốc cùng phần lãi chọn vào sổ kế tiếp; phần lãi còn lại nhận bằng tiền.
- Kiểm tra số dư theo toàn bộ thứ tự ngày, kể cả khi sửa backdate. Cùng ngày dùng thứ tự ghi gốc, không đổi thứ tự khi sửa. Không cho số dư/khối lượng âm, bán vượt lô, liên kết sổ/lô sai danh mục.
- Sửa/hủy thêm revision liên kết giao dịch gốc, giữ bản cũ và lý do. Không sửa/xóa trực tiếp giao dịch đã ghi. Sửa tháng cũ có thể bị chặn bởi số dư hoặc sổ/lô được sử dụng ở các giao dịch sau.

## Báo cáo

Tháng/quý/năm/khoảng ngày xuyên năm, danh mục và loại tài sản. Giá tại ngày báo cáo chỉ lấy quan sát không muộn hơn ngày đó; giá mang tiếp có ngày và cảnh báo chưa cập nhật tháng. Thiếu giá trả tổng đầy đủ là `null`, vẫn trả phần đã định giá; không coi thiếu giá bằng 0 hoặc công bố tỷ trọng sai.

Số dư quý/năm là số cuối kỳ, không cộng các số dư tháng. Kết quả kỳ = tài sản cuối − đầu − vốn nạp ròng − dòng chuyển ròng vào phần đang lọc − tài sản mở đầu trong kỳ. Toàn bộ hệ thống có dòng chuyển nội bộ ròng bằng 0. Vốn mở đầu dùng giá trị định giá mở đầu, khác giá vốn gốc của vàng. Mỗi danh mục vẫn có thể báo kết quả riêng khi tiền được chuyển sang danh mục khác.

Bộ lọc loại giao dịch chọn các chỉ số hoạt động, cột nạp/rút, danh sách nguồn và các dòng giao dịch CSV. Số dư/kết quả đối chiếu luôn dùng toàn bộ giao dịch; giao diện giải thích rõ điều này. Không loại giao dịch nạp/mua khỏi phép tính tài sản chỉ vì người dùng đang lọc giao dịch bán.

Tháng hiện tại ghi tạm tính; tháng tương lai không có số thực tế/đường nối. Báo cáo gồm giá vốn, realized/unrealized, lãi thực nhận, phí/thuế, dòng tiền ngoài, chuyển nội bộ, cơ cấu và diễn biến tháng. Donut tối đa 5 lát, phần dư gộp Khác có key riêng. Có bảng thay thế và điểm SVG dùng bàn phím.

Tooltip mở khi rê chuột, chạm hoặc dùng Tab ở điểm tháng, từng cột nạp/rút, lát donut và hàng chú giải; Escape hoặc bấm ngoài để đóng. Điểm/cột ghi tháng, chỉ số, số tiền và trạng thái tạm tính; donut ghi tên, giá trị, tỷ trọng và ngày cuối kỳ. Thiếu dữ liệu hoặc tháng tương lai có thông báo riêng, không giả số 0. Bấm chuột không tạo viền quanh cả nhóm SVG/nhãn tháng; Tab giữ chỉ báo focus quanh điểm/cột/lát đang đọc. Áp dụng cả biểu đồ trong Danh mục và Báo cáo, tooltip dùng định dạng Privacy Mode hiện tại.

Privacy Mode che tiền, giá và lượng vàng trong bảng/form/tooltip/nhãn trợ năng; vẫn giữ tỷ lệ. Form có nút hiện riêng. CSV và JSON backup luôn chứa đầy đủ dữ liệu; sao lưu/khôi phục toàn tài khoản thực hiện trong [Cài đặt](backup.md). API xuất riêng Tiết kiệm vẫn tương thích nhưng file đó không dùng để import toàn tài khoản.

## API và lưu trữ

`GET /api/v1/savings?month=YYYY-MM` hoặc `asOf=YYYY-MM-DD` trả book, trạng thái tại ngày không vượt hôm nay, các tháng đã chốt và sổ đã/sắp đến hạn trong 7 ngày tính tại hôm nay.

| Endpoint | Hợp đồng |
|---|---|
| `POST /api/v1/savings/preview` | Kiểm tra command và trả trạng thái trước/sau, không ghi |
| `POST /api/v1/savings/commands` | Ghi nguyên tử, version và idempotency |
| `GET /api/v1/savings/reports` | `from`, `to`, `categoryId`, `kind`, `transactionKind`; thêm `format=csv` để tải CSV |
| `GET /api/v1/savings/backup` | JSON `schemaVersion: 1`, toàn bộ book, revision, giá, audit và lịch sử chốt |

Command `{id: UUID, expectedVersion: number, action}`. Action: createCategory, configureCategory, archiveCategory, restoreCategory, postTransaction, reviseTransaction, setPrice, closeMonth, reopenMonth. Schema ở `src/domain/savings/schema.ts` là hợp đồng nguồn. Tiền, giá, lượng là chuỗi decimal; API không nhận owner do client cung cấp. `postTransaction.transaction.id` định danh giao dịch/sổ/lô; revision giữ ID gốc.

PostgreSQL lưu dữ liệu JSONB với chuỗi decimal, không ép qua float. Bảng categories là cấu hình; transactions/prices/closes/audit/commands và quan hệ allocations append-only, có trigger bảo vệ. Khóa ngoại cùng owner bảo vệ danh mục nguồn/đích, sổ và đợt mua. Kết quả tính lại từ lịch sử, không lưu thêm số dư rồi cộng trùng.

Runtime `expense_api`, Auth cookie/bearer được kiểm phía server, RLS từng bảng, Origin với cookie POST, advisory lock theo owner, version conflict và retry theo command ID. Mọi response private/no-store. Lỗi 401 đăng nhập; 403 Origin; 409 conflict/tháng chốt; 422 đầu vào/nghiệp vụ; 503 Auth/storage tạm thời. Không dùng service-role runtime.

## Migration và nghiệm thu

Áp dụng `supabase/migrations/202610170001_savings.sql` bằng kết nối migration/admin **sau** hai migration hiện có, trên staging trước. Migration bổ sung bảng, không đổi dữ liệu Thu nhập/Chi tiêu. Dùng lại Auth, DATABASE_URL và role runtime hiện tại. Không chạy lại migration cũ trên DB đã có bảng.

`npm test`, `npm run test:db`, `npm run test:e2e`, `npm run typecheck`, `npm run build`. `TEST_WEBKIT=1 npm run test:e2e -- savings.spec.ts --project=webkit` chạy luồng Safari mô phỏng iPhone nếu browser WebKit đã cài. Runner dùng PostgreSQL/Auth local cô lập và bản sao source/build Next riêng trong artifacts; kiểm thử tự động chạy `next build --webpack` + `next start` để không có Fast Refresh tải lại form. Chế độ MCP tương tác tiếp tục dùng dev server riêng. Kiểm thử API đặt `serviceWorkers: "block"` để các request giả lập lỗi thực sự đi qua Playwright routing, đặc biệt trên WebKit production; nghiệm thu PWA/service worker là luồng riêng. Không tác động server phát triển hoặc dữ liệu cloud. Form đăng nhập chỉ nhận thao tác sau hydration; có kiểm thử chặn JavaScript rồi mở lại để tránh native submit làm mất email trước khi React sẵn sàng.

Cloud cần kiểm riêng: đăng nhập thật từ `/savings`, lưu/đọc lại trên hai phiên, bán vàng theo ví dụ 64 triệu/14 triệu lãi, RLS hai owner, đóng/mở tháng, tải CSV/JSON rồi đối chiếu. Chưa thực hiện migration cloud/deploy hay xác minh thiết bị thật trong triển khai source này.

Để giai đoạn sau: mục tiêu/kế hoạch góp, giá trực tuyến, thông báo đẩy, liên kết Tài khoản chung và tích hợp module Đầu tư mà không nhân đôi tài sản vàng.

## Đọc lại bộ review cloud — 18/10/2026

Trong lúc chuẩn bị bộ mẫu Đầu tư cho cùng tài khoản, đọc qua runtime RLS xác nhận schema Tiết kiệm đã tồn tại, có 6 danh mục, 46 revisions giao dịch, 10 giá và 1 allocation thuộc bộ review cũ. Mốc này bổ sung cho trạng thái chưa áp dụng cloud ở các ghi nhận ngày 17/10; không xác nhận thời điểm migration thực tế, Auth/PKCE hoặc thiết bị thật. Dữ liệu được giữ nguyên, có backup trước khi chuẩn bị phần Đầu tư.


## Giao diện chi tiết — 18/10/2026

Chi tiết tiền/ví ưu tiên số dư và lịch sử có tiền, chiều biến động, nguồn/đích. Vàng tách Đợt vàng/Giao dịch, tiền gửi tách Sổ tiền gửi/Giao dịch; có lọc hiện tại/tất cả và 20 dòng/trang. Lịch sử cùng ngày chốt số dư đang xem; xem/sửa/hủy giao dịch qua dialog con giữ vị trí. Lãi tái tục và giá vốn vàng được ghi đúng nhãn, không suy dấu thu/chi từ effect.net. Xem [quy chuẩn dialog](ui-feedback.md).

## Help theo ngữ cảnh — 20/10/2026

Hướng dẫn tiền/ví, sổ gửi, vàng, mở đầu, chuyển nội bộ, định giá, sửa/hủy, chốt/mở lại và báo cáo. Không coi tổng Tiết kiệm là tài sản ròng. Xem [Help theo từng trang](help.md).

## Quy chuẩn giao diện dùng chung — 20/10/2026

Bảng rộng có lựa chọn cột lưu trên trình duyệt. Form có dấu bắt buộc, lỗi tại trường và tổng hợp lỗi có thể đưa focus về trường cần sửa; Hủy/Lưu có icon. Form sửa chưa thay đổi hoặc đã hoàn tác về ban đầu vô hiệu thao tác lưu/xem trước. Tiền nguyên được chuẩn hóa khi blur/submit, không áp dụng quy tắc số nguyên cho lượng vàng. Tooltip dùng thành phần chung, hỗ trợ hover, bàn phím, chạm và cập nhật theo Privacy Mode. Xem [đối chiếu phản hồi toàn ứng dụng](interface-feedback-2026-10-19.md).

## Dòng đọc tiền và kết quả ghi — 21/10/2026

Dialog Ghi giao dịch cùng các form giá/phí/thuế đọc giá trị VND dưới từng ô; lượng vàng giữ đơn vị lượng, không định dạng thành tiền. Dấu `*` sát nhãn và lỗi tại trường có liên kết truy cập. Toast chỉ báo thành công sau ghi nhận, nêu riêng kết quả ghi chưa rõ hoặc lỗi tải lại; footer thao tác cố định khi cuộn nội dung.

## Anh/Việt — 22/10/2026

Giao diện, Help và thông báo dùng ngôn ngữ trong Cài đặt; định dạng vi-VN/en-GB, vẫn VND và giờ Việt Nam. Tên/ghi chú và dữ liệu tài chính giữ nguyên. CSV nhận `locale=vi|en` (mặc định vi), dịch tên cột/nhãn hệ thống nhưng giữ số/ngày dạng chuẩn và chống công thức CSV. Không có migration hay đổi cấu trúc backup. Xem [đặc tả ngôn ngữ](localization.md).

## Bố cục và cuộn — 23/10/2026

Tab workspace một hàng cuộn ngang, tự đưa mục đang chọn vào tầm nhìn. Bảng báo cáo dùng scroller chung; toolbar không trôi khi cuộn dữ liệu. Xem [ma trận rà soát](layout-scroll-2026-10-23.md).

## Minh họa riêng theo chủ đề — 26/10/2026

Tiêu đề dùng nhà kính, bồn hứng nước, heo đất, đèn lồng hoặc chum tích trữ theo năm theme; mỗi hình có bố cục riêng, khác Đầu tư. Trạng thái trống vẫn là cảnh hũ để dành. Preview thành viên dùng cùng cảnh tiêu đề; dữ liệu minh họa cố định. Hình trang trí tĩnh, hỗ trợ sáng/tối, không phản ánh số dư hoặc lợi nhuận. Xem [bảng minh họa](themes.md#minh-họa-tiết-kiệm-và-đầu-tư--26102026).

## Tỷ lệ minh họa tiêu đề — 26/10/2026

Giữ bộ năm cảnh Tiết kiệm riêng, tăng khung hình theo bố cục tiêu đề chung: 240–320px cạnh chữ trên desktop/tablet, 216px dưới chữ trên điện thoại. Không thu hẹp tiêu đề và Help để nhường chỗ cho hình. Xem [chủ đề giao diện](themes.md).

## Bảng danh mục và giao dịch — 27/10/2026

Ba bảng Danh mục tiết kiệm, Giao dịch tháng và Giao dịch nguồn trong kỳ dùng cột có tiêu đề, đường phân cách nhẹ và vùng thao tác riêng. Danh mục tách tên/mô tả, loại/đơn vị, tháng bắt đầu và trạng thái hoạt động/lưu trữ. Hai bảng giao dịch dùng cùng thành phần: nội dung/ghi chú, ngày, danh mục/ví liên quan, số tiền và thao tác; giao dịch mới nhất đứng trước, giữ thứ tự gốc khi cùng ngày. Số tiền căn phải, dùng chữ số đều; lãi/lỗ bán vàng hiển thị bên dưới tiền bán.

Khi vùng bảng rộng tối đa 760px, từng hàng xếp dọc với nhãn trường, giữ đủ dữ liệu đang chọn và nút thao tác 44px. Tên, mô tả và ghi chú dài được xuống dòng. Số dòng đi theo bộ lọc; trạng thái trống giữ khung bảng. Bộ chọn cột dùng `ColumnTable`, lưu riêng cho từng bảng trong trình duyệt; tên giao dịch/danh mục và thao tác luôn hiện. Nút Lưu trữ mở luồng có tháng hiệu lực, giữ lịch sử như trước.

Catalog, README, nội dung landing và preview minh họa đã được đối chiếu; preview vẫn dùng dữ liệu cố định, không gọi API tài chính. Không đổi công thức, schema, API hoặc ranh giới đăng nhập. Chi tiết kiểm chứng local trong [biên bản rà soát](savings-ledgers-2026-10-27.md).

## Tổ chức source — 28/10/2026

Tiết kiệm tách model/replay khỏi xử lý command; editor tách action/controller/trường nhập/preview, workspace tách hook dữ liệu. CSV có bản dịch ở lớp trình bày; giữ lượng vàng, lô, giá vốn, chốt tháng và retry như trước. Không đổi HTTP/schema hoặc áp migration cloud. Xem [hướng dẫn bảo trì](../11-source-maintenance.md) và [bằng chứng kiểm tra](../07-validation.md).

### Nhất quán toàn ứng dụng — 28/10/2026

Đã đối chiếu nội dung, cỡ chữ, dialog/menu và bộ chọn kỳ với [quy tắc dùng chung](usability-consistency-2026-10-28.md). Giữ quy tắc nghiệp vụ, lịch sử và giới hạn chức năng; kết quả kiểm chứng ghi riêng theo môi trường.
