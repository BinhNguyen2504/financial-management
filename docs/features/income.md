# Thu nhập — đặc tả đã xác nhận 15/10/2026

Module `/income` quản lý độc lập thu nhập thực nhận theo tháng. Không ghi ledger, không thay đổi số dư ngân hàng, không phân bổ vào hũ Chi tiêu. Dữ liệu chỉ được lưu cloud sau khi xác thực; không seed số tiền hoặc tên từ ảnh Notion.

## Danh mục và số thu

- Danh mục cố định có tên (1–100 ký tự), mô tả tùy chọn (tối đa 1.000 ký tự), tháng bắt đầu. Xuất hiện mỗi tháng, qua các năm đến khi ngừng. Không tự ghi số tiền.
- Một số thực nhận trên mỗi danh mục–tháng, có ghi chú tùy chọn. Lưu mới thay thế giá trị trước, không cộng thêm. Chấp nhận 0; xóa số thu trả về trạng thái chưa nhập.
- Khoản phát sinh có tên, mô tả tùy chọn, tháng, số tiền dương. Mỗi khoản lưu độc lập; không tạo danh mục dùng lại. Có sửa/xóa và giữ audit.
- Tiền VND nguyên, mỗi giá trị tối đa 24 chữ số, không âm. API dùng chuỗi; tính tiền bằng BigInt; PostgreSQL dùng numeric(24,0). Tổng nhiều khoản có thể vượt 24 chữ số, vẫn trả chuỗi chính xác.
- Chỉ ghi thực nhận tháng hiện tại hoặc quá khứ theo Asia/Ho_Chi_Minh. Tháng tương lai chỉ xem danh mục. Cho tạo cấu hình danh mục từ tháng tương lai.

## Hiệu lực và lịch sử

Sửa tên/mô tả từ tháng hiệu lực, giữ tên các tháng trước. Báo cáo nhóm theo ID; ô từng tháng vẫn hiển thị tên cũ nếu khác tên tổng hợp hiện trong kỳ. Không tách danh mục khi đổi tên.

Danh mục chưa từng có bất kỳ số thu nào (kể cả số 0) được xóa khỏi danh sách. Nếu đã ghi tiền rồi xóa số thu, danh mục vẫn dùng thao tác ngừng để giữ lịch sử. Nếu đã có số thu, dùng Ngừng từ tháng: bỏ dòng trống từ tháng đó, giữ các số thu đã ghi và cho sửa/xóa. Các cấu hình muộn hơn vẫn giữ tên/mô tả lịch sử nhưng bị đánh dấu ngừng để không tự khởi động lại danh mục. Không có tác vụ xóa dây chuyền tiền đã ghi.

Sửa/ngừng danh mục bắt buộc xem trước: phạm vi tháng hiệu lực trở đi, số dòng thay đổi ở các năm có cấu hình/dữ liệu và năm hiện tại; nêu rõ tiếp tục tác động các năm sau. Tổng tiền không đổi. Xóa số thu hoặc khoản phát sinh yêu cầu xác nhận số tiền/tháng. Audit trước/sau và command là lịch sử append-only.

## Báo cáo

- Bộ lọc năm, cả năm/quý/khoảng tháng, cố định/phát sinh, danh mục. Tổng luôn là **Tổng đã ghi nhận**, kèm số danh mục–tháng đã đến còn chưa nhập.
- Dấu `—` là chưa có số thu; `0 ₫` là đã nhập 0. Giá trị thiếu không trở thành 0 và đường xu hướng không nối qua tháng thiếu.
- Bảng hàng danh mục, hàng Thu phát sinh, cột tháng và tổng kỳ; mở chi tiết phát sinh. Tổng quý chỉ bao gồm giao của quý và khoảng đang lọc.
- Biểu đồ cột tháng, đường xu hướng, thanh tỷ trọng danh mục và cố định/phát sinh. Luôn có bảng thay thế và nhãn VND. Tỷ trọng bằng 0 khi tổng thực nhận bằng 0.
- CSV UTF-8 BOM có tổng tháng, dòng danh mục–tháng, từng khoản phát sinh và tổng kỳ theo cùng bộ lọc; ô trống giữ ý nghĩa chưa nhập, escape dấu nháy/xuống dòng và vô hiệu công thức trong trường văn bản.

## API v1

Mọi endpoint xác thực cookie hoặc Bearer; chủ sở hữu chỉ lấy từ Auth đã kiểm chứng. Response có `Cache-Control: private, no-store`. Cookie mutation phải đúng origin. Không cho browser/PostgREST ghi trực tiếp.

| Endpoint | Hợp đồng |
| --- | --- |
| `GET /api/v1/income?year=2026` | `{book, rows, year, today}`; book null khi chưa có dữ liệu |
| `GET /api/v1/income/reports?year=2026&from=1&to=12&kind=all` | Báo cáo từ hàm tổng hợp chung; thêm categoryId để lọc danh mục |
| `GET /api/v1/income/reports?...&format=csv` | Xuất CSV đúng bộ lọc |
| `POST /api/v1/income/preview` | Kiểm tra command và xem ảnh hưởng, không ghi dữ liệu/version/audit |
| `POST /api/v1/income/commands` | Lưu transaction, audit, kết quả chống retry trùng |

Command: `{id: UUID, expectedVersion: number, action}`. Các action: createCategory, configureCategory, stopCategory, deleteCategory, setMonthly, clearMonthly, upsertOneOff, deleteOneOff. Schema TypeScript/Zod trong `src/domain/income/schema.ts` là hợp đồng chi tiết. Phiên bản sổ ban đầu bằng 0; command đầu tự tạo sổ, không cần thao tác khởi tạo riêng.

409 VERSION_CONFLICT giữ form và yêu cầu tải dữ liệu mới trước khi thử lại. Retry cùng ID/nội dung trả kết quả cũ; tái dùng ID với nội dung khác trả 409 IDEMPOTENCY_CONFLICT. Lỗi Auth tạm thời hoặc storage trả 503, không giả thành đăng xuất. Không lưu tài chính/form vào localStorage hoặc service worker.

## Migration và nghiệm thu

Áp dụng `202610150001_expenses.sql` trước, rồi `202610150002_income.sql`. Tiếp tục dùng role runtime expense_api; không đổi kết nối admin thành runtime. Migration mới thêm bảng income_* và policy RLS, không sửa dữ liệu Chi tiêu. Xem hướng dẫn cloud chung.

Chạy npm test, npm run test:db, npm run test:e2e, npm run typecheck, npm run build với Node 22. Runner DB/e2e nạp tất cả migration theo thứ tự vào cluster PostgreSQL local riêng. Browser dùng Auth contract double local, không phải xác nhận Supabase production. Chưa bao gồm deploy, dự báo, khóa năm, import hoặc ghi offline.
