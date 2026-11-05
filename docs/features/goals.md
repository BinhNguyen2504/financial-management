# Mục tiêu — 30/10/2026

Bổ sung 05/11/2026: [bộ dữ liệu review Mục tiêu](goals-review-data.md) tạo các case từ Notion và tự bổ sung, nạp qua runtime/RLS có backup, kiểm sổ trống/nguồn và đối soát sau ghi. Không đổi giao diện hoặc quy tắc nghiệp vụ. Reset chờ xác nhận UI/UX.

Trạng thái: triển khai source; bằng chứng local ghi trong docs/07-validation.md. Không suy ra đã áp migration hoặc triển khai cloud.

## Loại và cách ghi nhận

/goals hỗ trợ mục tiêu chi dùng/cuộc sống và cột mốc tài chính. Mỗi mục tiêu chọn sổ riêng hoặc liên kết dữ liệu khi tạo; loại và cách ghi nhận không đổi về sau. Có tên, số tiền đích dương, hạn tùy chọn, ghi chú, mức dự định góp mỗi tháng và thứ tự ưu tiên. Nút Sắp xếp ưu tiên mở toàn bộ danh sách; dùng lên/xuống chỉnh nhiều vị trí, xem trước thứ tự mới rồi xác nhận.

Nguồn liên kết là từng danh mục Tiết kiệm/Đầu tư hoặc từng Quỹ an toàn. Từ 05/11/2026, mỗi danh mục Đầu tư mới chọn là một dòng gồm tài sản và toàn bộ tiền chờ thuộc danh mục: giá trị hiện tại = giá trị tài sản + tiền chờ; vốn hiện còn = giá vốn còn lại + tiền chờ. Không hiển thị ví thành nguồn chọn riêng. Quỹ chỉ dùng với cột mốc. Mục tiêu chi dùng chọn tỷ lệ (tối đa hai số lẻ), lưu basis points nguyên; tổng phần chia của mục tiêu active/paused không quá 100% mỗi nguồn, không phân biệt cơ sở định giá. Cột mốc theo dõi 100% từng nguồn đã chọn, được trùng nguồn.

Chọn vốn hiện còn hoặc giá trị hiện tại cho từng mục tiêu. Tiền mặt và Quỹ dùng số dư; tiền gửi dùng gốc còn lại; vàng/đầu tư dùng giá vốn hoặc định giá. Phần chia làm tròn xuống từng nguồn bằng BigInt. Nguồn thiếu là chưa đủ dữ liệu, không coi là số 0; định giá cũ có nhãn cảnh báo và ngày giá. Nguồn đã ngừng không nhận liên kết mới, các liên kết cũ vẫn đọc được.

Liên kết chỉ đọc: không chuyển tiền ngân hàng, không khóa hay sửa số dư nguồn. Sổ riêng độc lập với các sổ khác; không nhận ra cùng một khoản tiền đã được nhập ở nhiều module. Không cộng các mục tiêu thành tổng tài sản.

### Tương thích nguồn Đầu tư — 05/11/2026

Liên kết mới ghi `scope: "portfolio"`, vẫn tham chiếu UUID danh mục để giữ khóa ngoại/owner. Nguồn có `componentIds` cho tài sản và các ví; `legacyItems` giữ các position cũ ngoài danh sách chọn. Liên kết không có scope tiếp tục tính theo phần đã lưu, giữ tỷ lệ, lịch sử và snapshot hoàn thành; GET không ghi hoặc tự chuyển đổi. Khi chỉnh mục tiêu cũ, nguồn vẫn gom một dòng, có ghi chú và tỷ lệ từng phần. Bỏ chọn rồi chọn lại sẽ dùng tổng danh mục; xem trước thể hiện cách liên kết và tiến độ trước/sau, chỉ ghi khi xác nhận.

