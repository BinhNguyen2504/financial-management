# Kết nối cloud cho Chi tiêu

Source đã có Auth/API/PostgreSQL; repo chưa có credentials hoặc deployment cloud. Local unit/DB/browser tests không thay thế nghiệm thu Supabase thật.

## Chuẩn bị Supabase và database

1. Dùng dự án Supabase riêng cho ứng dụng và một môi trường staging để nghiệm thu trước production. Lấy Project URL và publishable key trong Dashboard. Không đưa mật khẩu database hoặc service-role key vào biến NEXT_PUBLIC.
2. Chạy `supabase/migrations/202610150001_expenses.sql` một lần bằng connection migration/admin, hoặc qua Supabase SQL Editor. Migration không chứa mật khẩu. Nó tạo các bảng mới, RLS, role runtime và trigger khóa lịch sử; không đổi dữ liệu module khác.
3. Bật LOGIN cho role `expense_api`: `ALTER ROLE expense_api LOGIN;`. Dùng psql `\password expense_api` để đặt mật khẩu riêng; không cần đưa mật khẩu vào lịch sử shell hoặc source.
4. Lấy connection string direct hoặc **session pooler** từ Dashboard Connect, dùng username `expense_api` (với pooler: `expense_api.<project-ref>`) và mật khẩu vừa đặt. Phải giữ session_user là expense_api để RLS cho phép truy cập. Không dùng postgres/service_role hoặc transaction pooler cho bản đầu; session pooler tránh khác biệt identity giữa các cấu hình pooler chưa được kiểm chứng trên cloud.
5. Tạo `.env.local` theo `.env.example`: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, DATABASE_URL, DATABASE_SSL=require và APP_ORIGIN là origin thực tế. Restart local khi đổi biến; khi deploy cấu hình cùng biến trên host. PUBLIC vars phải có lúc build.

Backend dùng role riêng theo [Supabase Postgres Roles](https://supabase.com/docs/guides/database/postgres/roles), [Custom Roles](https://supabase.com/docs/guides/database/postgres/custom-roles) và [connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres). Connection runtime chỉ dùng phía server, không được đưa vào log hoặc trình duyệt. Mỗi transaction hạ quyền sang authenticated, đặt owner từ Auth đã kiểm chứng, sau đó chịu RLS. Direct PostgREST bị chặn vì session_user không phải expense_api.

## Đăng nhập email

- Bật Email trong Supabase Auth. Đặt Site URL và allowlist Redirect URL đúng origin ứng dụng với `/auth/callback`; thêm origin local nếu cần thử local. Theo [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).
- Giao diện hỗ trợ liên kết email mặc định qua PKCE callback; nếu dùng mã OTP, chỉnh email template để có `{{ .Token }}` theo [passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless). Không thay mã bằng dữ liệu trong ảnh Notion.
- Đối với app cá nhân, tạo/invite tài khoản cần dùng rồi tắt đăng ký công khai. Mỗi owner vẫn được cách ly bằng RLS. Cấu hình SMTP/rate limit của Supabase phù hợp môi trường trước khi đưa vào dùng thường xuyên.

## Nghiệm thu trên cloud thật

1. Đăng nhập bằng email thật, thử cả liên kết xác nhận và mã OTP nếu đã cấu hình template; kiểm tra callback, refresh session, đăng xuất và API 401 sau logout.
2. Tạo sổ từ tháng chọn; thêm hai loại hũ với dữ liệu thử. Kiểm tra ví dụ 300.000 dư → thêm 1.700.000 → bổ sung 400.000 → dư 100.000 → thực chi 2.300.000.
3. Mở trên hai thiết bị: xác nhận lưu phản ánh sau refetch, thử sửa đồng thời và kiểm tra thông báo xung đột, thử gửi lại command ID cùng payload.
4. Tạo owner thứ hai và xác nhận không đọc/sửa/liên kết dữ liệu owner thứ nhất. Kiểm tra SELECT/INSERT trực tiếp qua PostgREST không vượt qua RLS.
5. Trong staging, tạo dữ liệu năm trước, điều chỉnh tháng 12 và kiểm số đầu năm; chốt năm rồi kiểm tra chỉ xem, JSON export và từ chối sửa. Không backdate đồng hồ production để kiểm chuyển năm.
6. Dùng production build trên HTTPS; thử giao diện light/dark, phone/desktop, cài PWA và lỗi mạng. Thử mất phản hồi sau commit rồi retry: số record/audit chỉ tăng một lần.
7. Bật backup database của hạ tầng và kiểm thử restore sang môi trường khác. Export JSON theo năm là bản lưu ứng dụng, không thay bản sao vận hành toàn bộ DB.

Không cần service-role key. Chưa có thao tác tạo tài nguyên cloud, chạy migration trên tài khoản thật, gửi email thật hoặc deploy trong lần triển khai source này.

## Bổ sung Thu nhập

Sau migration Chi tiêu, áp dụng `supabase/migrations/202610150002_income.sql` bằng kết nối migration/admin. Dùng lại DATABASE_URL của role expense_api và các cấu hình Auth hiện có; không chạy lại migration Chi tiêu trên DB đã có bảng. `/income` và API v1 mới dùng cùng cơ chế RLS, cookie/Bearer, origin và TLS. Xem [đặc tả Thu nhập](features/income.md).

Nghiệm thu trên cloud: đăng nhập từ `/income`, tạo danh mục và nhập số thu; mở thiết bị thứ hai cùng tài khoản để đối chiếu. Kiểm tra đổi tên từ tháng, ngừng danh mục giữ số cũ, tổng báo cáo/CSV và tài khoản khác không đọc được. Kết quả DB/e2e local không thay thế bước này. Chưa thực hiện deploy hoặc migration cloud trong lần triển khai source.
