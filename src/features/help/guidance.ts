import type { HelpPageId } from "./types";

export const pageGuidance: Record<
  HelpPageId,
  { start: string; reading: string }
> = {
  overview: {
    start:
      "Chọn một mục bạn muốn theo dõi; ghi số liệu thực trong mục đó rồi quay lại đây.",
    reading:
      "Thu nhập và Chi tiêu theo tháng; Tiết kiệm, Đầu tư và Quỹ an toàn là giá trị hiện tại. Các sổ có thể theo dõi cùng một khoản tiền, nên không cộng thành tổng tài sản.",
  },
  income: {
    start:
      "Thêm nguồn thu đều đặn như lương, rồi nhập số thực nhận của tháng. Khoản chỉ nhận một lần được ghi ở Thu phát sinh.",
    reading:
      "Tổng thực nhận là tiền bạn đã ghi nhận. Chưa nhập khác với 0 đồng; sửa số thu tháng sẽ thay số cũ, không cộng thêm.",
  },
  budgets: {
    start:
      "Tạo hũ theo mục đích như sinh hoạt, đặt số tiền dự kiến dành mỗi tháng và chọn nơi giữ tiền.",
    reading:
      "Hũ chi tháng tính tiền đã chi từ tiền có và số dư cuối tháng. Hũ tích lũy tính theo các lần dùng tiền đã ghi. Tiền dành cho hũ không có nghĩa là đã chi.",
  },
  savings: {
    start:
      "Thêm một khoản tiết kiệm, rồi ghi số tiền đang có hoặc giao dịch đầu tiên. Chọn loại tiền, sổ tiết kiệm hoặc vàng phù hợp.",
    reading:
      "Tiền gốc là phần bạn đã góp; giá trị hiện tại có thể gồm lãi hoặc thay đổi giá vàng. Kiểm tra ngày cập nhật giá trước khi đọc lãi/lỗ.",
  },
  investments: {
    start:
      "Tạo danh mục, ghi tiền chờ rồi ghi mua tài sản. Nếu đã sở hữu tài sản, dùng thao tác nhập tài sản mở đầu.",
    reading:
      "Tổng giá trị gồm tài sản đang giữ và tiền chờ. Lãi/lỗ đang giữ chỉ thuộc phần chưa bán; bán tài sản đưa tiền về ví của danh mục.",
  },
  funds: {
    start:
      "Chọn chi phí sinh hoạt từ các hũ Chi tiêu, đặt quy mô quỹ rồi ghi tiền thực tế đã dành riêng.",
    reading:
      "Quỹ khẩn cấp dành cho biến cố lớn; Quỹ phát sinh dành cho chi phí nhỏ bất ngờ; Quỹ chi dự kiến dành cho khoản đã biết trước. Số tháng bảo vệ dựa trên mức sinh hoạt bạn xác nhận.",
  },
  goals: {
    start:
      "Tạo mục tiêu và số tiền cần đạt, chọn liên kết khoản đã có hoặc tự ghi từng khoản góp. Hạn hoàn thành là tùy chọn.",
    reading:
      "Liên kết chỉ theo dõi tiến độ, không giữ hoặc chuyển tiền. Sổ góp riêng ghi các khoản bạn tự nhập; hãy tránh ghi cùng một khoản tiền ở cả hai cách.",
  },
  reports: {
    start:
      "Chọn tháng, quý hoặc năm, rồi chọn nội dung muốn xem. Mở chi tiết để đối chiếu khoản tạo nên số tổng.",
    reading:
      "So sánh luôn đi kèm kỳ tương ứng. Số tạm tính hoặc thiếu giá chưa phản ánh đầy đủ; số cuối kỳ của các sổ được trình bày riêng để tránh cộng trùng.",
  },
  settings: {
    start:
      "Chọn ngôn ngữ và giao diện phù hợp. Tải bản sao lưu khi cần giữ một bản dữ liệu của bạn.",
    reading:
      "Khôi phục cần tài khoản trống. Đọc phạm vi bản sao lưu và điều kiện khôi phục trước khi thao tác; làm trống dữ liệu có bước xác nhận riêng.",
  },
  profile: {
    start:
      "Bạn có thể cập nhật tên hiển thị và thông tin hồ sơ; chỉ nhập những thông tin bạn muốn lưu.",
    reading:
      "Thông tin hồ sơ giúp cá nhân hóa trải nghiệm, không thay đổi số liệu tài chính.",
  },
  accounts: {
    start:
      "Chức năng này đang phát triển. Hiện bạn có thể theo dõi nơi giữ tiền trong từng sổ đang có.",
    reading:
      "Ứng dụng chưa tổng hợp số dư tài khoản ngân hàng hoặc tự lấy giao dịch ngân hàng.",
  },
  transactions: {
    start:
      "Chức năng này đang phát triển. Dùng Thu nhập và Chi tiêu để ghi nhận theo cách hiện có.",
    reading:
      "Thu nhập và Chi tiêu đang theo dõi theo các sổ riêng; chưa có danh sách giao dịch chung liên kết tài khoản.",
  },
};