Phần chia portfolio tiêu thụ cùng tỷ lệ ở từng thành phần; kiểm giới hạn chung với liên kết cũ theo tài sản/ví để tránh chia quá 100%. Tiền dùng BigInt và schema tổng hỗ trợ nhiều nguồn 24 chữ số. Ngày định giá/cảnh báo cũ theo tài sản; không thay thiếu định giá bằng tiền chờ. Báo cáo Mục tiêu dùng cùng bộ tính và giữ tương thích nguồn cũ. Backup V3 giữ scope trong cấu hình/audit; bảng liên kết vẫn là tham chiếu nguồn vật lý. Không thêm SQL/migration, không reset hoặc sửa số dư nguồn.

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

## Khoảng cách và focus — 02/11/2026

Trạng thái trống tách mô tả/nút tạo 16px. Footer tạo, xem trước, chi tiết và bỏ nháp dùng bố cục Modal chung: khe 12px, mobile ba nút dành hàng cuối cho xác nhận. Cặp ưu tiên cách 8px; các thao tác chi tiết đứng thành nhóm cạnh nhau. Chuột/chạm WebKit giữ focus nút mở và nút Hủy khi trở về từ dialog bỏ nháp. Quy tắc nghiệp vụ, API và dữ liệu không đổi. Xem [rà soát toàn ứng dụng](action-layout-2026-11-02.md).

### Cải thiện thao tác — 04/11/2026

Đối chiếu [thiết kế dùng chung](workspace-comfort-2026-11-04.md): đầu trang gọn, bảo vệ nháp và giữ ngữ cảnh xem theo tài khoản trong phiên. Các lựa chọn nghiệp vụ, dữ liệu và lịch sử hiện có được giữ. Phần khôi phục/làm trống nằm sau lựa chọn giao diện trong Cài đặt; không thay điều kiện restore/reset.

### Tối ưu tải dữ liệu — 04/11/2026

Đối chiếu [hợp đồng dùng chung](performance-2026-11-04.md): đọc snapshot/projection, phản hồi view sau commit cho sáu sổ, chi tiết Báo cáo theo metric và foreground chống tải lặp ở Cài đặt. Giữ quy tắc tiền, lịch sử, phiên bản và owner/RLS; không thêm migration hoặc suy ra trạng thái cloud.


## Nội dung cho người dùng phổ thông — 04/11/2026

Đã rà soát cách gọi, hướng dẫn bắt đầu/đọc số liệu và khả năng tìm thao tác theo [bảng đối chiếu nội dung và tác vụ](friendly-content-2026-11-04.md). Giữ nguyên nghiệp vụ và dữ liệu; kết quả kiểm chứng mới ghi riêng trong nhật ký validation.


## Bố cục và sắp xếp ưu tiên — 05/11/2026

Thay cặp mũi tên trên từng thẻ bằng **Sắp xếp ưu tiên** cạnh bộ lọc. Hộp hiện toàn bộ mục tiêu bất kể bộ lọc, có thứ tự, trạng thái và nút lên/xuống; thay nhiều vị trí trong nháp, xem trước vị trí cũ/mới rồi xác nhận một lần. Không có thay đổi thì không xem trước; đóng nháp đã chỉnh cần xác nhận bỏ.

Chi tiết dùng tab chung với bàn phím và vị trí cuộn riêng. Tiến độ có số tiền/phần trăm/thanh; kế hoạch góp và số dư/mốc hoàn thành tách rõ. Giao dịch dùng biểu tượng sửa/hủy 44px cùng hàng, giữ lý do/xem trước/xác nhận và lịch sử. Lọc loại có lựa chọn Tất cả; dữ liệu và bộ lọc giữ khi chuyển tab hoặc mở form con. Ghi chú dài có thể mở đủ nội dung.

Form nhóm trường, liên kết lỗi với ô nhập; xem trước chỉ hiện thay đổi và gọi đúng “Mục tiêu”. API, quy tắc tính tiền, schema, Auth/RLS và dữ liệu review giữ nguyên. Xem [đặc tả và bằng chứng](goals-layout-2026-11-05.md).
