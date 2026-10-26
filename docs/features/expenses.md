# Chi tiêu theo tháng và năm

Đặc tả đã được người dùng xác nhận ngày 15/10/2026 và được triển khai trong source. Nghiệm thu cloud còn phụ thuộc cấu hình Supabase thực tế; ảnh Notion không được dùng làm seed.

## Cách sử dụng

Cập nhật 26/10/2026: cột Thao tác trên bảng hũ căn giữa cả khi có một hoặc hai nút. Điều chỉnh dùng icon bút, Dùng tiền dùng icon ví cùng kích thước 44px, cách nhau 8px, có tên truy cập và tooltip. Dùng tiền chỉ mở form ghi sử dụng tích lũy; nút xác nhận trong form vẫn có chữ. Card mobile giữ các nút có chữ. Khung bảng cắt nền tiêu đề và hàng theo góc bo; cuộn ngang vẫn nằm trong vùng dữ liệu, popover chọn cột tiếp tục nổi phía trên.

Mở `/budgets` → đăng nhập email → chọn tháng bắt đầu → thêm hũ và số dư đầu kỳ. Loại hũ được cố định sau khi tạo. Phương thức chỉ là nơi phân loại tiền; module này không ghi sổ ngân hàng hoặc tạo giao dịch chuyển tiền.

| Nội dung | Chi trong tháng | Tích lũy |
| --- | --- | --- |
| Tiền cần thêm mặc định | `max(mức tháng − dư chuyển sang, 0)` | Mức tháng |
| Tiền có | Dư chuyển sang + tiền thêm theo tháng + tiền bổ sung | Cùng công thức |
| Thực chi | Tiền có − dư cuối tháng | Tổng các lần sử dụng |
| Dư cuối tháng | Mặc định 0, cho nhập ngoại lệ | Tính từ tiền có − các lần sử dụng |
| Khi ngừng cấp tiền | Không cấp mặc định; giữ dư nếu không nhập số dư mới | Không cấp mặc định; vẫn sử dụng tiền còn lại được |

Ví dụ: dư chuyển sang 300.000, mức tháng 2.000.000 → thêm 1.700.000. Bổ sung 400.000, dư cuối tháng 100.000 → thực chi 2.300.000, vượt mức 300.000.

Tiền thêm theo tháng được tự ghi nhận; người dùng sửa khi số thực tế khác. Tiền góp vào hũ tích lũy không phải thực chi. Góp mặc định được tính vào đầu tháng; từng lần sử dụng kiểm tra đủ tiền theo ngày. Không nhận số tiền âm, số thập phân, số dư lớn hơn tiền có hoặc lần sử dụng trong tương lai.

Sửa riêng tháng ở “Điều chỉnh”; đổi cấu hình mặc định ở chi tiết hũ. Cấu hình mới từ tháng được chọn thay mức riêng tại chính tháng đó; ngoại lệ của những tháng khác vẫn được giữ. Cấu hình đã hẹn ở tháng sau tiếp tục có hiệu lực khi tới tháng đó. Ngừng cấp tiền cũng có hiệu lực đến cấu hình tiếp theo. Đổi tên/phương thức/nhóm giữ nguyên thông tin tháng trước. Danh sách phân loại là gợi ý: đổi tên gợi ý không đổi lịch sử đã lưu.

Mọi thay đổi đi qua **xem trước → xác nhận lưu**. Xem trước liệt kê các tháng bị ảnh hưởng và kiểm tra số dư xuyên suốt đến hết năm hiện tại. Khi phiên khác đã sửa, giữ nội dung form, tải phiên bản mới và xem trước lại. Khi mất phản hồi lưu, thử lại cùng command ID để không nhân đôi.

## Thời gian và lưu trữ

Ngày nghiệp vụ theo `Asia/Ho_Chi_Minh`, timestamp UTC. Không tạo tháng trước tháng bắt đầu của sổ/hũ. Tháng quá khứ mặc định dư 0; tháng hiện tại có thực chi suy ra mang nhãn tạm tính. Tháng tương lai chỉ có kế hoạch; không tính tiền góp hoặc chi tương lai thành thực tế.

Kỳ năm mới tự xuất hiện khi đọc dữ liệu sau 1/1, không cần cron. Các hũ và mức hiệu lực được kế thừa qua lịch cấu hình; số dư cuối tháng 12 trở thành số đầu tháng 1 đúng một lần. Chỉ persist thêm kỳ năm khi có lệnh ghi, còn mặc định tháng được suy ra từ các quy tắc có hiệu lực.

