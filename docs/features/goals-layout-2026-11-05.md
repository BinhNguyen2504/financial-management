# Bố cục Mục tiêu — 05/11/2026

## Thay đổi

Rà lại toàn bộ /goals từ bốn ảnh review: chi tiết dàn số quá xa, thao tác giao dịch xếp dọc, bộ lọc kéo giãn và danh sách ưu tiên tĩnh. Giữ font Nunito, năm theme, shell và quy tắc tài chính.

- Bộ lọc: tìm kiếm, trạng thái, tải lại; hàng dưới có số kết quả, reset và sắp xếp. Reset không ghi tài chính.
- Thẻ: hai cột desktop, một cột dưới 700px, thống nhất căn chỉnh, bỏ mũi tên lặp.
- Chi tiết: tiến độ nổi bật; kế hoạch góp và số dư/nguồn/mốc hoàn thành có nhóm riêng; ghi chú dài mở được đầy đủ. Số vượt đích giữ nguyên; thanh tối đa 100%; thiếu dữ liệu khác số 0.
- Tab: dùng DialogTabs với role tab/tabpanel, phím mũi tên/Home/End, giữ bộ lọc/phân trang/vị trí cuộn và ngữ cảnh khi đóng form con.
- Giao dịch: mobile giữ tìm kiếm và nút Bộ lọc giao dịch, mở loại/ngày khi cần để hàng giao dịch không bị đẩy xa; bút sửa/thùng rác, tên truy cập và title, hai vùng bấm 44×44px cách 8px; ngày/giờ và tên đối ứng thành dòng phụ; mobile chuyển thành từng giao dịch có nhãn, không mất trường dữ liệu.
- Ưu tiên: toàn bộ danh sách, số thứ tự/trạng thái, nút lên/xuống; giữ focus theo mục, thông báo vị trí, vô hiệu hóa đầu/cuối. Chỉnh nháp không gọi commands; xem trước trước/sau, quay lại giữ nháp, xác nhận ghi một lần.
- Form: nhóm trường, lỗi ARIA liên kết ô nhập, focus tóm tắt lỗi; preview không lặp thông tin không đổi và dùng tiêu đề Mục tiêu thay Hũ.

## Hợp đồng

Không thêm API/migration. Reorder dùng GoalAction hiện có, danh sách phải chứa mỗi mục tiêu đúng một lần. Giữ idempotency, expectedVersion/expectedSources và dataGeneration; danh sách thay đổi khi tải lại yêu cầu người dùng dùng thứ tự mới nhất trước khi sắp xếp lại. DialogList bổ sung filterDisclosure tùy chọn, mặc định false, chỉ Goals bật để thu bộ lọc phụ trên mobile. DialogChanges bổ sung subjectLabel tùy chọn, mặc định Hũ cho các module đang dùng; Goals truyền Mục tiêu. CSS riêng nằm trong phạm vi Goals; các module khác tiếp tục dùng thành phần chung.

Page /goals vẫn await pageAccess. Public preview dùng số cố định, không đọc API tài chính. Không nhập/xóa/reset dữ liệu review hoặc chạy migration cloud.

## Kiểm chứng

Bằng chứng trước: runner PostgreSQL/Auth giả lập tách biệt, production build snapshot trước khi sửa; goal-review-data desktop đạt 1/1. Ảnh gốc được giữ trong artifacts/goals-layout-2026-11-05/before/.

Bằng chứng sau: npm run check đạt (338 unit tests, lint/architecture/format/typecheck/production build), PostgreSQL local 116/116, browser liên quan 195/195 trên năm cấu hình. Kết quả chi tiết trong docs/07-validation.md. Ảnh nằm trong artifacts/goals-layout-2026-11-05/after/. Đây là artifacts local, không phải tài sản deploy hoặc dữ liệu tài khoản thật.

### Công cụ thiết kế

Lint app của design-taste-frontend đạt 0 FAIL, 1 WARN về 19 dấu “—” trong source: đây là ký hiệu giá trị chưa có/không áp dụng, giữ để phân biệt với số 0. Đã dùng probe/judge của skill trực tiếp trên Playwright đã đăng nhập vào Auth double local. Script/báo cáo/ảnh nằm ở artifacts/goals-layout-2026-11-05/inspection/. Không xuất cookie hoặc dùng tài khoản cloud. Các ngoại lệ giữ theo thiết kế hiện có: nền cream/terracotta theo theme; chevron native-select vẽ bằng hai tam giác CSS; bóng nút dùng chung; bóng hộp thoại nổi thật; biểu tượng trong ô bấm là các nút sửa/hủy và lên/xuống đã chọn, không phải hình trang trí chỉ số. Chữ nhỏ của nhãn nhóm sidebar thuộc shell hiện có.

Ảnh đã xem trực tiếp: [tiến độ desktop](../../artifacts/goals-layout-2026-11-05/inspection/progress-1440.png), [giao dịch desktop sáng](../../artifacts/goals-layout-2026-11-05/inspection/transactions-1440.png), [giao dịch desktop tối](../../artifacts/goals-layout-2026-11-05/after/desktop-water-dark-1440-ledger.png), [ưu tiên mobile](../../artifacts/goals-layout-2026-11-05/inspection/priority-320.png), [bộ lọc giao dịch mobile](../../artifacts/goals-layout-2026-11-05/inspection/transactions-320.png) và [số tiền 24 chữ số/tên dài/tiếng Anh](../../artifacts/goals-layout-2026-11-05/inspection/english-large-amount-320.png).
