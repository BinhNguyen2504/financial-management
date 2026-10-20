**Đầu tư đã triển khai source ngày 18/10/2026:** tổng danh mục VND và ví tiền chờ, mở đầu tách dòng vốn mới, giá vốn bán nhập tay, định giá có revision. Sáu bảng `investments_*`, lưu chuỗi tiền chính xác, RLS cùng owner và lịch sử append-only. Xem [Đầu tư](features/investments.md); không dùng các thực thể mã/lô dự kiến bên dưới cho bản tổng danh mục.

# Mô hình dữ liệu sơ bộ

**Tiết kiệm đã triển khai:** sổ giao dịch riêng liên tục nhiều năm, từng sổ gửi/đợt vàng, giá có ngày hiệu lực, revision và snapshot chốt tháng. Chưa nối ledger/tài khoản chung. Xem [đặc tả Tiết kiệm](features/savings.md); các thực thể tổng quát bên dưới vẫn là mô hình dự kiến cho module khác.

**Ngoại lệ đã xác nhận cho Chi tiêu:** thực chi hũ tháng tính từ số tiền có và số dư cuối tháng; hũ tích lũy tính theo các lần sử dụng. Không buộc ghi từng giao dịch ledger. Module có schema riêng trong migration và [đặc tả Chi tiêu](features/expenses.md); dữ liệu này không tự làm tăng/giảm tài khoản ngân hàng. Các thực thể ledger/đầu tư bên dưới tiếp tục là mô hình dự kiến cho những module khác.

**Đề xuất để thảo luận, chưa là schema đã triển khai.** Sẽ chốt sau khi có quy tắc từng tính năng. Hệ thống phải lưu dữ liệu phát sinh và lịch sử định giá, thay vì bảng có cột Tháng 1…Tháng 12 rồi nhập tổng ở nhiều nơi.

**Thu nhập đã xác nhận:** tổng thực nhận theo danh mục–tháng và khoản phát sinh riêng; cấu hình theo tháng hiệu lực, không tự ghi tiền định kỳ hoặc thay đổi tài khoản. Xem [đặc tả Thu nhập](features/income.md) và migration `202610150002_income.sql`. Mô hình ledger bên dưới tiếp tục là dự kiến.

## Ba khái niệm tách biệt

- **Tài khoản/tài sản:** tiền hoặc giá trị đang nằm ở đâu — tiền mặt, ngân hàng, ví, tiền chờ, sổ tiết kiệm, tài sản đầu tư.
- **Danh mục/mục đích:** khoản tiền phục vụ việc gì — ăn uống, gia đình, quỹ an toàn, mục tiêu khác.
- **Kế hoạch/định giá:** dự kiến chi bao nhiêu hoặc tài sản được định giá bao nhiêu tại thời điểm nào.

Quỹ không tự giữ thêm một lượng tiền bên cạnh tài khoản. Mua vàng không tạo ra hai tài sản chỉ vì vàng xuất hiện ở cả trang Savings và Investments.

## Các nhóm thực thể

