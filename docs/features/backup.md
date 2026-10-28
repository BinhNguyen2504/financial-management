# Sao lưu và khôi phục toàn tài khoản

Người dùng chủ động thao tác tại **Cài đặt → Sao lưu và khôi phục** (`/settings`). Các module giữ xuất CSV báo cáo; các nút backup riêng đã được gom về Cài đặt. API backup cũ vẫn tương thích nhưng file từng module không phải file khôi phục toàn tài khoản.

## Xuất và nhập

- **Tải bản sao lưu** xuất JSON không mật khẩu: toàn bộ 35 bảng Thu nhập/Chi tiêu/Tiết kiệm/Đầu tư/Quỹ an toàn, kể cả lịch sử sửa/hủy, lô vàng, định giá, snapshot và kỳ đã chốt. Tiền/lượng giữ dạng chuỗi; Privacy Mode không che số trong file.
- Kèm họ tên, ngày sinh, giới tính. Không kèm mật khẩu, token, email đăng nhập hoặc tùy chọn riêng tư trên thiết bị. File có thể được nhập khi không còn truy cập tài khoản cũ.
- **Nhập bản sao lưu**: chọn file → kiểm tra và xem trước ngày xuất, khoảng thời gian, số bản ghi → tùy chọn hồ sơ (mặc định tắt) → xác nhận. Nhận định dạng `financial-manager-full-backup`, `schemaVersion: 1` hoặc `2`; xuất mới luôn là V2, V1 được chuẩn hóa với Fund trống. CSV, SQL và file backup từng module không được tự chuyển đổi.
- Chỉ tài khoản không có bản ghi trong bất kỳ bảng tài chính nào mới được nhập. Xem trang/status không khởi tạo sổ. Không gộp hoặc ghi đè. Số bản ghi xem trước bao gồm cả sổ, lịch sử và dữ liệu kỹ thuật, không đồng nghĩa số giao dịch.
- Tổng quan có một gợi ý dẫn đến `/settings#import` sau khi server xác nhận tài khoản trống. Đóng gợi ý có hiệu lực trong phiên theo tài khoản; lỗi mạng/Auth/schema không được coi là tài khoản trống.
- File được giữ tạm trong bộ nhớ trình duyệt trong luồng nhập, không lưu vào localStorage/IndexedDB. Server không lưu file hoặc ghi nội dung tài chính vào log. Người dùng tự lưu file đã tải ở nơi an toàn.

## Tính toàn vẹn và API

| Endpoint                           | Hành vi                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `GET /api/v1/data/status` | Trạng thái trống, số bản ghi, owner, giới hạn byte và `importReady` |
| `GET /api/v1/data/backup`          | Snapshot PostgreSQL repeatable-read nhất quán, tải JSON riêng tư               |
| `POST /api/v1/data/import/preview` | Body là backup; kiểm tra cùng validator với import, trả tóm tắt và `canImport` |
| `POST /api/v1/data/import`         | Body `{requestId,targetOwnerId,backup}`; owner đích phải khớp phiên hiện tại   |

Mọi API xác minh Auth và trả `private, no-store`. POST yêu cầu cùng origin. Table/column allowlist và schema nghiêm ngặt chặn cột owner hoặc bảng lạ. Kiểm tra khóa trùng, quan hệ, dữ liệu JSON lồng, thứ tự revision và replay domain trước ghi. Không thực thi SQL từ file.

Export và status yêu cầu đủ schema tài chính của năm module. Chỉ import yêu cầu thêm migration `202610180002_data_imports.sql`; thiếu bảng biên nhận không được chặn tải backup. Status trả `importReady: false` và giao diện giải thích ngay trong thẻ khôi phục; preview trả `canImport: false` và import trả `IMPORT_NOT_READY`. Không âm thầm bỏ module chưa có migration. Kết nối runtime vẫn là `expense_api`, `SET LOCAL ROLE authenticated` và JWT claims theo tài khoản đã xác minh; không cần service role.