Năm trước còn mở được sửa để hoàn tất tháng 12; các tháng sau được tính lại. Chốt năm phải theo thứ tự từ cũ đến mới, chỉ chốt năm đã kết thúc. Snapshot được ghi cùng version, audit và idempotency record trong một transaction. Năm chốt chỉ xem; snapshot có trigger PostgreSQL ngăn sửa/xóa. Không có chức năng mở khóa năm đã chốt.

Backup JSON theo năm có `schemaVersion: 1`, trạng thái draft/closed, kỳ, tiền tệ, timezone, thời điểm xuất, rows, cấu hình, dữ liệu nhập, lần sử dụng và audit liên quan. Rows chứa số dư đầu/cuối kỳ để đọc độc lập. Đây là API xuất dữ liệu năm được giữ để tương thích. Sao lưu/khôi phục toàn tài khoản thực hiện trong [Cài đặt](backup.md); file năm không dùng cho luồng import toàn tài khoản. Backup vận hành toàn DB cần cấu hình riêng trên hạ tầng.

## Lưu trữ và API

- Domain tính tiền bằng BigInt; API truyền chuỗi số nguyên VND, DB dùng `numeric(24,0)`. Mỗi giá trị tháng không vượt 24 chữ số; tổng báo cáo dùng BigInt, không chuyển thành float. Biểu đồ chỉ chuyển tỷ lệ đã thu nhỏ thành number.
- Các bảng: `expense_books`, `expense_jars`, `expense_month_inputs`, `expense_spends`, `expense_years`, `expense_labels`, `expense_audit`, `expense_commands`. Lịch cấu hình có hiệu lực nằm trong JSONB của hũ; inputs chỉ lưu ngoại lệ, mặc định được tính tại server. Không tạo bảng SQL mới cho mỗi năm.
- Backend xác minh Auth qua `getUser`, dùng danh tính đã xác minh làm owner. Connection runtime là `expense_api`; trong transaction `SET LOCAL ROLE authenticated` và đặt JWT claims cho RLS. Composite FK ngăn gắn hũ của owner khác. RLS chặn cả truy cập PostgREST trực tiếp.
- Advisory transaction lock theo owner tuần tự hóa ghi, retry và khởi tạo. Version ngăn ghi đè stale data. Command ID và fingerprint toàn payload kiểm soát retry. Audit append-only lưu các action để lần theo lịch sử; xóa lần sử dụng là đánh dấu, không xóa record.
- API và trang private không cache. Không lưu tài chính vào localStorage/IndexedDB/service worker. Đổi thiết bị/mở trang sẽ refetch. Quay lại foreground giữ dữ liệu trên màn hình và chỉ cập nhật ngầm nếu lần tải trước đã qua 60 giây; reconnect/đổi ngày Việt Nam kiểm tra sớm hơn, tối thiểu 5 giây giữa các lần tải tự động. Gộp sự kiện quay lại trùng nhau, không tải thêm khi còn request; chưa có Realtime hoặc nhập offline.

| Endpoint | Hành vi |
| --- | --- |
| `GET /api/v1/expenses` | Sổ, phân loại, lịch sử và các rows tháng; đảm bảo kỳ năm hiện tại |
| `POST /api/v1/expenses/preview` | Kiểm và trả version dự kiến cùng diff; không ghi |
| `POST /api/v1/expenses/commands` | Kiểm và ghi nguyên tử; retry trả kết quả đã lưu |
| `GET /api/v1/expenses/reports` | Báo cáo năm hiện tại, lọc from/to 1–12, kind, jarId, method, group |
| `GET /api/v1/expenses/years/{year}/backup` | Tải JSON theo năm, kể cả bản nháp chưa chốt |

Lệnh JSON: `{ "id": "UUID", "expectedVersion": 2, "action": { "type": "..." } }`. Action gồm initialize, createJar, configureJar, setJarEmoji, stopJar, editMonth, upsertSpend, deleteSpend, upsertLabel, deleteLabel, closeYear. Schema kiểm đầu vào ở `src/domain/expenses/schema.ts`; types view và report cùng module. Không nhận owner từ request.

Biểu tượng: `createJar` nhận thêm `emoji` tùy chọn. `setJarEmoji` có payload `{ "type": "setJarEmoji", "jarId": "UUID", "month": "2026-10", "emoji": "🌱" }`; emoji phải nằm trong bộ hỗ trợ ở `src/domain/expenses/emoji.ts`, hoặc null để tự động theo tên. Lưu trong rules JSONB và trả qua `ExpenseRow.emoji`, cùng tháng hiệu lực/version/audit như các lệnh khác. Lệnh không đổi mức tháng, inputs hoặc trạng thái hoạt động; năm đã chốt bị từ chối. Dữ liệu cũ thiếu trường này vẫn đọc được, không cần migration SQL.

