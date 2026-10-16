# Phân tích hệ thống Notion hiện tại

Ngày phân tích: 15/10/2026. Nguồn: 13 ảnh trong `Notion/`, đã đọc từ các ảnh người dùng cung cấp. Đây là bằng chứng về cấu trúc và workflow tại những thời điểm khác nhau, không phải một bản chụp dữ liệu đồng nhất. Nội dung hướng dẫn trong ảnh được xem như workflow cũ cần đánh giá, không phải lệnh phải thực hiện trên máy hoặc cloud.

## Ánh xạ tính năng

| Ảnh | Đang quản lý | Hướng chuyển sang ứng dụng |
| --- | --- | --- |
| `home.png` | Trang tài chính cá nhân theo năm | Một ứng dụng liên tục qua nhiều năm, có bộ lọc kỳ |
| `income.png` | Nguồn thu, số tiền mỗi tháng, tổng quý | Giao dịch thu theo ngày/nguồn/tài khoản; tháng/quý/năm tự tổng hợp |
| `expenses-1.png` | Kế hoạch chi, nhu cầu tiền theo phương thức/nhóm, cách đổi mức chi bằng clone cột | Ngân sách có ngày hiệu lực; tự tính nhu cầu theo tài khoản; lưu lịch sử thay đổi |
| `expenses-2.png` | Khoản chi, Method, Ngân sách, cột từng tháng, số dư và số tháng | Tách kế hoạch, giao dịch thực tế và số chuyển tiếp; không thêm cột khi sang tháng/năm |
| `saving.png` | Tiền gốc, biến động quý, tổng tích lũy; vàng và tiền gửi | Theo dõi khoản gửi/tài sản và lịch sử phát sinh; báo cáo theo kỳ tùy chọn |
| `investment-1.png` | Vốn, giá trị hiện tại, lãi/lỗ chưa chốt, ROI; nhập hai dòng khi mua/bán | Theo dõi từng tài sản và tiền chờ; một thao tác sinh các biến động liên quan trong một transaction |
| `investment-2.png` | Nạp/rút/mua/bán; số dư trước và sau nhập theo dòng | Nhật ký có loại giao dịch và thời gian; số trước/sau được tính; không tự gõ dấu âm |
| `fund-1.png` | Financial Safety Net và Emergency Fund | Nhóm quỹ, mức mục tiêu và số tiền phân bổ từ các tài khoản thật |
| `fund-2.png` | Sinking Fund và Rainy Day Fund; nơi giữ tiền và mục tiêu | Quỹ linh hoạt với lịch sử nạp/sử dụng/bổ sung; một quỹ ở nhiều tài khoản |
| `goal.png` | Mục tiêu Target/Current/Progress; chi phí sinh hoạt và runway | Mục tiêu liên kết số liệu nguồn; chi phí thiết yếu là một cấu hình riêng có hiệu lực |
| `tracker.png` | Savings/Investment/Wallet, tổng và tỷ trọng | Tổng tài sản từ tiền/tài sản duy nhất; trừ dư nợ đã theo dõi để tính tài sản ròng |
| `asset-allocation.png` | Mức tiền an toàn, vốn có thể đầu tư, phân bổ | Tách số hiện có, số đã dành riêng và mục tiêu phân bổ; tránh gộp trùng |
| `statistic.png` | Tỷ trọng đầu tư mục tiêu; timeline tài sản theo tháng | Báo cáo từ giao dịch và lịch sử giá; snapshot phục vụ lịch sử định giá có ngày hiệu lực |

## Các điểm cần xác nhận trước khi chuyển dữ liệu