Import lấy advisory locks theo thứ tự Chi tiêu → Thu nhập → Tiết kiệm → Đầu tư, dùng cùng khóa với thao tác ghi thường. Kiểm tra lại tài khoản trống sau khi lấy khóa, INSERT theo quan hệ, đọc đối soát toàn bộ bảng trước commit. Không tắt trigger hoặc sửa chính sách RLS. Bất kỳ lỗi nào rollback cả dữ liệu và biên nhận.

`data_imports` lưu biên nhận kỹ thuật theo owner/requestId, dấu vân tay SHA-256 của nội dung và kết quả trong cùng transaction. Retry đúng yêu cầu trả kết quả cũ kể cả tài khoản đã có dữ liệu sau import; cùng requestId với nội dung khác trả 409. Biên nhận không đưa vào backup tài chính. SHA-256 phục vụ idempotency, không chứng minh tính xác thực của file.

Hồ sơ lưu riêng trong Supabase Auth nên cập nhật sau commit tài chính. Nếu bước hồ sơ lỗi, dữ liệu tài chính vẫn đã khôi phục; giao diện báo riêng và cho retry hồ sơ mà không nhập lại. Email/tài khoản đăng nhập không được thay từ file. Hồ sơ chưa đầy đủ có thể cập nhật trong Thông tin cá nhân.

## Giới hạn và triển khai

`DATA_BACKUP_MAX_BYTES` mặc định **20971520 byte (20 MiB)**, dùng chung cho export và import. Request import cho phép thêm tối đa 1 KiB cho envelope. Server giới hạn stream request trước JSON.parse, kể cả khi không có Content-Length; client kiểm tra kích thước file trước đọc.

**Điều kiện phát hành:** hosting/reverse proxy phải nhận được kích thước đã cấu hình cộng envelope và trả được file tương ứng. Nếu hạ tầng giới hạn thấp hơn, đặt biến này thấp hơn giới hạn thực, kiểm tra request/download sát ngưỡng trên môi trường đó. Cấu hình hiện tại chưa phải bằng chứng truyền file 20 MiB trên cloud; không tự triển khai hoặc thay cấu hình cloud trong thay đổi này. Khi vượt giới hạn, export báo lỗi thay vì phát file không thể import bằng cấu hình hiện tại.

Backup chỉ đến thời điểm xuất; không tự động chạy nền. Tính năng hiện chưa hỗ trợ mã hóa, nhập một phần, gộp hoặc thay thế tài khoản đã có dữ liệu.

## Kiểm chứng

Kiểm thử tự động dùng PostgreSQL cô lập và Auth double local; không dùng tài khoản hoặc ghi/reset cloud. Kết quả theo ngày ở [validation](../07-validation.md). Browser mobile là giả lập, không thay thế iPhone thật.


## Sửa lỗi tải và rà soát Cài đặt — 18/10/2026

Đã tái hiện lỗi: phụ thuộc `data_imports` của luồng import bị dùng chung cho cả status/export. Khi chỉ thiếu migration này, status cũ trả 503 và UI vô hiệu hóa nút tải; thông báo lại nằm dưới vùng nhập file. Đã thêm regression PostgreSQL với bảng biên nhận tạm vắng mặt: export vẫn đủ 28 bảng, import từ chối an toàn và không ghi dữ liệu.

Giao diện hiện dùng hai thẻ Sao lưu/Khôi phục cạnh nhau trên desktop và xếp dọc trên mobile. Nút chọn file tiếng Việt, preview theo bước và hướng dẫn cài PWA thu gọn. Lỗi xuất/nhập và trạng thái chờ hiển thị tại đúng thao tác. Khi file đã tạo, URL blob được giữ đến khi thay file/rời trang; liên kết **Lưu file JSON** cho phép thao tác lưu trực tiếp nếu trình duyệt không bắt đầu tải tự động. Không thông báo đã lưu file khi chưa thể kiểm chứng thao tác lưu của trình duyệt.

Export không phụ thuộc request status thành công; lỗi Auth hoặc dữ liệu khi xuất vẫn phải báo ngay trong thẻ sao lưu. File phản hồi không hợp lệ (ví dụ trang HTML của proxy) không được đưa cho người dùng như một bản backup.