Web dùng cookie; POST cookie yêu cầu Origin khớp origin công khai. Native dùng `Authorization: Bearer <Supabase access token>` và cùng hợp đồng JSON. Mọi response có `Cache-Control: private, no-store`. Lỗi 401: đăng nhập; 403: nguồn request; 409: version/idempotency/năm đã chốt; 422: dữ liệu không hợp lệ; 503: chưa cấu hình hoặc lỗi lưu trữ. Flutter chưa được triển khai.

## Báo cáo

Chỉ báo cáo tương tác năm hiện tại; khoảng tháng/quý không vượt ranh giới năm. Bộ lọc chung và bộ lọc hũ áp dụng cả bảng và biểu đồ. Tổng thực chi có thể bao gồm phần tạm tính của tháng hiện tại, luôn có nhãn. Không nối đường thực chi qua các tháng tương lai như thể đã phát sinh. Tiền góp thực tế không bao gồm tháng tương lai.

Giao diện mở bằng biểu đồ, có nút chuyển Bảng. Cơ cấu dùng donut tối đa năm lát; so sánh dùng thanh ngang bo tròn; diễn biến dùng đường/vùng tô nhẹ. Privacy Mode che số tiền ở cả hai cách xem, giữ tỷ lệ/phần trăm.

Theo tháng/khoản/phương thức/nhóm: mức kế hoạch, tiền bỏ hũ và thực chi. Vượt mức cộng từ các tháng hũ chi tháng, không lấy chi vượt tháng này bù bằng tháng khác còn dư. Chi từ hũ tích lũy không bị gọi là vượt mức góp hàng tháng. Tổng tích lũy dùng số đầu kỳ đầu tiên và số cuối kỳ gần nhất đã diễn ra, không cộng các số dư tháng với nhau.

## Kiểm tra

`npm test`, `npm run test:db`, `npm run test:e2e`, `npm run typecheck`, `npm run build`. DB/e2e tạo một PostgreSQL cluster local riêng trong artifacts; không sử dụng DATABASE_URL thật. Bộ e2e dùng Auth contract double local và PostgreSQL thật, Chromium desktop/điện thoại, dữ liệu giả. Cấu hình cloud và các bước nghiệm thu thật nằm trong [Cloud cho Chi tiêu](../09-expenses-cloud.md).


## Giao diện chi tiết — 18/10/2026

Chi tiết hũ ưu tiên còn lại, mức tháng, bỏ hũ và thực chi; tab Theo tháng, Các lần sử dụng (hũ tích lũy), Lịch sử thay đổi. Lịch sử không còn bị cắt ở 20 dòng; danh sách dài có tìm kiếm/lọc/phân trang. Phương thức/nhóm tách tab. Xem trước có Trước/Sau; lưu trong dialog con giữ chi tiết và vị trí. Xem [quy chuẩn dialog](ui-feedback.md).


## Nguồn living expense cho Fund — 19/10/2026

Fund chỉ đọc mức cấu hình có hiệu lực của các hũ `monthly` đang hoạt động do người dùng chọn. Không dùng `MonthInput.target`, funding, extra, closing hoặc hũ tích lũy. Chỉnh Chi tiêu tạo đề xuất cập nhật mục tiêu Fund; chỉ xác nhận trong Fund mới thay bản chụp nguồn. Không ghi giao dịch Fund vào Chi tiêu.

## Phân loại và bố cục — 19/10/2026

Phương thức/nhóm chọn từ danh sách có sẵn; thêm phân loại qua dialog con giữ bản nháp hũ. Logo/icon là metadata tùy chọn, migration `202610190002_label_visuals.sql`, nguồn asset local ở `public/brands/sources.json`. Phân loại lịch sử giữ nguyên. Chọn được năm 2000–2099; năm ngoài phạm vi hiện thông báo trống và không cho sửa. Bảng/card có tùy chỉnh cột trên trình duyệt; không đổi phép tính hoặc CSV. Tiền chuẩn hóa số 0 đầu khi blur/submit. Xem [ma trận UI](interface-feedback-2026-10-19.md).