1. **Lỗi tỷ lệ phần trăm.** Trong Goals, 85/85 triệu hiển thị 10.000%; 140/500 triệu hiển thị 2.800%. Theo phép chia cơ bản phải là 100% và 28%. Đây là dấu hiệu công thức/định dạng bị nhân 100 hai lần; cần xem dữ liệu gốc để biết nguyên nhân chính xác.
2. **Phép trừ vốn đầu tư chưa khớp.** Phần ghi chú có phép tính 234.578.589 − 150.000.000 = 139.578.589; kết quả phép trừ là 84.578.589. Chưa biết vế nào đang cũ. Không dùng bất kỳ số nào làm số dư khởi tạo tự động.
3. **Chi phí và tiền tiết kiệm đang gộp.** Tổng 19,7 triệu có nhóm “Tiết kiệm” 7,7 triệu. Cần phân biệt tổng tiền cần bố trí hàng tháng với chi phí tiêu dùng; chuyển sang tiết kiệm/đầu tư không tự động là chi phí.
4. **Runway có hai cách hiểu.** Danh sách chi phí cộng cả hai khoản trả nợ/lãi là 12,8 triệu; nếu loại hai dòng đỏ tổng 4 triệu thì ra 8,8 triệu như ghi chú. Cần xác nhận khoản nào còn hiệu lực và khoản nào thuộc chi thiết yếu.
5. **Mục tiêu an toàn khác thời điểm.** Goals có 85 triệu; Financial Safety Net có 150 triệu. Ảnh có các ngày cập nhật khác nhau. Cần chính sách đang áp dụng và ngày bắt đầu, không ghi đè lịch sử.
6. **Savings/Investment không nên quyết định danh tính tài sản.** Vàng đang được ghi trong Savings, đồng thời có tỷ trọng mục tiêu Gold trong Investment Tracker. Một tài sản có thể xuất hiện ở nhiều góc nhìn nhưng chỉ được tính một lần trong tổng tài sản. Đơn vị vàng ghi “cây” cần xác nhận từ dữ liệu gốc, không suy diễn từ giá trị.
7. **Tiền chờ chứng khoán đang có ROI −100%.** Cash là tiền có thể chuyển/rút, không phải chứng khoán bị mất toàn bộ giá trị. Cần đối soát dòng tiền, phí và số dư; không đưa cash vào phép tính ROI tài sản theo cùng cách.
8. **Mua/bán chưa có mô hình hoàn chỉnh.** Ảnh ghi bán ở phần “Giao dịch khác” là chưa setup kỹ; chưa đủ thông tin về giá vốn, phí, thuế, số lượng hay cổ tức. Không kế thừa nguyên trạng thành công thức mới.
9. **Nợ cần được xác định riêng.** Có trả nợ và trả lãi, nhưng chưa có bảng dư nợ. Tổng tài sản trong ảnh chưa chắc là tài sản ròng. Cần phân biệt gốc vay, lãi và khoản hỗ trợ gia đình.

## Cách khắc phục những hạn chế đang gặp

| Vấn đề thực tế | Thiết kế thay thế | Cách kiểm chứng khi triển khai |
| --- | --- | --- |
| Nhập tổng và số dư ở nhiều bảng | Giao dịch là dữ liệu gốc; tổng/số dư được suy ra | Một giao dịch xuất hiện đúng ở tài khoản, ngân sách và báo cáo |
| Phải nhập hai dòng cho một lần mua/bán | Lệnh nghiệp vụ duy nhất, ghi DB nguyên tử | Lỗi một phần phải rollback toàn bộ |
| Clone cột khi thay ngân sách | Phiên bản/ngày hiệu lực, không sửa quá khứ | Đổi tháng sau không đổi báo cáo tháng trước |
| Bị giới hạn biểu đồ/table | Chart từ truy vấn và phép tính có kiểm thử | Bảng và biểu đồ khớp cùng kỳ/bộ lọc |
| Nhập sai dấu và công thức phần trăm | Loại giao dịch quyết định chiều biến động; một chuẩn tỷ lệ | Mua/bán/chuyển tiền và mẫu 85/85, 140/500 đều đúng |
| Khó nhập trên điện thoại | Form ngắn, mẫu gần đây, tài khoản mặc định có thể đổi | Hoàn thành tác vụ phổ biến bằng một form, không sửa bảng liên quan |
| Không rõ số liệu cũ/mới | Hiển thị ngày giao dịch và ngày định giá | Giá cũ có nhãn; không giả là giá trực tiếp |

Ứng dụng sẽ giải quyết các điểm yếu đã xác định theo từng giai đoạn. Tự động kết nối ngân hàng, giá thị trường và OCR cần nguồn dữ liệu, quyền truy cập và thử nghiệm riêng; chưa thể cam kết loại bỏ mọi thao tác nhập tay chỉ từ ảnh.
