# Thông tin cá nhân

- Mở menu avatar ở thanh đầu trang → **Thông tin cá nhân** (`/profile`). Menu hiển thị tên, email, liên kết hồ sơ và nút đăng xuất trên mọi trang.
- Hồ sơ cho phép lưu họ tên (tối đa 100 ký tự), ngày sinh và giới tính. Ngày sinh và giới tính tùy chọn; ngày sinh phải hợp lệ, từ năm 1900 đến hôm nay theo giờ Việt Nam.
- Email hiển thị email đăng nhập, chỉ đọc. Avatar dùng chữ cái đầu từ tên, không tải ảnh bên ngoài.
- Dữ liệu lưu qua Supabase Auth `updateUser({ data })`, với các trường `full_name`, `birth_date`, `gender` trong `user_metadata`. Không cần SQL migration; không dùng các trường này để quyết định quyền truy cập. Xem [Supabase updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser).
- Lỗi lưu giữ nguyên nội dung để thử lại. Lỗi tải có nút thử lại; chưa đăng nhập có liên kết quay lại đúng `/profile` sau đăng nhập.
- Đăng xuất chuyển toàn bộ trang về `/login` để bỏ nội dung tài chính đang hiển thị. SDK có thể xóa phiên local dù yêu cầu thu hồi phiên từ xa lỗi; trường hợp này vẫn phải rời trang tài chính. Nếu phiên local còn tồn tại, menu có thông báo lỗi và cho phép thử lại.
- Menu hỗ trợ bàn phím, Escape trả focus về avatar, bấm bên ngoài để đóng. Sự kiện Escape được nghe ở document vì Safari không tự focus nút khi chạm.

## Kiểm tra local

`npm test`, `npm run test:db`, `npm run test:e2e`, `npm run typecheck`, `npm run build`.

Để kiểm tra trực tiếp bằng Playwright MCP với Auth giả lập và PostgreSQL tách biệt:

```sh
TEST_BROWSER_MCP=1 npm run test:e2e
```

Runner in địa chỉ local của ứng dụng. Dùng email bất kỳ kết thúc bằng `@example.test` và OTP `123456`. Dừng process `scripts/test-browser.mjs` bằng SIGTERM để đóng app và cho runner dọn cluster local. Không dùng thông tin đăng nhập cloud.

Các bài kiểm tra tự động trong `tests/browser/profile.spec.ts` bao phủ lưu và tải lại, phiên đăng nhập khác, xác thực ngày sinh, lỗi lưu/thử lại, đăng xuất, menu dùng chung, căn hàng bộ chọn tháng và giới hạn năm. Các kiểm tra local không xác nhận Supabase cloud hoặc bản deploy.