### Căn đều bố cục — 18/10/2026

Thẻ Sao lưu và Khôi phục cùng hàng được stretch theo nội dung cao nhất, giữ cùng mép trên/dưới ở trạng thái ban đầu, sau tạo file và xem trước import. Mobile vẫn xếp dọc, không ép bằng chiều cao hoặc chồng nội dung. Catalog, README, landing copy và preview đã rà soát; phạm vi và mô tả tính năng không đổi nên không cần sửa copy.


## Backup V2 và Fund — 19/10/2026

V2 bổ sung sổ/quỹ, nơi giữ, cấu hình nguồn và mục tiêu, phiên bản giao dịch, audit và command của Fund. Validate dựng lại toàn bộ lịch sử Fund để kiểm chứng số dư/cấu hình, kiểm tra cột tham chiếu cùng dữ liệu JSON. Phát hiện tài khoản trống và restore bao gồm Fund; khóa restore theo thứ tự Expenses → Income → Savings → Investments → Fund. Các lệnh Fund giữ khóa Expenses trước Fund để đọc nguồn nhất quán.

Cần migration Fund trước khi dùng source mới; thiếu schema không âm thầm bỏ quỹ khỏi backup. Không nhận V1 chứa bảng Fund hoặc phiên bản lạ. File V1 gốc vẫn khôi phục vào tài khoản trống, Fund chưa thiết lập. Nội dung lịch sử xác minh ngày 18/10 ở trên giữ nguyên phạm vi bốn module tại thời điểm đó.

## Metadata trình bày — 19/10/2026

Phân loại Chi tiêu có `brand_key`/`icon_key` nullable sau migration `202610190002_label_visuals.sql`. Backup cũ không có hai field vẫn được chấp nhận với null; backup mới lưu và phục hồi chúng. Tùy chọn theme/sidebar/cột trên trình duyệt không nằm trong backup tài chính.

## Help theo ngữ cảnh — 20/10/2026

Help tại Cài đặt hướng dẫn file JSON toàn tài khoản, khôi phục vào tài khoản trống, hồ sơ tùy chọn và file luôn chứa đầy đủ số tiền. Không thêm gộp/ghi đè hoặc nhập từng phần. Xem [Help theo từng trang](help.md).

## Chủ đề — 21/10/2026

Khu vườn/Dòng nước/Kim ngân/Lửa ấm/Đất lành (`fm-visual-theme`) và chế độ Sáng/Tối/Theo hệ thống (`fm-theme`) là tùy chọn trình duyệt. Không xuất hoặc khôi phục chúng qua JSON tài chính; đổi chủ đề khi đang xem trước khôi phục giữ nguyên file và lựa chọn trong phiên.

## Phản hồi khôi phục — 21/10/2026

File không hợp lệ báo lỗi ngay gần vùng chọn file và liên kết lỗi với nút chọn. Khôi phục tài chính thành công mới hiện toast thành công; nếu tiếp theo lưu hồ sơ lỗi, báo riêng phần hồ sơ và giữ kết quả tài chính đã ghi. Mất xác nhận hoặc lỗi nhập có thông báo tại Cài đặt, không tự kết luận thành công. Giữ bản xem trước và tùy chọn hồ sơ khi có thể thử lại.

## Ngôn ngữ — 22/10/2026

UI sao lưu/khôi phục hỗ trợ Tiếng Việt/English. JSON V1/V2, tên trường, số tiền, ngày và tên do người dùng nhập giữ dạng chuẩn. Lựa chọn `fm-locale`, cookie cùng tên, theme và tùy chọn cột không vào backup. Tùy chọn hồ sơ không bao gồm ngôn ngữ. Xem [ngôn ngữ](localization.md).

### Nhất quán toàn ứng dụng — 28/10/2026

Đã đối chiếu nội dung, cỡ chữ, dialog/menu và bộ chọn kỳ với [quy tắc dùng chung](usability-consistency-2026-10-28.md). Giữ quy tắc nghiệp vụ, lịch sử và giới hạn chức năng; kết quả kiểm chứng ghi riêng theo môi trường.
