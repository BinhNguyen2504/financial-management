export const modules = [
  {
    slug: "overview", title: "Tổng quan", icon: "overview", label: "Bức tranh tài chính",
    description: "Tài sản, dòng tiền và các việc cần chú ý trong cùng một màn hình.",
    scope: ["Tài sản ròng và biến động theo thời gian", "Thu, chi và phần tiền dành cho mục tiêu", "Ngân sách, quỹ an toàn và công việc đến hạn"],
    questions: ["Chỉ số nào bạn muốn nhìn thấy đầu tiên mỗi ngày?"],
  },
  {
    slug: "income", title: "Thu nhập", icon: "income", label: "Thực nhận theo tháng",
    description: "Theo dõi danh mục cố định, thu phát sinh và báo cáo tháng, quý, năm.",
    scope: ["Tổng thực nhận mỗi tháng theo danh mục", "Khoản thu phát sinh một lần", "Bảng, biểu đồ và xuất CSV"],
    questions: [],
  },
  {
    slug: "transactions", title: "Thu & chi", icon: "transactions", label: "Ghi nhận một lần",
    description: "Một nơi để ghi thu nhập, chi tiêu và chuyển tiền giữa các tài khoản.",
    scope: ["Thu nhập theo nguồn và thời điểm thực nhận", "Chi tiêu theo danh mục, tài khoản và mục đích", "Chuyển tiền liên kết hai tài khoản trong một giao dịch", "Mẫu nhập nhanh, giao dịch định kỳ và nhập CSV có xem trước"],
    questions: ["Bạn muốn ghi từng giao dịch hay tổng hợp theo ngày/tháng?", "Nguồn thu và danh mục chi nào cần theo dõi?"],
  },
  {
    slug: "budgets", title: "Chi tiêu", icon: "budgets", label: "Hũ chi tiêu theo tháng",
    description: "Quản lý hũ chi tháng và tích lũy, tự tính tiền cần thêm và báo cáo trong năm.",
    scope: ["Kế hoạch theo danh mục và tháng hiệu lực", "Thực chi, số còn lại và phần chuyển tiếp kỳ sau", "Phân biệt chi phí, trả nợ và tiền dành để tiết kiệm", "Tổng hợp nhu cầu tiền theo ví/ngân hàng"],
    questions: ["Tiền chưa chi có được cộng dồn sang tháng tiếp theo?", "Thay đổi ngân sách giữa tháng áp dụng từ thời điểm nào?"],
  },
  {
    slug: "accounts", title: "Tài khoản", icon: "accounts", label: "Tiền đang nằm ở đâu",
    description: "Quản lý tiền mặt, ví điện tử, ngân hàng và tiền chờ đầu tư.",
    scope: ["Số dư đầu kỳ và số dư tính từ giao dịch", "Chuyển khoản, đối soát và điều chỉnh có lịch sử", "Theo dõi dư nợ riêng với tài sản nếu cần"],
    questions: ["HSBC trong hệ thống hiện tại là tài khoản thanh toán hay thẻ tín dụng?", "Bạn cần theo dõi dư nợ và lịch trả nợ đến mức nào?"],
  },
  {
    slug: "savings", title: "Tiết kiệm", icon: "savings", label: "Tích lũy có lịch sử",
    description: "Theo dõi tiền gửi và khoản tích lũy theo thời gian, thay cho các cột nhập tay.",
    scope: ["Khoản gửi, gốc, kỳ hạn và ngày đáo hạn", "Lãi dự kiến tách khỏi lãi đã nhận", "Nạp thêm, rút bớt, tái tục và tổng hợp tháng/quý/năm", "Liên kết với tài khoản và phần tiền dành cho quỹ"],
    questions: ["Lãi tiền gửi được nhập thực nhận hay cần tính dự kiến?", "Vàng được hiển thị ở tiết kiệm, đầu tư hay cả hai dưới cùng một tài sản?"],
  },
  {
    slug: "investments", title: "Đầu tư", icon: "investments", label: "Vốn và giá trị hiện tại",
    description: "Danh mục tài sản cùng lịch sử mua bán, dòng tiền và định giá.",
    scope: ["Cổ phiếu, quỹ cổ phiếu, quỹ trái phiếu, crypto và vàng", "Một thao tác mua/bán cập nhật cả tài sản và tiền chờ", "Giá vốn, phí, thuế, lãi/lỗ đã chốt và chưa chốt", "Tỷ trọng thực tế so với mục tiêu; giá kèm thời điểm cập nhật"],
    questions: ["Giá vốn dùng bình quân hay theo lô?", "Cần theo dõi từng mã tài sản hay trước mắt chỉ từng nhóm?", "Giá thị trường sẽ nhập tay, nhập file hay lấy từ nguồn nào?"],
  },
  {
    slug: "funds", title: "Quỹ an toàn", icon: "funds", label: "Mỗi khoản tiền có mục đích",
    description: "Emergency, Sinking và Rainy Day được liên kết với nơi thực sự giữ tiền.",
    scope: ["Mục tiêu, tiền đã phân bổ và tỷ lệ hoàn thành từng quỹ", "Một quỹ có thể nằm ở nhiều tài khoản", "Nạp, sử dụng và bổ sung quỹ có lịch sử", "Mức bảo đảm dựa trên chi phí thiết yếu đã xác nhận"],
    questions: ["Một khoản tiền có thể dùng chung cho nhiều mục tiêu không?", "Mục tiêu quỹ cố định hay tự đổi khi chi phí thiết yếu thay đổi?"],
  },
  {
    slug: "goals", title: "Mục tiêu", icon: "goals", label: "Từ mục tiêu đến kế hoạch",
    description: "Theo dõi mục tiêu tiền, hạn hoàn thành và mức tích lũy cần thiết.",
    scope: ["Mục tiêu theo số tiền và thời hạn tùy chọn", "Tiến độ lấy từ tiền/tài sản đã liên kết", "Ước tính phần còn thiếu và kế hoạch góp định kỳ"],
    questions: ["Mục tiêu đầu tư đo theo vốn đã góp hay giá trị thị trường?", "Có cần mức ưu tiên giữa các mục tiêu?"],
  },
  {
    slug: "reports", title: "Báo cáo", icon: "reports", label: "Hiểu biến động tài chính",
    description: "Biểu đồ và bảng số liệu cùng sử dụng một nguồn dữ liệu đã đối soát.",
    scope: ["Thu chi theo kỳ và danh mục", "Tài sản ròng, tài sản thanh khoản và phân bổ tài sản", "Lịch sử định giá; phân biệt vốn góp và lợi nhuận", "Bộ lọc thời gian, xem giao dịch nguồn và xuất dữ liệu"],
    questions: ["Những báo cáo nào quan trọng nhất khi tổng kết tháng?"],
  },
  {
    slug: "settings", title: "Thiết lập", icon: "settings", label: "Không gian của bạn",
    description: "Đăng nhập, tùy chọn cá nhân, dữ liệu và đồng bộ nhiều thiết bị.",
    scope: ["Cloud riêng với tài khoản đăng nhập; mặc định tiền VND", "Múi giờ Asia/Ho_Chi_Minh và định dạng Việt Nam", "Nhập, xuất, sao lưu và khôi phục dữ liệu", "PWA trên điện thoại/máy tính; chuẩn bị API cho app iOS"],
    questions: ["Bạn ưu tiên đăng nhập bằng email hay tài khoản Google?"],
  },
] as const;

export type Module = (typeof modules)[number];
export type ModuleIcon = Module["icon"];