| Nhóm | Thực thể dự kiến | Vai trò |
| --- | --- | --- |
| Danh tính | `profiles`, tùy chọn cá nhân | Chủ sở hữu, timezone, currency, cấu hình |
| Tiền/tài khoản | `accounts` | Tài khoản thực tế, loại tài sản/nợ, trạng thái, thông tin đối soát |
| Phân loại | `categories`, `tags` | Thu nhập, chi phí, nhóm bản thân/gia đình; không gắn cứng vào tên tài khoản |
| Sổ giao dịch | `ledger_accounts`, `journal_entries`, `journal_lines` | Sổ nội bộ cân đối, liên kết một hành động người dùng với các biến động |
| Nhập nhanh | `transaction_templates`, `recurring_rules`, `recurring_occurrences` | Mẫu và lịch dự kiến; mỗi kỳ sinh tối đa một phát sinh |
| Ngân sách | `budget_rules`, `budget_periods`, `budget_allocations` | Ngày hiệu lực, mức cấp thêm, số chuyển tiếp, chính sách khi đổi mức |
| Tiết kiệm | `savings_contracts`, `savings_events` | Gốc, kỳ hạn, đáo hạn; liên kết tài khoản và bút toán |
| Quỹ | `funds`, `fund_allocation_events` | Mục tiêu và phần giá trị được dành riêng từ tài khoản/tài sản đủ điều kiện |
| Mục tiêu | `goals`, `goal_links` | Liên kết đến quỹ/tài sản/nhóm chỉ số; tránh nhập Current bằng tay |
| Đầu tư | `instruments`, `trades`, `holding_lots`, `price_observations`, `allocation_targets` | Mã, số lượng, giá vốn, mua/bán, định giá và tỷ trọng mục tiêu |
| Nợ (nếu xác nhận) | `liability_contracts`, lịch trả | Gốc còn nợ, lãi, ngày đến hạn, liên kết accounts/ledger |
| Lịch sử | `valuation_snapshots`, `snapshot_items` | Báo cáo tài sản theo thời điểm, liên kết giá/nguồn; có revision khi hiệu chỉnh |
| Nhập và truy vết | `import_batches`, `import_rows`, `idempotency_records`, `audit_events` | Dry-run, trùng lặp, provenance, retry và lịch sử chỉnh sửa |

Mỗi bảng dữ liệu riêng có chủ sở hữu. Khóa ngoại/composite constraints và kiểm tra phía server ngăn liên kết đối tượng của hai người dùng khác nhau. Chỉ RLS trên một bảng cha chưa đủ để đảm bảo các quan hệ cùng chủ.

## Sổ giao dịch đề xuất

Đề xuất sổ kép nội bộ để tránh lệch tiền khi giao dịch tác động nhiều nơi. Người dùng vẫn thao tác bằng form **Thu / Chi / Chuyển tiền / Mua / Bán**, không cần nhập bút toán. `accounts` biểu diễn nơi giữ tiền thực tế; `ledger_accounts` còn có tài khoản đối ứng nội bộ như thu nhập, chi phí, nợ và vốn đầu kỳ.

Một entry có nhiều lines và thỏa `tổng debit = tổng credit` theo đồng tiền ghi sổ. DB transaction kiểm tra toàn bộ entry trước khi commit; không chỉ kiểm tra ở UI. Số dư hiện tại là tổng các biến động đã ghi sổ, gồm entry đầu kỳ; không vừa lưu opening balance vừa cộng lại một opening entry.

Ví dụ giả định để kiểm tra thiết kế:

| Hành động | Ảnh hưởng | Không được xảy ra |
| --- | --- | --- |
| Nhận lương 10 triệu | Ngân hàng +10 triệu, thu nhập +10 triệu | Nhập lại tổng thu ở báo cáo |
| Chi 100.000 bằng ví | Ví −100.000, chi phí +100.000 | Giảm ngân sách hai lần |
| Chuyển 1 triệu từ ngân hàng sang ví | Ngân hàng −1 triệu, ví +1 triệu; tổng tài sản giữ nguyên nếu không có phí | Tính 1 triệu thành thu và chi |
| Chuyển tiền vào sổ tiết kiệm | Tiền thanh toán giảm, tiền gửi tăng | Tính tiền gửi vừa là chi phí vừa là tài sản mới |
| Dành 500.000 trong ngân hàng cho Emergency | Số tiền dành cho quỹ +500.000; số dư ngân hàng giữ nguyên | Tổng tài sản tăng 500.000 |
| Mua chứng chỉ quỹ bằng tiền chờ | Cash giảm; số lượng/giá vốn holding tăng; phí được phân loại riêng | Chỉ ghi một nửa hoặc bắt người dùng nhập hai dòng |
| Bán một phần tài sản | Cash tăng theo tiền bán ròng; giảm số lượng/giá vốn; xác định lãi/lỗ đã chốt | Coi toàn bộ tiền bán là lợi nhuận |
| Trả gốc vay 1 triệu | Cash giảm, dư nợ giảm | Đưa toàn bộ gốc trả vào chi phí tiêu dùng |
| Trả lãi 100.000 | Cash giảm, chi phí lãi tăng | Giảm gốc vay tương ứng |

