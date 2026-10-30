# Mục tiêu — 30/10/2026

Trạng thái: triển khai source; bằng chứng local ghi trong docs/07-validation.md. Không suy ra đã áp migration hoặc triển khai cloud.

## Loại và cách ghi nhận

/goals hỗ trợ mục tiêu chi dùng/cuộc sống và cột mốc tài chính. Mỗi mục tiêu chọn sổ riêng hoặc liên kết dữ liệu khi tạo; loại và cách ghi nhận không đổi về sau. Có tên, số tiền đích dương, hạn tùy chọn, ghi chú, mức dự định góp mỗi tháng và thứ tự ưu tiên. Nút lên/xuống xem trước thứ tự mới rồi xác nhận.

Nguồn liên kết là từng danh mục Tiết kiệm/Đầu tư hoặc từng Quỹ an toàn. Quỹ chỉ dùng với cột mốc. Mục tiêu chi dùng chọn tỷ lệ (tối đa hai số lẻ), lưu basis points nguyên; tổng phần chia của mục tiêu active/paused không quá 100% mỗi nguồn, không phân biệt cơ sở định giá. Cột mốc theo dõi 100% từng nguồn đã chọn, được trùng nguồn.

Chọn vốn hiện còn hoặc giá trị hiện tại cho từng mục tiêu. Tiền mặt và Quỹ dùng số dư; tiền gửi dùng gốc còn lại; vàng/đầu tư dùng giá vốn hoặc định giá. Phần chia làm tròn xuống từng nguồn bằng BigInt. Nguồn thiếu là chưa đủ dữ liệu, không coi là số 0; định giá cũ có nhãn cảnh báo và ngày giá. Nguồn đã ngừng không nhận liên kết mới, các liên kết cũ vẫn đọc được.

Liên kết chỉ đọc: không chuyển tiền ngân hàng, không khóa hay sửa số dư nguồn. Sổ riêng độc lập với các sổ khác; không nhận ra cùng một khoản tiền đã được nhập ở nhiều module. Không cộng các mục tiêu thành tổng tài sản.

## Kế hoạch và trạng thái

Còn thiếu = max(đích - tiến độ, 0). Thanh tiến độ giới hạn 100%, số tiền/phần trăm vẫn thể hiện vượt đích. Mức cần góp chia phần thiếu cho số tháng lịch còn lại, gồm tháng hiện tại và tháng đến hạn, làm tròn lên VND. Hạn quá ngày hiện tại hiện quá hạn và không đưa mức góp gây hiểu nhầm. Mức góp dự định dương cho ước tính tháng đạt theo số kỳ cần góp, không giả định lãi, không tự tạo giao dịch. Dự kiến vượt năm 2099 không hiển thị.

Tạm dừng giữ phần chia nhưng ngừng dự kiến tháng đạt. Đủ tiền chỉ hiện “Đã đủ tiền”; xác nhận hoàn thành lưu thời điểm, tiến độ, đích và nguồn, giải phóng phần chia. Không hoàn thành khi thiếu nguồn hoặc chưa đủ tiền. Hoàn thành không tăng tiến độ khi nguồn đổi. Lưu trữ giải phóng phần chia; sổ riêng chỉ lưu trữ khi hết số dư. Mở lại kiểm tra nguồn/phần chia; mốc hoàn thành cũ vẫn trong audit.

Sổ riêng đã hoàn thành giữ số dư thực tách với mốc đạt; cho rút/chuyển ra nhưng muốn góp/nhận chuyển thêm phải mở lại.

## Sổ riêng và lịch sử

Có số dư ban đầu, góp, rút, chuyển nguyên tử giữa hai mục tiêu sổ riêng. Số dư ban đầu phải là giao dịch đầu tiên. Tiền VND nguyên tối đa 24 chữ số; giao dịch phải dương. Thời gian lưu ISO timestamp, nhập/hiển thị Việt Nam; không nhập tương lai.

Rút/chuyển cần lý do. Sửa/hủy cần lý do; giữ loại và hai đầu giao dịch, tạo revision và replay theo thời điểm cùng thứ tự ghi gốc. Mọi số dư không âm ở mọi bước, mục tiêu đã lưu trữ vẫn phải bằng 0. Chuyển không tạo tiền góp mới. Không xóa cứng.

Chi tiết có tiến độ/kế hoạch, nguồn/giao dịch và lịch sử. Giao dịch có tìm kiếm, lọc loại/ngày và 20 dòng/trang. Biến động nguồn xem ở module gốc; GET không tự tạo snapshot/audit.

## API, dữ liệu và bảo mật

- GET /api/v1/goals: book, states, sources, today/now, dataGeneration; không khởi tạo sổ.
- POST /api/v1/goals/preview: xem trước, không ghi.
- POST /api/v1/goals/commands: lưu với id, expectedVersion, expectedSources và action.
- Actions: saveGoal, setStatus, reorder, postTransaction, reviseTransaction.
- Kết quả command chỉ giữ cấu hình mục tiêu và states trước/sau; không nhân bản toàn bộ sổ/lịch sử trong từng biên nhận. Audit chỉ chụp các nguồn liên quan hành động.
- Retry cùng ID/payload trả kết quả đã lưu; khác payload báo xung đột. Nguồn đổi sau preview phải tải mới/xem lại, giữ bản nháp.
- Auth/Origin/private no-store dùng chuẩn API tài chính. Owner lấy từ server Auth; RLS và trigger nguồn ngăn liên kết chéo owner.
- Khóa Expenses → Savings → Investments → Funds → Goals, đồng bộ backup/restore/reset. Kiểm data generation trước đọc biên nhận.

Migration 202610300002_goals.sql thêm sáu bảng Goals, chính sách, ràng buộc và tích hợp allowlist/fingerprint/khóa/xóa của reset. Không seed hoặc chạy reset. Cần đầy đủ migration trước đó, gồm sửa owner claims.

Backup xuất V3 gồm 41 bảng; nhận V1/V2 theo allowlist gốc, chuẩn hóa phần chưa có thành trống. Restore kiểm nguồn và replay audit; khôi phục nguồn trước links. Backup/status dừng nếu thiếu schema.

## Giao diện và phạm vi

Giữ shell/token/font và năm theme, thẻ hai cột desktop/một cột mobile; hướng Achromatic ledger, màu chủ yếu cho tiến độ và trạng thái. Form nhóm rõ, xem trước/xác nhận, xác nhận bỏ nháp, che tiền và vi/en. Seed thiết kế 1650097295; giữ shell hiện tại theo sản phẩm thay shell gợi ý dành cho app mới.

Bản đầu chỉ /goals, không thêm widget hoặc dữ liệu Goals vào Tổng quan. Preview landing dùng số giả cố định: mua xe đích 100 triệu, đã góp 40 triệu, thiếu 60 triệu, dự định 5 triệu/tháng trong 12 tháng. Không đọc API tài chính tài khoản.
