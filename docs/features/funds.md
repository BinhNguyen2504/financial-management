# Quỹ an toàn — 19/10/2026

`/funds` cung cấp Emergency (biến cố lớn), Rainy Day (phát sinh nhỏ), Sinking (chi phí thiết yếu đã biết trước). Mục tiêu mua sắm/cuộc sống nằm ở Financial Goals riêng. Nội dung hướng dẫn tham khảo [CFPB](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/) và [MoneyHelper](https://www.moneyhelper.org.uk/en/blog/everyday-money/sinking-funds-explained). Phân biệt ba quỹ là cách tổ chức sản phẩm; số tháng và ưu tiên do người dùng chọn.

Tinh chỉnh 26/10/2026: nguồn CFPB/MoneyHelper dùng `.external-link` chung với Cài đặt và Thu nhập, có chữ đậm, màu theo theme, gạch chân luôn hiện và phản hồi hover/focus. Chữ được xuống dòng trên mobile, giữ đích mở tab mới; cùng thành phần hướng dẫn xuất hiện ở onboarding và chi tiết quỹ.

## Thiết lập và nguồn

Giới thiệu → chọn hũ sinh hoạt → nhập ba hệ số x → xếp ưu tiên bằng nút → xem trước → xác nhận. GET không tự tạo sổ. Living expense cộng mức cấu hình hiệu lực của hũ chi tháng đang hoạt động, bỏ qua ngoại lệ theo tháng và hũ tích lũy. Snapshot giữ ID/tên/mức hũ, tháng, expenseVersion. x là chuỗi thập phân dương tối đa hai chữ số lẻ; mục tiêu làm tròn lên VND, mỗi mục tiêu/số dư không quá 24 chữ số. Không có số mặc định từ ảnh Notion.

Mức sinh hoạt bằng 0 hoặc hũ không phù hợp chặn áp dụng. Nguồn đổi hiển thị thông báo, không đổi mục tiêu cho đến xác nhận. Đổi x có thể giữ snapshot cũ hoặc áp dụng nguồn mới. Lưu kiểm lại expenseVersion và tháng khi áp dụng nguồn; VERSION_CONFLICT / EXPENSE_VERSION_CONFLICT yêu cầu tải mới, giữ bản nháp và xem trước lại. Emergency đủ mấy tháng dùng snapshot đã xác nhận. Tổng còn thiếu là tổng phần thiếu từng quỹ; phần thừa quỹ khác không tự bù.

## Tiền và lịch sử

Sổ độc lập với Tiết kiệm/Đầu tư/Chi tiêu. Nơi giữ dùng chung, số dư riêng từng quỹ. Số dư ban đầu phải là giao dịch đầu tiên tại cặp quỹ/nơi giữ. Hỗ trợ thêm, rút, chuyển cùng quỹ hoặc liên quỹ. Chuyển nguyên tử, giữ tổng, không tính là góp mới. Thêm tiền khác số dư ban đầu trong tổng đóng góp.

Thời điểm hiển thị Việt Nam, persist ISO timestamp; mặc định hiện tại và không nhận tương lai. Rút/chuyển cần lý do. Sửa/hủy cần lý do, giữ mọi revision; replay theo thời điểm và thứ tự ghi gốc khi trùng thời điểm. Mọi số dư phải không âm ở mọi bước. Nơi giữ chỉ ngừng khi mọi quỹ tại đó bằng 0; có thể khôi phục. Giao dịch cũ có thể đối soát tại nơi đã ngừng nếu kết quả vẫn bằng 0.

Danh sách có tìm kiếm/lọc quỹ, loại, nơi giữ, ngày và 20 dòng/trang. Chi tiết có Hướng dẫn/Giao dịch/Nơi giữ tiền/Lịch sử; parent giữ tab, bộ lọc và vị trí khi dialog con lưu/đóng.

## API và bảo toàn dữ liệu

- `GET /api/v1/funds`: book, state, nguồn hiện tại, đề xuất living expense và cờ thay đổi.
- `POST /api/v1/funds/preview`: `{ id, expectedVersion, action }`, không ghi.
- `POST /api/v1/funds/commands`: cùng payload; retry cùng ID/payload trả kết quả cũ.
- Actions: configure, saveLocation, postTransaction, reviseTransaction (replacement null là hủy).

API trả 401/403/409/422/503 theo chuẩn app, private/no-store, cookie Origin và Bearer Auth. Owner chỉ lấy từ Auth server. Transaction dùng RLS và khóa Expenses trước Fund, đồng bộ với restore. Schema nằm trong `src/domain/funds/schema.ts`; migration `202610190001_funds.sql` chỉ thêm dữ liệu cấu trúc, không seed. Sửa/hủy/audit/cấu hình/command là append-only.

Backup tại Cài đặt: V2 có đầy đủ Fund; V1 nhập với Fund trống. Validator dựng lại lịch sử Fund để phát hiện cấu hình/số dư bị sửa. Không có nhập offline, lãi tự động hoặc kết nối ngân hàng. Dữ liệu ở RAM của view, refresh foreground dùng helper chung và giữ bản nháp khi mất mạng. Lỗi xác thực gỡ dữ liệu khỏi view và về đăng nhập.

## Minh họa và riêng tư

Cây Emergency, ô Rainy Day và cầu Sinking biến đổi theo tỷ lệ thực, mốc 25/50/75/100 với biến đổi nhỏ ở giữa. Chỉ hiệu ứng ngắn sau lưu thành công, reduced motion giữ hình tĩnh. Privacy Mode che số tiền và trợ năng; tỷ lệ và hình vẫn hiện. Số vượt 100% ghi chính xác, hình giới hạn mức hoàn thiện.

Triển khai cloud cần migration trước source mới. Chứng cứ kiểm thử và giới hạn môi trường xem `../07-validation.md`; trạng thái source không khẳng định deployment hay thiết bị vật lý.

## Dữ liệu review — 19/10/2026

Generator `scripts/lib/fund-review-data.ts` dùng domain thật để dựng cả lịch sử trước khi sinh SQL. Bộ mẫu tham khảo mục tiêu 54/42/54 triệu và phân bổ Rainy Day từ ảnh Notion; mọi số dư/ngày/giao dịch là minh họa. Living expense chụp mức cấu hình của năm hũ đang có (6 triệu/tháng), không sửa Chi tiêu để khớp 9 triệu trong ảnh. Hệ số cuối 9/7/9; Emergency 27 triệu (50%), Rainy Day 44,1 triệu (105%), Sinking 13,5 triệu (25%). Có chuyển liên quỹ, sửa/hủy, cấu hình trước/sau, nơi giữ đã ngừng và nơi giữ trống.

Nạp riêng Fund yêu cầu marker bốn module trước cùng dataset và Fund trống; nạp lại đúng bộ giữ chỉnh sửa review. SQL kiểm lại phiên bản, tháng và từng hũ nguồn trong transaction. Runtime CLI backup đúng owner trước và read-back qua RLS; không tự migration. Bộ reset 35 bảng và biên nhận restore tùy schema có guard owner/dataset/xác nhận riêng; không chạy trong seed. Hướng dẫn ở `../10-sample-data.md`. Catalog, landing và public preview đã được đối chiếu: vẫn dùng dữ liệu cố định riêng, không lấy bộ private của owner.

## Help theo ngữ cảnh — 20/10/2026

Help tái sử dụng guides hiện có cho định nghĩa và nguyên tắc ba quỹ. Giải thích nguồn sinh hoạt đã xác nhận, hệ số, số dư độc lập, nơi giữ và giao dịch. Nhắc rõ Mục tiêu riêng còn đang phát triển. Xem [Help theo từng trang](help.md).

## Quy chuẩn giao diện dùng chung — 20/10/2026

Form có chỉ báo bắt buộc, lỗi tại trường và tổng hợp lỗi có liên kết; tiền nguyên được chuẩn hóa khi blur/submit. Sửa dữ liệu không thay đổi vô hiệu xem trước/lưu. Nút hủy/lưu và thao tác giao dịch có icon, hủy giao dịch có nhấn mạnh nguy hiểm. Giữ nguyên wizard cấu hình, công thức quỹ và lịch sử; bảng dùng bộ căn cột chung. Xem [đối chiếu phản hồi toàn ứng dụng](interface-feedback-2026-10-19.md).

## Minh họa theo chủ đề — 21/10/2026

Khu vườn giữ cây/tán ô/cây cầu; Dòng nước dùng hồ dự trữ đầy dần, mái che mở rộng dưới mưa và thuyền tiến về bến. Kim ngân có chồng xu cao dần (Emergency), túi dự phòng đầy dần có khiên bảo vệ (Rainy Day) và rương tích lũy đầy dần (Sinking). Lửa ấm có bếp lửa ấm dần (Emergency), đèn dưới mái che sáng dần (Rainy Day) và đốm lửa tiến về đèn đích (Sinking). Đất lành có nền đá xây cao dần (Emergency), mái trú đất nung mở rộng (Rainy Day) và đá xếp tiến lên bậc thang đến đích (Sinking). Năm bộ cùng nhận tỷ lệ đã giới hạn cho hình vẽ; dữ liệu/số dư và mốc 0/25/50/75/100% giữ cách tính hiện có. Vượt mục tiêu chỉ giới hạn hình ở 100%. Che tiền không che tỷ lệ. Nhãn trang trí theo chủ đề, hướng dẫn nghiệp vụ giữ nguyên. Xem [themes](themes.md).

## Xem trước giao dịch và phản hồi — 21/10/2026

Xem trước nêu loại giao dịch cùng bảng các số dư/mục tiêu thực sự đổi, đối chiếu Trước–Sau và mức tăng giảm. Nơi giữ tiền, nguồn mức sinh hoạt và giao dịch gốc nằm trong Chi tiết có thể mở. Tiền VND được đọc ngay dưới ô; hệ số x giữ dạng số. Lỗi tại trường hoặc form, toast kết quả và footer cố định dùng cùng quy chuẩn chung; không ghi từ bước xem trước.

## Anh/Việt — 22/10/2026

Giao diện, Help và thông báo dùng ngôn ngữ trong Cài đặt; định dạng vi-VN/en-GB, vẫn VND và giờ Việt Nam. Tên/ghi chú và dữ liệu tài chính giữ nguyên. Không có migration hay đổi cấu trúc backup. Xem [đặc tả ngôn ngữ](localization.md).

## Bố cục và cuộn — 23/10/2026

Tab chi tiết một hàng cuộn ngang, giữ nhãn đầy đủ và đưa mục đang chọn vào tầm nhìn bằng cuộn nội bộ. Phân trang giao dịch được rà soát cùng nhóm điều khiển mobile. Xem [ma trận rà soát](layout-scroll-2026-10-23.md).

## Minh họa và bố cục tiêu đề — 26/10/2026

Tiêu đề luôn có cảnh bảo vệ riêng cho năm theme: cây/khiên, hải đăng, két dự phòng, vòm nến, vòm đá che mầm cây. Hình trang trí tĩnh, không biểu thị tỷ lệ giả; tiến độ thật vẫn do `ProgressScene` ở từng thẻ đảm nhiệm. Hình dùng tỷ lệ lớn chung với các trang tài chính; Nơi giữ tiền/Điều chỉnh mục tiêu ở hàng riêng khi đã thiết lập quỹ. Không đổi cấu hình, số tiền hoặc cách tính mục tiêu. Xem [tỷ lệ minh họa](themes.md).
