# Dữ liệu mẫu Mục tiêu — 05/11/2026

Bộ mẫu phục vụ review `/goals`. Hai mức đích an toàn tài chính 85 triệu và đầu tư 500 triệu, cùng tên học phí cho Thủy, tham khảo `Notion/goal.png`. Các mục tiêu khác, ngày và giao dịch sổ riêng là dữ liệu tự tạo, có ghi chú nhận diện. Không nhập các phần trăm sai trong Notion hoặc coi số dư trong ảnh là tài sản hiện tại.

## Các trường hợp có thể review

| Mục tiêu | Trường hợp |
| --- | --- |
| An toàn tài chính | Cột mốc liên kết ba Quỹ, đích 85 triệu; tiến độ lấy số dư nguồn hiện tại |
| Danh mục đầu tư 500 triệu | Liên kết các nguồn Đầu tư theo giá trị hiện tại, giữ cảnh báo định giá cũ/thiếu |
| Vốn đầu tư dài hạn | Cùng nguồn Đầu tư nhưng theo giá vốn; không cộng hai cột mốc thành tổng tài sản |
| Góc làm việc tại nhà / Chuyến đi cùng gia đình | Chia 60% / 40% một nguồn Tiết kiệm; mục tiêu thứ hai tạm dừng và giữ phần chia |
| Mua xe đi làm | 40/100 triệu, góp dự định 5 triệu/tháng; hơn 20 giao dịch để review phân trang, tìm/lọc, sửa/hủy và nhận chuyển |
| Học phí cho Thủy | 8/8 triệu, đủ tiền và chưa xác nhận hoàn thành |
| Tết cùng gia đình | 13,5/12 triệu, vượt đích 112,5%, thanh tiến độ giới hạn 100% |
| Đổi laptop phục vụ công việc | 6/20 triệu, quá hạn; không hiển thị mức cần góp gây hiểu nhầm |
| Khóa học nâng cao chuyên môn | 3/15 triệu, tạm dừng, không ước tính tháng đạt |
| Khám sức khỏe cho gia đình | Hoàn thành ở 5 triệu, sau đó ghi rút 3 triệu; tách mốc hoàn thành và số dư còn 2 triệu |
| Điện thoại mới — đã khép lại | Rút 4 triệu, chuyển 5 triệu sang mua xe, lưu trữ ở số dư 0 |
| Không gian sống mới | Chưa góp, không đặt hạn và chưa có mức góp hàng tháng |

Tài khoản có đủ nguồn tạo 13 mục tiêu. Nếu thiếu nguồn, generator chỉ bỏ các case liên kết tương ứng, không tạo tiền hoặc nguồn giả ở module khác. Chọn **Trạng thái → Tất cả** để xem hoàn thành và lưu trữ. Mở **Mua xe đi làm → Giao dịch** để thử hai trang và bộ lọc; tab **Lịch sử** chứa giao dịch sửa/hủy.

## Tạo và áp dụng

Dùng Node 22 và kết nối runtime `expense_api` trong `.env.local`:

```bash
npm run data:goals:review -- --owner <USER_UID>
npm run data:goals:review -- --file <đường-dẫn-package>/sample-data.json --apply
```

Lệnh đầu chỉ đọc cloud, sao lưu owner và tạo package private trong `imports/goals-review-<ngày>-<dataset>/`. Lệnh sau sao lưu mới rồi ghi toàn bộ batch trong một transaction qua domain/repository của ứng dụng, `authenticated` RLS và thứ tự khóa dùng chung. Không đổi nguồn Tiết kiệm/Đầu tư/Quỹ, không thêm dữ liệu vào landing công khai. Dữ liệu, backup và báo cáo riêng của tài khoản được Git ignore và tạo quyền `0600`.

Package chụp nguồn và ngày Việt Nam. Nếu nguồn/ngày đổi trước lần áp đầu, lệnh từ chối và cần tạo lại package. Nếu Goal đã có sổ khác, không ghi đè. Chạy lại cùng package đã cài giữ các chỉnh sửa review; marker nằm trong lịch sử tạo mục tiêu. Đối soát toàn bộ book trong transaction và đọc lại sau commit. Backup vận hành chứa owner và các bảng hiện diện, **không phải file restore của Cài đặt**; khi reset cần bản export V3 hợp lệ mới nhất.

## Reset sau khi chốt UI/UX

Theo yêu cầu, script reset được tạo sau khi người dùng xác nhận xong UI/UX. Đợt nạp này không tạo/xác nhận yêu cầu xóa và không chạy reset. Khi đến bước đó, dùng luồng backup/prepareReset/reset hiện hành để chụp backup V3 mới, kiểm UID, fingerprint, generation và điều kiện xác nhận; giữ Auth/hồ sơ và owner khác. Không dùng script reset cũ trong các package trước Goals vì có thể bỏ sót bảng hoặc không theo hợp đồng reset hiện tại.

## Phạm vi tài liệu

Đã rà catalog, landing copy và preview: không đổi khả năng, trạng thái module hoặc UI ứng dụng, nên giữ nội dung hiện hành và dữ liệu public cố định. README, tài liệu bộ mẫu, đặc tả Mục tiêu và nhật ký validation ghi bổ sung workflow bảo trì và bằng chứng mới. Kiểm thử trình duyệt dùng PostgreSQL/Auth double local; cloud import/read-back là bằng chứng riêng, không xác nhận đăng nhập Supabase trên trình duyệt hoặc thiết bị thật.
