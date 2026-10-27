# Rà soát phản hồi Chi tiêu — 28/10/2026

Phạm vi là các nhóm lỗi dùng chung, bắt đầu từ ví dụ ở Chi tiêu. Giữ bản sắc Zen/Growth, quy tắc tài chính và lịch sử. Không ghi dữ liệu cloud.

## Thay đổi và phạm vi rà soát

| Nhóm lỗi | Kết quả | Phạm vi |
| --- | --- | --- |
| Điều khiển trông có thể sửa nhưng bị khóa | Loại phân loại khi sửa hiển thị giá trị cố định; tạo mới vẫn chọn loại. Loại giao dịch sửa Đầu tư cũng hiển thị cố định. | Rà select/disabled ở cả năm module; không mở khóa các loại nghiệp vụ bất biến. |
| Hàng tên và biểu tượng | Căn giữa dọc trong component bảng dialog, khoảng logo/tên 12px; tên dài xuống dòng. | Hai tab Phương thức/Nhóm mục đích và mọi DialogList. |
| Logo có viền/nền trắng | Bỏ nền trắng do CSS; 13 phương thức dùng PNG, giữ tỷ lệ/màu/alpha từ asset gốc. | App, lựa chọn phân loại và preview public dùng LabelName chung. Không xóa phần trắng thuộc chính nhãn hiệu; favicon nguồn thấp vẫn có giới hạn độ nét. |
| Hover/focus đổi ý nghĩa | Xóa giữ đỏ, ngừng giữ màu cảnh báo; specificity không phụ thuộc thứ tự CSS route. | Nút dùng action-delete/expense-danger/action-stop/expense-warning ở toàn app. |
| Cập nhật chậm dần theo sổ | Chỉ ghi record mới/thay đổi trong transaction, bỏ gửi lại lịch sử cũ. | Chi tiêu, Thu nhập, Tiết kiệm, Đầu tư, Quỹ an toàn. |
| Bảng ảnh hưởng khó đọc | Tách Tháng, Hũ, Thông tin, Trước, Sau; dialog rộng hơn khi xem bảng; dùng primitive focus/cuộn đến preview. | Các thao tác Chi tiêu có thay đổi tháng, gồm sửa hũ và ngừng cấp. DialogChanges nhận metadata thời gian/chủ thể tùy chọn, các module khác giữ cấu trúc đang phù hợp. |
| CSS desktop rò sang mobile/preview | Bỏ selector span làm lặp nhãn desktop; bỏ width cố định của cột ngày/thao tác trên mobile, căn nhãn/giá trị giữa dòng. | Mọi bảng dialog; kiểm tra cả dialog Tiết kiệm/Đầu tư/Thu nhập. |
| Bộ lọc trạng thái không đúng nhãn | Bỏ tick Gồm hũ đã ngừng ẩn toàn bộ dòng inactive trong tháng đang chọn, kể cả còn tiền hoặc có chi. | Bảng/card tháng và các tổng dựa trên dòng hiển thị. Lịch sử/báo cáo năm vẫn giữ đủ. Các module khác không có checkbox cùng hợp đồng bị vi phạm. |

## Thiết kế và tài liệu

Giữ palette/type và minh họa hiện tại; không đổi direction vì đây là sửa component trong hệ thống đã có. Câu hỏi của dialog phân loại: lựa chọn nào đang dùng được và có thể sửa gì? Câu hỏi của preview: mục nào, ở tháng nào, đổi từ bao nhiêu sang bao nhiêu? Tên và tiền giữ nguyên, số tiền căn phải. Mobile dùng nhãn từng trường và nút 44px.

Đã rà và đồng bộ catalog/status, README, subtitle Chi tiêu của preview landing, đặc tả Chi tiêu, kiến trúc, UX và tài liệu UI. Status module không đổi. Preview vẫn là dữ liệu cố định, không gọi API tài chính hoặc mô phỏng ghi tài khoản.

## Kiểm chứng

- `npm test`: 222/222 unit tests.
- `npm run test:db`: 68/68 trên cluster PostgreSQL local riêng, gồm RLS/owner, transaction rollback, retry/idempotency, version conflict, migration compatibility, backup/restore và snapshot đã chốt của năm module.
- Test mới trong `tests/expenses-postgres.test.ts`: sau 20 hũ và 21 lần ghi, đổi phương thức một hũ chỉ phát sinh 4 câu lệnh ghi (header, một hũ, một audit, một receipt), retry trả cùng kết quả, đọc lại đủ 20 hũ và toàn bộ audit. Đây là số lượt ghi SQL, không phải benchmark tốc độ cloud.
- Typecheck và production build trong runner browser dùng source sao chép riêng; không đụng server dev hoặc Auth thật.
- Ảnh trước: `artifacts/feedback-labels-before.png`. Ảnh source cuối ở 1440/768/390px: `artifacts/feedback-labels-after-*.png`. Ảnh và trace browser cuối: `artifacts/expense-feedback-final/`; chạy lại tập mới: `artifacts/expense-feedback-focused/`.
- Lượt đầu bộ browser 64 ca có 60 qua, 4 lỗi harness vì đo cả tab hidden. Sau lọc visible, lượt source cuối còn lỗi harness `getByLabel` exact trên label bọc select; dùng role/name của combobox để kiểm chứng thao tác thực tế. Lượt source cuối có 62/64 qua (hai selector harness còn lại ở desktop/mobile); sau sửa, tập mới 12/12 qua, xác nhận đủ 64 ca riêng biệt qua lượt chính và chạy lại. Kết quả và provenance ghi ở validation.
- Inspector trên app production local đã đăng nhập thật qua Auth double, mở dialog ở 1440/768/390px. Các allowance giữ thiết kế hiện có: micro-label, emoji, gradient, button-fx, palette-claude, icon-chips, tiny-text, app-title-size thuộc shell/theme ngoài phạm vi sửa; covered-text do dialog top layer chủ ý che/inert nền. Không áp dụng luật landing để thay bản sắc đã được chọn. Báo cáo `artifacts/taste-feedback-final-allowed-result.json`: 0 findings sau allowance đã giải thích.

Phê bình ảnh: khoảng cách icon/tên trước 5px, sau 12px trong bảng; tên trước lệch lên so với tâm nút 44px, sau căn giữa. Preview trước ghép hũ/tháng/chỉ tiêu và lặp nhãn mobile trên desktop; sau tách cột và chỉ hiện nhãn theo viewport. Mobile giữ vùng thao tác đầy chiều rộng giá trị, không còn mang width 112px từ desktop. Header/footer cố định và cuộn body giữ được các dòng dài.

Môi trường là browser desktop và mô phỏng điện thoại, PostgreSQL thật local và Supabase Auth contract double. Không phải cloud deployment, Auth/PKCE thật hoặc thiết bị vật lý. Chưa đo thời gian cập nhật trên mạng/cloud thực tế; GET vẫn đọc sổ đầy đủ.