Bổ sung 20/10/2026: khi chưa có cột logo/icon, repository đọc metadata thành null và tiếp tục lưu hũ/phân loại không kèm metadata. Chỉ lệnh lưu metadata khác null bị chặn với HTTP 503 / `LABEL_VISUALS_MIGRATION_REQUIRED`, giữ bản nháp và không đổi version/audit/biên nhận lệnh. Sau migration, metadata được lưu/đọc bình thường; không tự chạy DDL hoặc nâng quyền runtime. Điều này cũng giữ nguồn Chi tiêu cho Fund đọc được khi thiếu riêng migration metadata.

## Cột hiển thị và nhận diện phương thức — 21/10/2026

Nút Cột hiển thị nằm cùng hàng tiêu đề tháng/số hũ, ngoài vùng cuộn bảng; bỏ hàng trống trước tiêu đề cột. Bộ chọn mở dạng popover nổi, không làm thay đổi chiều cao hoặc đẩy bảng; điện thoại hẹp dùng panel căn giữa màn hình. Danh sách công tắc theo từng dòng, có số cột đang hiện, giải thích cột luôn hiện và khôi phục mặc định. Chọn nhiều cột liên tiếp, bấm ngoài/đóng/Escape để kết thúc; Escape trong popover không đóng dialog cha. Desktop và card mobile dùng chung khóa `fm-columns:expenses-workspace-2`, giữ tùy chọn desktop đã lưu. Khóa `expenses-workspace-1` dành cho bảng tổng kết năm, không dùng cho card tháng nữa.

Loại hũ, phương thức và nhóm là các cụm gọn được căn giữa theo dòng; cả cụm xuống hàng khi thiếu chỗ, không có dấu phân cách lẻ. Logo nằm trong khung 20px, icon nhóm 16px, bỏ ô viền 36px. HSBC/Techcombank/MB dùng riêng phần biểu tượng của asset gốc; các thương hiệu còn lại dùng icon chính thức phù hợp. Giữ nguyên tỷ lệ/màu và tên bên cạnh; chữ vốn là bản thân app icon như MoMo/ZaloPay không bị vẽ lại. Nguồn và cách lấy biểu tượng được ghi tại `public/brands/sources.json`.

Không đổi brand key, schema, dữ liệu phân loại, công thức hoặc CSV; không cần migration mới cho đợt tinh chỉnh này. Hành vi popover dùng chung cho các bảng rộng trong ứng dụng. Bằng chứng và giới hạn môi trường ở [validation](../07-validation.md).

## Help theo ngữ cảnh — 20/10/2026

Hướng dẫn “chia trước, chi sau”, hũ chi tháng/tích lũy, phương thức/nhóm, cách tính tiền và chốt năm; tra cứu từ form đến đúng khái niệm. Công thức và API giữ nguyên. Xem [Help theo từng trang](help.md).

## Phản hồi nhập liệu — 21/10/2026

Các ô tiền của hũ, chi tích lũy và điều chỉnh kỳ đọc số VND ngay dưới ô, có gợi ý khi trống và che theo chế độ riêng tư. Dấu `*` sát nhãn; lỗi nhập sai hiển thị tại ô và được nối bằng `aria-describedby`. Toast chỉ báo sau ghi nhận, giữ bản nháp nếu ghi chưa rõ; header/footer dialog ổn định khi cuộn.

## Anh/Việt — 22/10/2026

Giao diện, Help và thông báo dùng ngôn ngữ trong Cài đặt; định dạng vi-VN/en-GB, vẫn VND và giờ Việt Nam. Tên/ghi chú và dữ liệu tài chính giữ nguyên. Không có migration hay đổi cấu trúc backup. Xem [đặc tả ngôn ngữ](localization.md).

## Bố cục và cuộn — 23/10/2026

Thanh nội dung và kiểu báo cáo dùng tab ngang. Bảng báo cáo/tổng kết dùng scroller chung; toolbar cột giữ vị trí theo khung. Bảng số liệu biểu đồ vẫn cuộn riêng. Xem [ma trận rà soát](layout-scroll-2026-10-23.md).

## Minh họa và bố cục tiêu đề — 26/10/2026

Tiêu đề luôn có cảnh hũ chi theo năm theme, kể cả trước khi có dữ liệu. Bố cục chung dùng hình lớn bên chữ trên desktop, hình ở hàng riêng trên điện thoại; Phân loại/Thêm hũ có hàng thao tác riêng và vẫn tuân thủ trạng thái chỉ đọc. Không đổi dữ liệu, bộ lọc hay nghiệp vụ chia hũ. Xem [tỷ lệ minh họa](themes.md).