Phí, thuế và giá vốn cần chính sách cụ thể trước P4. Bảng trên là nguyên tắc bảo toàn/đối chiếu, không phải đặc tả mọi trường hợp đầu tư.

Sửa giao dịch đã ghi sổ dùng entry đảo và entry thay thế liên kết bản gốc; bản nháp có thể sửa trực tiếp. Giữ `occurred_at`, `created_at`, `posted_at`, version và người tạo; sửa backdate phải tái tính số dư theo thời gian và đánh dấu snapshot chịu ảnh hưởng. Không tin số dư “trước/sau” do client gửi.

## Chuẩn tiền, số lượng và thời gian

- Bản đầu dùng VND; tiền ghi sổ là đơn vị đồng nguyên (`numeric(24,0)` hoặc bigint theo giới hạn đã chọn). Không dùng float để cộng tiền.
- API truyền amount/quantity/price dạng decimal string có schema; TypeScript kiểm parse và miền giá trị, không `Number()` rồi coi luôn là chính xác. Giá/số lượng crypto hoặc chứng chỉ quỹ dùng decimal với precision/scale phù hợp; đề xuất `numeric(36,18)` để đánh giá trước khi chốt.
- Có currency trong hợp đồng dữ liệu nhưng không đồng nghĩa đã hỗ trợ đa tiền tệ. Crypto/quote USD cần số tiền VND thực tế hoặc tỷ giá có nguồn/thời điểm đã xác nhận.
- Quy tắc làm tròn tiền giao dịch, phí, giá vốn và báo cáo phải thống nhất và kiểm thử. Sai số phân bổ phải được xử lý ở dòng cuối, không để tổng lệch âm thầm.
- Timestamp lưu UTC; ngày nghiệp vụ và kỳ tháng tính theo `Asia/Ho_Chi_Minh`. Khoản chỉ có ngày từ Notion giữ kiểu date và độ chính xác nguồn, không tự tạo giờ giả.
- Phân biệt `occurred_at` của giao dịch, `effective_from` của kế hoạch và `as_of` của giá/định giá. Mỗi số liệu lịch sử có thể truy về nguồn.

## Các công thức cần thống nhất

| Chỉ số | Nguyên tắc đề xuất |
| --- | --- |
| Tổng tài sản | Tổng tiền/tài sản thuộc sở hữu, mỗi tài sản duy nhất tính một lần; holdings theo giá đã chọn |
| Tài sản ròng | Tổng tài sản − nghĩa vụ nợ đã ghi nhận; nếu chưa nhập nợ thì cần phân biệt với tổng tài sản |
| Thực chi ngân sách | Chi đã ghi sổ đúng danh mục/kỳ; quy tắc hoàn tiền/đảo giao dịch phải trừ đúng |
| Số còn lại của ngân sách | Số chuyển tiếp được chấp nhận + mức cấp trong kỳ − thực chi; thay kế hoạch có ngày hiệu lực |
| Tiến độ mục tiêu | `current / target`, giữ dạng ratio; chỉ format % một lần; target = 0 trả “chưa đặt mục tiêu” |
| Lãi/lỗ chưa chốt | Giá trị thị trường phần đang giữ − giá vốn còn lại; cash không dùng cùng phép ROI |
| Lãi/lỗ đã chốt | Tiền bán ròng − giá vốn được phân bổ của lượng đã bán; phí/thuế tính đúng một lần |
| Tỷ suất đơn giản | Lãi/lỗ / giá vốn phù hợp; mẫu số 0 trả null; không gọi đó là IRR/TWR |
| Runway | Nguồn thanh khoản đủ điều kiện / chi thiết yếu tháng đã xác nhận; mẫu số 0 không hiển thị vô cực giả |
| Vốn có thể phân bổ đầu tư | Tiền/tài sản đủ điều kiện còn lại sau cam kết an toàn và khoản đã dành riêng; chốt tránh trừ hai lần |

