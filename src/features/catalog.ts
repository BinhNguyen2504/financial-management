export type ModuleStatus = "implemented" | "partial" | "planned";

export const moduleStatusLabels: Record<ModuleStatus, string> = {
  implemented: "Có trong bản hiện tại",
  partial: "Đã có một phần",
  planned: "Đang phát triển",
};

export const modules = [
  {
    slug: "overview",
    status: "implemented",
    title: "Tổng quan",
    icon: "overview",
    label: "Bức tranh tài chính",
    description:
      "Xem tiền đã thu, đã chi và các khoản tích lũy trong một trang.",
    scope: [
      "Chọn các thẻ thông tin bạn muốn theo dõi",
      "Biết khoản nào chưa nhập hoặc cần kiểm tra lại",
      "Mở từng sổ để cập nhật và xem chi tiết",
    ],
    questions: [],
  },
  {
    slug: "income",
    status: "implemented",
    title: "Thu nhập",
    icon: "income",
    label: "Thực nhận theo tháng",
    description:
      "Theo dõi số tiền thực nhận từ lương và các khoản thu thêm theo tháng.",
    scope: [
      "Ghi số thực nhận từ nguồn thu đều đặn",
      "Thêm khoản thu một lần",
      "Xem báo cáo và xuất bảng dữ liệu",
    ],
    questions: [],
  },
  {
    slug: "transactions",
    status: "planned",
    title: "Thu & chi",
    icon: "transactions",
    label: "Ghi nhận một lần",
    description:
      "Một nơi để ghi thu nhập, chi tiêu và chuyển tiền giữa các tài khoản.",
    scope: [
      "Thu nhập theo nguồn và thời điểm thực nhận",
      "Chi tiêu theo danh mục, tài khoản và mục đích",
      "Chuyển tiền liên kết hai tài khoản trong một giao dịch",
      "Mẫu nhập nhanh, giao dịch định kỳ và nhập bảng dữ liệu có xem trước",
    ],
    questions: [
      "Bạn muốn ghi từng giao dịch hay tổng hợp theo ngày/tháng?",
      "Nguồn thu và danh mục chi nào cần theo dõi?",
    ],
  },
  {
    slug: "budgets",
    status: "implemented",
    title: "Chi tiêu",
    icon: "budgets",
    label: "Hũ chi tiêu theo tháng",
    description:
      "Chia tiền theo mục đích, theo dõi khoản đã chi và số còn lại trong từng hũ.",
    scope: [
      "Đặt số tiền dự kiến dành cho từng hũ",
      "Theo dõi hũ chi tháng và hũ tích lũy",
      "Kiểm tra hũ vượt mức và tiền cần bổ sung",
    ],
    questions: [
      "Tiền chưa chi có được cộng dồn sang tháng tiếp theo?",
      "Thay đổi ngân sách giữa tháng áp dụng từ thời điểm nào?",
    ],
  },
  {
    slug: "accounts",
    status: "planned",
    title: "Tài khoản",
    icon: "accounts",
    label: "Tiền đang nằm ở đâu",
    description: "Quản lý tiền mặt, ví điện tử, ngân hàng và tiền chờ đầu tư.",
    scope: [
      "Số dư đầu kỳ và số dư tính từ giao dịch",
      "Chuyển khoản, đối soát và điều chỉnh có lịch sử",
      "Theo dõi dư nợ riêng với tài sản nếu cần",
    ],
    questions: [
      "HSBC trong hệ thống hiện tại là tài khoản thanh toán hay thẻ tín dụng?",
      "Bạn cần theo dõi dư nợ và lịch trả nợ đến mức nào?",
    ],
  },
  {
    slug: "savings",
    status: "implemented",
    title: "Tiết kiệm",
    icon: "savings",
    label: "Tích lũy có lịch sử",
    description:
      "Theo dõi tiền tiết kiệm, sổ tiền gửi và vàng, cùng giá trị và lịch sử của từng khoản.",
    scope: [
      "Ghi góp thêm, rút, nhận lãi và tái tục",
      "Ghi tổng giá vốn và giá vàng theo từng đơn vị để đọc lãi/lỗ",
      "Theo dõi sổ đến hạn và xem báo cáo",
      "Đối chiếu lịch sử thay đổi theo dòng thời gian",
    ],
    questions: [],
  },
  {
    slug: "investments",
    status: "implemented",
    title: "Đầu tư",
    icon: "investments",
    label: "Vốn và giá trị hiện tại",
    description:
      "Biết tiền đã đầu tư, tài sản đang giữ và tiền chờ trong từng danh mục.",
    scope: [
      "Ghi mua, bán, nạp và rút tiền",
      "Cập nhật giá trị tài sản đang giữ",
      "Xem lãi/lỗ phần đang giữ và lịch sử giao dịch",
    ],
    questions: [],
  },
  {
    slug: "funds",
    status: "implemented",
    title: "Quỹ an toàn",
    icon: "funds",
    label: "Nền tảng an toàn tài chính",
    description:
      "Chuẩn bị tiền cho biến cố lớn, chi phí bất ngờ và khoản chi đã dự kiến.",
    scope: [
      "Đặt mục tiêu quỹ theo chi phí sinh hoạt",
      "Ghi tiền đã dành riêng và nơi giữ tiền",
      "Biết còn thiếu bao nhiêu và quỹ đủ trang trải mấy tháng",
    ],
    questions: [],
  },
  {
    slug: "goals",
    status: "implemented",
    title: "Mục tiêu",
    icon: "goals",
    label: "Từ mục tiêu đến kế hoạch",
    description:
      "Theo dõi số tiền đã chuẩn bị và phần còn thiếu cho mục tiêu của bạn.",
    scope: [
      "Đặt số tiền cần đạt, hạn và sắp xếp ưu tiên có xem trước",
      "Liên kết khoản đã có hoặc ghi sổ góp riêng",
      "Mỗi danh mục Đầu tư gồm tài sản và toàn bộ tiền chờ",
      "Theo dõi tiến độ, hoàn thành hoặc tạm dừng",
    ],
    questions: [],
  },
  {
    slug: "reports",
    status: "implemented",
    title: "Báo cáo",
    icon: "reports",
    label: "Hiểu biến động tài chính",
    description:
      "Nhìn lại thu chi và biến động từng sổ theo tháng, quý hoặc năm.",
    scope: [
      "So sánh với kỳ trước",
      "Bảng số liệu tách rõ từng nội dung",
      "Mở chi tiết để hiểu số tổng",
      "Xuất bảng dữ liệu để tự đối chiếu",
    ],
    questions: [],
  },
  {
    slug: "settings",
    status: "partial",
    title: "Cài đặt",
    icon: "settings",
    label: "Không gian của bạn",
    description:
      "Chọn giao diện, ngôn ngữ và quản lý bản sao lưu dữ liệu của bạn.",
    scope: [
      "Chọn Tiếng Việt hoặc English và năm chủ đề",
      "Sao lưu và kiểm tra điều kiện khôi phục",
      "Cài lên màn hình chính trên thiết bị có hỗ trợ",
    ],
    questions: [],
  },
] as const;

