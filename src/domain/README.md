# Nghiệp vụ dùng chung (dự kiến)

Nơi đặt kiểu dữ liệu, kiểm tra đầu vào và hàm tính toán thuần TypeScript khi đặc tả từng tính năng được xác nhận. Không phụ thuộc React, Next.js, Supabase hoặc API trình duyệt; có thể dùng chung trong backend và các phần TypeScript của web.

App iOS dự kiến dùng Flutter/Dart. Flutter không import trực tiếp package TypeScript này: backend thực hiện nghiệp vụ và cung cấp kết quả qua HTTP API. Hai client dùng chung hợp đồng dữ liệu và kịch bản kiểm thử; model, form và API client Dart được triển khai hoặc sinh riêng.

Module `expenses/` đã triển khai công thức hũ chi tháng/tích lũy, cấu hình theo kỳ, chuyển dư và chốt năm bằng BigInt. Có kiểm thử nghiệp vụ, PostgreSQL và trình duyệt local. Mô hình cho các module còn lại vẫn nằm trong `docs/03-data-model.md`. Các số liệu trong ảnh không phải seed data. Mọi thay đổi số tiền, giá vốn, phân bổ và đồng bộ phải có kiểm thử nghiệp vụ khi được triển khai.

Module `income/` quản lý thực nhận danh mục–tháng và khoản thu phát sinh, cấu hình tên/trạng thái theo tháng hiệu lực, báo cáo/CSV dùng chung hàm tính BigInt. Thu nhập hoạt động độc lập với Chi tiêu và tài khoản.