UI có thể chặn thanh tiến độ ở 100% nhưng phải giữ số thực khi vượt mục tiêu. Không đưa lợi nhuận chưa chốt vào dòng tiền thực nhận. Tỷ trọng mục tiêu dùng basis points hoặc decimal thống nhất, tổng bằng 100%; chưa có giá thì báo thiếu dữ liệu thay vì coi giá = 0.

## Quỹ và mục tiêu

Phân bổ quỹ là lịch sử gắn một phần giá trị vào một nguồn đủ điều kiện. Tổng phân bổ đang có từ cùng nguồn không vượt giá trị khả dụng theo chính sách. Khi rút/chi nguồn đã dành cho quỹ, ứng dụng phải yêu cầu chọn quỹ hoặc giải phóng phần dành riêng; không để tài khoản giảm nhưng quỹ vẫn hiển thị tiền đã hết.

Nếu nhiều mục tiêu cùng tham chiếu một quỹ để xem tiến độ, đó là góc nhìn; không cộng lại vào tổng tài sản. Nếu các mục tiêu đòi tiền độc lập thì phải chia phần dành riêng. Quy tắc này cần người dùng xác nhận trong P3.

## Chuyển dữ liệu từ Notion

1. Cần CSV/export gốc khi bắt đầu migration; ảnh không đủ chính xác để nhập dữ liệu thật.
2. Chọn ngày chốt, danh sách tài khoản, tài sản, dư nợ và số dư được người dùng xác nhận.
3. Giữ snapshot tổng hợp lịch sử riêng nếu chỉ có số tháng/quý. Không tự dựng các giao dịch chi tiết chưa từng tồn tại.
4. Với mốc đầu kỳ, chọn opening balance + phát sinh sau mốc; nếu nhập toàn bộ giao dịch lịch sử thì không cộng thêm cùng số dư mở đầu lần nữa.
5. Map tên, đơn vị vàng, tiền tệ và loại giao dịch; hiển thị dữ liệu lỗi/trùng/thiếu, dry-run trước khi commit.
6. Ghi batch id, nguồn dòng và checksum/id nguồn. Chỉ fingerprint ngày+số tiền+tên không đủ chắc chắn vì có thể có hai giao dịch thật giống nhau.
7. Đối soát theo tài khoản/tháng/tài sản, thử nhập lại và hoàn tác batch. Có chênh lệch phải giải thích, không tự điều chỉnh để ép khớp.

Vàng là holding duy nhất có số lượng/đơn vị và valuation; hiển thị trong trang Tiết kiệm theo sở thích không tạo bản sao danh tính.


## Bổ sung backup toàn tài khoản — 18/10/2026

`data_imports(owner_id,id,fingerprint,result,imported_at)` là biên nhận kỹ thuật append-only, RLS theo owner, thêm bởi migration `202610180002_data_imports.sql`. FullBackupV1 mang 28 bảng tài chính hiện tại, bỏ owner khỏi file và gán owner phiên đích khi nhập; giữ ID/tham chiếu nội bộ. Không xuất Auth secrets hoặc biên nhận import.


## Fund độc lập — 19/10/2026

Bổ sung `funds_books`, `funds_definitions`, `funds_locations`, `funds_configurations`, `funds_transactions`, `funds_audit`, `funds_commands`. Ba loại quỹ cố định, số dư theo (fund_id,location_id). Configuration giữ bản chụp living expense, x và thứ tự ưu tiên. Giao dịch có thời điểm UTC hiển thị giờ Việt Nam; sửa/hủy append revision, replay theo thời điểm và thứ tự gốc. Composite FK owner và trigger bất biến giữ lịch sử. Backup V2 có đủ 35 bảng.
