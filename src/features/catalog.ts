export type ModuleStatus = "implemented" | "partial" | "planned";

export const moduleStatusLabels: Record<ModuleStatus, string> = {
  implemented: "Có trong bản hiện tại",
  partial: "Đã có một phần",
  planned: "Đang lên kế hoạch",
};

export const modules = [
  {
    slug: "overview", status: "partial", title: "Tổng quan", icon: "overview", label: "Bức tranh tài chính",
    description: "Nhìn lại kế hoạch, thực chi và số còn trong hũ của tháng hiện tại.",
    scope: ["Tài sản ròng và biến động theo thời gian", "Thu, chi và phần tiền dành cho mục tiêu", "Ngân sách, quỹ an toàn và công việc đến hạn"],
    questions: ["Chỉ số nào bạn muốn nhìn thấy đầu tiên mỗi ngày?"],
  },
  {
    slug: "income", status: "implemented", title: "Thu nhập", icon: "income", label: "Thực nhận theo tháng",
    description: "Theo dõi danh mục cố định, thu phát sinh và báo cáo tháng, quý, năm.",
    scope: ["Tổng thực nhận mỗi tháng theo danh mục", "Khoản thu phát sinh một lần", "Bảng, biểu đồ và xuất CSV"],
    questions: [],
  },
  {
    slug: "transactions", status: "planned", title: "Thu & chi", icon: "transactions", label: "Ghi nhận một lần",
    description: "Một nơi để ghi thu nhập, chi tiêu và chuyển tiền giữa các tài khoản.",
    scope: ["Thu nhập theo nguồn và thời điểm thực nhận", "Chi tiêu theo danh mục, tài khoản và mục đích", "Chuyển tiền liên kết hai tài khoản trong một giao dịch", "Mẫu nhập nhanh, giao dịch định kỳ và nhập CSV có xem trước"],
    questions: ["Bạn muốn ghi từng giao dịch hay tổng hợp theo ngày/tháng?", "Nguồn thu và danh mục chi nào cần theo dõi?"],
  },
  {
    slug: "budgets", status: "implemented", title: "Chi tiêu", icon: "budgets", label: "Hũ chi tiêu theo tháng",
    description: "Quản lý hũ chi tháng và tích lũy, tự tính tiền cần thêm và báo cáo trong năm.",
    scope: ["Kế hoạch theo danh mục và tháng hiệu lực", "Thực chi, số còn lại và phần chuyển tiếp kỳ sau", "Phân biệt chi phí, trả nợ và tiền dành để tiết kiệm", "Tổng hợp nhu cầu tiền theo ví/ngân hàng"],
    questions: ["Tiền chưa chi có được cộng dồn sang tháng tiếp theo?", "Thay đổi ngân sách giữa tháng áp dụng từ thời điểm nào?"],
  },
  {
    slug: "accounts", status: "planned", title: "Tài khoản", icon: "accounts", label: "Tiền đang nằm ở đâu",
    description: "Quản lý tiền mặt, ví điện tử, ngân hàng và tiền chờ đầu tư.",
    scope: ["Số dư đầu kỳ và số dư tính từ giao dịch", "Chuyển khoản, đối soát và điều chỉnh có lịch sử", "Theo dõi dư nợ riêng với tài sản nếu cần"],
    questions: ["HSBC trong hệ thống hiện tại là tài khoản thanh toán hay thẻ tín dụng?", "Bạn cần theo dõi dư nợ và lịch trả nợ đến mức nào?"],
  },
  {
    slug: "savings", status: "implemented", title: "Tiết kiệm", icon: "savings", label: "Tích lũy có lịch sử",
    description: "Tiền, sổ tiết kiệm và vàng cùng lịch sử giao dịch, định giá và báo cáo nhiều năm.",
    scope: ["Danh mục, sổ tiền gửi và từng đợt mua vàng", "Rút, bán, nhận lãi và tái tục có lịch sử", "Tài sản, tỷ trọng, dòng tiền và lãi/lỗ", "Chốt tháng, mở lại có lý do và sao lưu"],
    questions: [],
  },
  {
    slug: "investments", status: "implemented", title: "Đầu tư", icon: "investments", label: "Vốn và giá trị hiện tại",
    description: "Theo dõi tổng danh mục, ví tiền chờ, mua bán, định giá và lãi/lỗ có lịch sử.",
    scope: ["Danh mục tổng tiền và nhiều ví tiền chờ, VND", "Mua/bán cập nhật tài sản và tiền chờ trong một lần lưu", "Giá vốn bán nhập tay; phí, thuế, lãi/lỗ đã chốt và chưa chốt", "Định giá có ngày; báo cáo xuyên năm, CSV và backup JSON"],
    questions: [],
  },
  {
    slug: "funds", status: "planned", title: "Quỹ an toàn", icon: "funds", label: "Mỗi khoản tiền có mục đích",
    description: "Emergency, Sinking và Rainy Day được liên kết với nơi thực sự giữ tiền.",
    scope: ["Mục tiêu, tiền đã phân bổ và tỷ lệ hoàn thành từng quỹ", "Một quỹ có thể nằm ở nhiều tài khoản", "Nạp, sử dụng và bổ sung quỹ có lịch sử", "Mức bảo đảm dựa trên chi phí thiết yếu đã xác nhận"],
    questions: ["Một khoản tiền có thể dùng chung cho nhiều mục tiêu không?", "Mục tiêu quỹ cố định hay tự đổi khi chi phí thiết yếu thay đổi?"],
  },
  {
    slug: "goals", status: "planned", title: "Mục tiêu", icon: "goals", label: "Từ mục tiêu đến kế hoạch",
    description: "Theo dõi mục tiêu tiền, hạn hoàn thành và mức tích lũy cần thiết.",
    scope: ["Mục tiêu theo số tiền và thời hạn tùy chọn", "Tiến độ lấy từ tiền/tài sản đã liên kết", "Ước tính phần còn thiếu và kế hoạch góp định kỳ"],
    questions: ["Mục tiêu đầu tư đo theo vốn đã góp hay giá trị thị trường?", "Có cần mức ưu tiên giữa các mục tiêu?"],
  },
  {
    slug: "reports", status: "planned", title: "Báo cáo", icon: "reports", label: "Hiểu biến động tài chính",
    description: "Biểu đồ và bảng số liệu cùng sử dụng một nguồn dữ liệu đã đối soát.",
    scope: ["Thu chi theo kỳ và danh mục", "Tài sản ròng, tài sản thanh khoản và phân bổ tài sản", "Lịch sử định giá; phân biệt vốn góp và lợi nhuận", "Bộ lọc thời gian, xem giao dịch nguồn và xuất dữ liệu"],
    questions: ["Những báo cáo nào quan trọng nhất khi tổng kết tháng?"],
  },
  {
    slug: "settings", status: "partial", title: "Cài đặt", icon: "settings", label: "Không gian của bạn",
    description: "Tải bản sao JSON của dữ liệu, khôi phục vào tài khoản trống khi hệ thống sẵn sàng và hướng dẫn cài PWA.",
    scope: ["Cloud riêng với tài khoản đăng nhập; mặc định tiền VND", "Múi giờ Asia/Ho_Chi_Minh và định dạng Việt Nam", "Backup toàn tài khoản và khôi phục vào tài khoản trống; hồ sơ tùy chọn", "PWA trên điện thoại/máy tính; chuẩn bị API cho app iOS"],
    questions: ["Bạn ưu tiên đăng nhập bằng email hay tài khoản Google?"],
  },
] as const;

export type Module = (typeof modules)[number];
export type ModuleIcon = Module["icon"];
