# Đăng nhập bằng mã qua email — 27/10/2026

## Trải nghiệm

`/login`: nhập email → Gửi mã đăng nhập → nhập mã trong 8 ô vuông → tự động xác nhận khi đủ 8 số. Mã dùng một lần, thời hạn mục tiêu **30 phút**. Email nhận mã vẫn hiển thị ở bước xác nhận. Ô mã nhận bàn phím số, dán và `autocomplete=one-time-code`, giữ số 0 ở đầu; tự xác nhận khi nhập ô cuối hoặc dán/tự điền đủ 8 số. Nút Đăng nhập và Enter vẫn dùng được khi cần thử lại. Sau khi gửi thành công, focus vào ô đầu; nhập một chữ số chuyển sang ô tiếp theo. Backspace/Delete xóa đúng ô, mũi tên/Home/End chuyển ô; số phía sau không tự dồn sang trái. Dán đủ mã từ bất kỳ ô nào thay toàn bộ mã, giữ số 0 đầu; chấp nhận khoảng trắng/dấu gạch phân cách. Mã quá dài hoặc chứa chữ bị từ chối, không tự cắt để xác nhận nhầm.

Gửi lại mã hoạt động tại bước xác nhận, xóa ô mã sau khi gửi thành công. Đổi email quay về bước đầu, giữ địa chỉ để chỉnh sửa. Chờ ít nhất 60 giây sau lần gửi thành công hoặc lỗi giới hạn gửi; việc đổi email rồi quay lại cùng địa chỉ không bỏ qua thời gian chờ trong biểu mẫu hiện tại. Đồng hồ chỉ hỗ trợ UX; Supabase mới thực thi rate limit và thời hạn, kể cả khi reload hoặc mở tab khác. Không lưu mã vào localStorage, cookie hoặc URL. Reload trở về bước nhập email.

Mã sai/hết hạn/đã dùng có lỗi ngay dưới ô và trong bảng lỗi; mất kết nối và giới hạn gửi có thông báo riêng. Giữ email/mã để thử lại khi lỗi; chỉ tự xác nhận theo thao tác nhập/dán/tự điền đủ mã; lỗi không gây vòng lặp tự gửi lại. Khóa thao tác trùng lúc request đang chạy, kể cả submit bằng Enter. Ngôn ngữ biểu mẫu theo lựa chọn Việt/Anh đã lưu; mặc định tiếng Việt. Khung giới thiệu chung vẫn tiếng Việt.

## Tích hợp

Giữ Supabase Auth và `@supabase/ssr`: `signInWithOtp({ email })` yêu cầu email, `verifyOtp({ email, token, type: "email" })` nhận phiên. Không gửi `emailRedirectTo` cho yêu cầu mới. Không đổi mặc định tạo tài khoản của SDK hoặc chính sách phía project. Không thêm API ứng dụng, database hoặc cơ chế tự sinh/lưu PIN.

Chỉ chuyển trang khi kết quả xác nhận có session/access token và user; dùng đích đến đã qua `safeReturnPath`, mặc định `/overview`. Giữ cookie refresh, page guard phía server, API owner/RLS và phiên đang có. `/` tiếp tục công khai. Giữ `/auth/callback` để xử lý link cũ, gồm thông báo link không hợp lệ; đó không phải luồng email mới.

## Cấu hình Supabase bắt buộc

Thay đổi source **không tự thay đổi email hoặc thời hạn trên cloud**. Thực hiện trên đúng project đang cấp Auth cho ứng dụng:

1. Lưu lại nội dung/subject của hai mẫu email hiện tại và giá trị OTP expiration để có thể hoàn tác cấu hình.
2. Trong Authentication → Email Templates, dùng nội dung [`email-otp.html`](../../supabase/templates/email-otp.html) cho **Magic Link / OTP** và **Confirm sign up**. Mẫu thứ hai phục vụ email mới khi chính sách đăng ký hiện tại cho phép tự tạo tài khoản. Subject đề xuất: `Mã đăng nhập / Sign-in code · Financial Manager`. Hai mẫu đều hiển thị `{{ .Token }}`, không chứa `{{ .ConfirmationURL }}` hoặc link xác thực. Không thay template Invite/Reset password/Change email và không thay chính sách đăng ký.
3. Trong Authentication → Sign In / Providers → Email, đặt **Email OTP expiration = 1800 giây** và giữ mã **8 chữ số** để khớp độ dài email thực tế người dùng đã xác nhận. Độ dài hiển thị/kiểm định phía app là 8, không ép project về 6. Giữ khoảng cách gửi tối thiểu 60 giây; không nới rate limit để vượt lỗi quota. SMTP hiện tại vẫn phải cho phép gửi tới người dùng dự kiến. Xem [passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates) và [rate limits](https://supabase.com/docs/guides/auth/rate-limits).
4. Giữ Site URL và redirect allowlist hiện tại cho callback cũ. Phát hành source và cấu hình trong cùng đợt; tránh để giao diện yêu cầu mã trong khi email cloud chỉ có link.
5. Trên staging, thử email thật của tài khoản hiện có; thử tài khoản mới nếu project hiện cho phép đăng ký. Email phải có mã, không có nút/link xác thực; mã đăng nhập được, dùng lại bị từ chối, mã sai/hết hạn bị từ chối, gửi lại tuân theo giới hạn. Kiểm tra SSR sau reload, logout và đích đến được bảo vệ; thử trên hai thiết bị. Không đưa OTP thật vào log/tài liệu.

Thời hạn 30 phút chỉ được xác nhận trên cloud sau khi đọc lại cấu hình và kiểm chứng hành vi Auth thật. Nếu cần rollback, hoàn tác bản source và khôi phục hai template/thời hạn đã lưu trong cùng đợt; không thay dữ liệu tài chính hoặc tài khoản.

## Tài liệu và bằng chứng

Catalog, FAQ của hai landing, README và tài liệu kiến trúc/cloud mô tả mã qua email. Preview được rà soát: vẫn chỉ có dữ liệu tài chính minh họa cố định; không cần mô phỏng Auth, không đọc tài khoản/API. Trạng thái module không thay đổi vì đổi cách đăng nhập.

Auth double local mô phỏng hạn 1.800 giây, giới hạn gửi 60 giây và tiêu thụ mã một lần; control điều chỉnh trạng thái chỉ tồn tại trong test runner riêng, không có trong production. Kết quả kiểm thử và giới hạn môi trường ghi tại [validation](../07-validation.md). Chưa thay cấu hình Supabase, gửi email thật hoặc deploy trong thay đổi source này.
