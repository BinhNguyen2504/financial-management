# Tối ưu tải dữ liệu — 04/11/2026

Ưu tiên mở/chuyển trang và chờ sau khi lưu, trên local và online. Cấu hình local vẫn có thể dùng Supabase từ xa; số API của trình duyệt không phản ánh số lượt SQL/Auth bên trong.

## Đọc dữ liệu và xác thực

- Sáu repository hỗ trợ `transaction(owner, fn, readOnly?)`. GET và preview dùng `REPEATABLE READ READ ONLY`; command ghi giữ khóa và thứ tự khóa cũ. Book và `dataGeneration` thuộc cùng snapshot, kể cả khi dữ liệu đổi trong lúc đọc.
- Mỗi sổ đọc bằng một projection SQL, giữ các revision cần tính đúng tiền và lịch sử mà giao diện cần. Mục tiêu đọc ba nguồn bằng projection không audit/close; Quỹ chỉ đọc version và quy tắc hũ cho mức sinh hoạt.
- Proxy bỏ lượt Auth riêng của `/api/v1/`; mỗi handler vẫn xác thực bằng `getUser()` và có thể refresh cookie qua `cookies().set`. Page-access check trên từng trang và refresh proxy của trang được giữ. Không tin owner/token decode do client cung cấp.
- Cài đặt dùng controller foreground chung: gộp focus/visibility khi đang tải, mốc mới 60 giây, retry lỗi sau 5 giây. Chỉ giữ timing trong phiên màn hình.

## Phản hồi sau lưu

`POST /api/v1/{expenses,income,savings,investments,funds,goals}/commands?return=view` trả các trường kết quả hiện có cùng `view` tùy chọn. Income nhận thêm `year`; Savings/Investments nhận `asOf`, theo schema hiện có. Không yêu cầu tùy chọn thì response cũ được giữ; preview giữ wire shape cũ.

View được đọc bằng một projection sau khi ghi, trong cùng transaction, rồi trả sau commit. Cách này giữ thứ tự/dữ liệu đúng như GET và bỏ một vòng HTTP/Auth/khóa/generation riêng. `dataGeneration` gắn vào view; view không vào fingerprint hoặc command receipt. Retry cùng ID trả kết quả ghi gốc nhưng view hiện hành, nên client dùng `view.book.version` cho thao tác tiếp theo. Generation/version/source conflicts vẫn phải xem trước lại; mất xác nhận ghi vẫn retry command cũ.

Sáu workspace nhận view, bỏ hiệu lực response GET cũ và giữ kỳ/tab/bộ lọc. Phản hồi không có view dùng fallback tải lại để tương thích. Phân loại lồng trong biểu mẫu Chi tiêu chuyển view lên cả form cha và workspace.

## Báo cáo và phép tính client

- Tiết kiệm/Đầu tư chỉ tính báo cáo khi phần đang xem cần và memoize theo book/filter/kỳ. Tra sequence giao dịch bằng Map khi sắp xếp.
- API báo cáo chính không dựng bản đồ dòng drill-down. Kỳ trước chỉ tính chỉ số/cảnh báo, không dựng bảng/chuỗi tháng không dùng.
- Drill-down đọc sổ của metric được yêu cầu, đọc version và tình trạng schema của các nguồn còn lại trong cùng snapshot; giữ vector version/generation/ngày/kỳ đầy đủ và `REPORT_CHANGED`. Thu–chi cần hai sổ. Báo cáo có nguồn lỗi dùng đường dựng chuẩn để nhận biết phục hồi lỗi. Chi tiết 20 dòng/trang vẫn giữ thứ tự và nhãn chuẩn.
- Không cắt lịch sử đầu kỳ để tính số dư. Không thêm cache chia sẻ hoặc lưu dữ liệu tài chính vào browser storage.

## Đo và vận hành

Đặt `FINANCIAL_TIMING=1` để nhận `Server-Timing` (Auth, acquisition/BEGIN, SQL được đo, chờ khóa, work và tổng request) và `X-DB-Statements`. Log chỉ ghi module, method, status, số lệnh và duration; không ghi owner, query string, SQL, tham số hoặc dữ liệu tiền. Acquisition bao gồm lấy connection và BEGIN, không phải phép đo cold-start riêng; tổng SQL là thời gian cộng dồn, có thể lớn hơn thời gian request khi đọc song song. Mặc định tắt. `work` đo toàn bộ luồng đọc/command, gồm cả SQL, để đối chiếu với các pha riêng; không coi đó là CPU thuần.

Khi xem online, đo riêng lần đầu và các lần ấm; so sánh p50/p95 của cùng dataset và thao tác. Kiểm tra region hosting so với DB, sau đó mới thay cấu hình. Không tự tăng pool bốn connection hoặc đổi signing/session semantics để lấy số đẹp. Chưa thay cấu hình hosting hoặc deploy.

## Bằng chứng local

Bộ fixture cùng mốc 04/11/2026, PostgreSQL cô lập dưới runtime RLS, không bao gồm HTTP/Auth:

| Luồng | SQL trước | SQL sau |
| --- | ---: | ---: |
| Chi tiêu GET | 14 | 7 |
| Thu nhập GET | 12 | 7 |
| Tiết kiệm GET | 13 | 7 |
| Đầu tư GET | 12 | 7 |
| Quỹ GET | 22 | 9 |
| Mục tiêu GET | 34 | 12 |
| Mục tiêu preview + save + cập nhật màn hình | 108 | 36 |

Số trước là baseline audit cùng source trước tối ưu, gồm BEGIN/COMMIT, RLS/generation và khóa. Không chuyển số SQL thành cam kết latency cloud. Evidence mới: `artifacts/performance/database.json`, `goal-save.json`; baseline audit: `artifacts/performance-audit-IMyktf/baseline.json`. Bộ test kiểm view/receipt của sáu module, snapshot khi generation đổi, đọc không chờ advisory lock, kết quả/chi tiết báo cáo chuẩn và xung đột nguồn/schema/generation.

Catalog, copy hai landing, Help preview, README và docs được đối chiếu. Public preview tiếp tục dùng dữ liệu cố định, không gọi API tài chính tài khoản. Không thêm migration/package; không ghi dữ liệu cloud, không xác minh thiết bị vật lý hoặc deploy. Số liệu và giới hạn từng lượt browser được ghi trong [validation](../07-validation.md).

Hồi quy mobile phát hiện menu Thao tác khác có thể lệch trái viewport khi trigger đứng đầu hàng. Component chung căn menu theo viewport khi mở/resize/đổi ngôn ngữ; giữ thứ tự focus và Escape. Không dùng force click để che lỗi kiểm thử.

Kiểm chứng cuối: npm check với 335 unit; PostgreSQL 114/114; browser hồi quy 96/96, public/Auth/i18n 20/20 và race 4/4 ở các lượt riêng. Ba production snapshot đều khớp 408 file src/public của workspace cuối. Chi tiết và lịch sử thất bại/thử lại ở validation.