export type Module = (typeof modules)[number];
export type ModuleIcon = Module["icon"];

const navigationOrder = [
  "overview",
  "budgets",
  "income",
  "savings",
  "investments",
  "funds",
  "goals",
  "reports",
  "settings",
  "transactions",
  "accounts",
];
export const navigationModules = [...modules].sort(
  (a, b) =>
    Number(a.status === "planned") - Number(b.status === "planned") ||
    navigationOrder.indexOf(a.slug) - navigationOrder.indexOf(b.slug),
);

// Shared product capability; does not change the implementation status of any module.
export const pageHelpSummary =
  "Mỗi mục có cách bắt đầu và giải thích số liệu. Nút Hướng dẫn mở các bước chi tiết, ngay cả khi đang nhập liệu.";

// Public home presentation is independent of module implementation status.
export const publicProductSummary =
  "Quản lý tài chính cá nhân với Financial Manager: theo dõi thu nhập, hũ chi tiêu, tiết kiệm, đầu tư, quỹ an toàn, mục tiêu và báo cáo theo kỳ. Xem thử giao diện không cần tài khoản.";

export const publicHomeSummary =
  "Sau khi đăng nhập, bạn có một không gian riêng với chủ đề yêu thích.";

export const languageSummary =
  "Chọn Tiếng Việt hoặc English trên thanh đầu trang hoặc trong Cài đặt; lựa chọn dùng chung cho trang chủ, đăng nhập và ứng dụng, được ghi nhớ trên trình duyệt. Tiền tệ vẫn là VND.";

export const navigationSummary =
  "Menu chia nhóm chức năng; phần đang phát triển có thể mở khi cần. Trên máy tính, nút thu gọn nằm cạnh logo; trên điện thoại, chạm ngoài để đóng.";

// Working-screen comfort is a shared capability, independent of deployment status.
export const workspaceComfortSummary =
  "Trong các sổ, ứng dụng nhớ kỳ xem, tab và bộ lọc theo tài khoản trong phiên trình duyệt. Khi đóng biểu mẫu có thay đổi, chọn Tiếp tục nhập hoặc Bỏ thay đổi.";
