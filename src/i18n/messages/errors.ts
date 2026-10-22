export const errors = {
  "Danh mục không tồn tại.": "Category does not exist.",
  "Danh mục chưa bắt đầu hoặc đã lưu trữ tại ngày giao dịch.":
    "Category has not started or is archived on the transaction date.",
  "Loại danh mục không phù hợp với giao dịch.":
    "Category type does not match the transaction.",
  "Hai phía giao dịch phải khác nhau.": "The two sides must be different.",
  "Chọn ví nhận.": "Choose receiving wallet.",
  "Phí/thuế vượt tiền bán.": "Fees/taxes exceed sale proceeds.",
  "Cần tiền bán hoặc giá vốn bán lớn hơn 0.":
    "Sale proceeds or cost basis sold must be greater than 0.",
  "Không đủ tiền tại ngày {0}.": "Insufficient cash on {0}.",
  "Giá vốn bán vượt vốn còn lại tại ngày {0}.":
    "Cost basis sold exceeds remaining capital on {0}.",
  "Không ghi dữ liệu trong tương lai.": "Future entries are not allowed.",
  "Mã danh mục đã tồn tại.": "Category ID already exists.",
  "Ngày hiệu lực trước ngày bắt đầu.":
    "Effective date is before the start date.",
  "Không đổi loại danh mục đã có phát sinh.":
    "Cannot change the type of a category with activity.",
  "Mã giao dịch đã tồn tại.": "Transaction ID already exists.",
  "Giao dịch không còn hiệu lực.": "Transaction is no longer effective.",
  "Bản sửa phải giữ mã và loại giao dịch gốc.":
    "A revision must preserve the original transaction ID and type.",
  "Mỗi danh mục chỉ có một số dư mở đầu.":
    "Each category can have only one opening balance.",
  "Số mở đầu phải ở ngày bắt đầu, trước mọi phát sinh của danh mục.":
    "Opening entries must be on the start date, before all category activity.",
  "Cần hết giá vốn và giá trị tài sản, hoặc hết tiền ví, trước khi xóa/lưu trữ.":
    "Clear all cost basis and asset value, or all wallet cash, before deleting/archiving.",
  "Khoảng thời gian không hợp lệ.": "Invalid period.",
  "Ngày bắt đầu báo cáo chưa diễn ra.":
    "The report start date is in the future.",
  Loại: "Type",
  Ngày: "Date",
  "Danh mục / ID": "Category / ID",
  "Giá trị đầu kỳ VND": "Opening value VND",
  "Giá trị cuối kỳ VND": "Closing value VND",
  "Vốn còn lại VND": "Remaining capital VND",
  "Ngày định giá": "Valuation date",
  "Kết quả kỳ VND": "Period result VND",
  "Nạp ngoài VND": "External deposits VND",
  "Rút ngoài VND": "External withdrawals VND",
  "Chuyển ròng VND": "Net transfers VND",
  "Mở đầu VND": "Opening capital VND",
  "Lãi/lỗ đã chốt kỳ VND": "Period realised profit/loss VND",
  "Lãi/lỗ chưa chốt VND": "Unrealised profit/loss VND",
  "Phí/thuế VND": "Fees/taxes VND",
  "Ghi chú": "Note",
  "Tài sản": "Assets",
  "Thiếu định giá": "Missing valuation",
  "Định giá từ kỳ trước": "Valuation from previous period",
  "Tổng tháng": "Monthly total",
  "Tạm tính": "Provisional",
  "Tổng kỳ": "Period total",
  "Lọc giao dịch chỉ áp dụng hoạt động; số dư giữ đầy đủ":
    "Transaction filters apply to activity only; balances use full history",
  "Số tiền phải lớn hơn 0.": "Amount must be greater than 0.",
  chỉ: "chi",
  "lượng/cây": "luong/tael",
  "File không phải bản sao lưu toàn tài khoản phiên bản 1 hoặc 2 hợp lệ. Hãy chọn file JSON được xuất từ Cài đặt.":
    "This is not a valid version 1 or 2 whole-account backup. Choose a JSON file exported from Settings.",
  "Chi tiêu": "Expenses",
  "Thu nhập": "Income",
  "Tiết kiệm": "Savings",
  "Đầu tư": "Investments",
  "Quỹ an toàn": "Safety funds",
  "Bản sao lưu không hợp lệ: {0}": "Invalid backup: {0}",
  "trùng khóa tại {0}.": "duplicate key at {0}.",
  "thiếu sổ gốc tại {0}.": "missing parent ledger at {0}.",
  "hũ tham chiếu không tồn tại.": "referenced jar does not exist.",
  "danh mục thu nhập không tồn tại.": "income category does not exist.",
  "nhãn trùng tên.": "duplicate label names.",
  "quy tắc đầu tiên không khớp ngày bắt đầu.":
    "first rule does not match the start date.",
  "quy tắc tháng sai thứ tự.": "monthly rules are out of order.",
  "phiên bản lịch sử {0} không khớp.": "history revision {0} does not match.",
  "kết quả lệnh vượt phiên bản sổ.": "command result exceeds ledger version.",
  "mã danh mục không khớp dữ liệu.": "category ID does not match data.",
  "đơn vị tài sản không hợp lệ.": "invalid asset unit.",
  "thiếu quy tắc danh mục.": "missing category rules.",
  "danh mục không khớp lịch sử tạo.":
    "category does not match creation history.",
  "quy tắc tiết kiệm sai thứ tự.": "savings rules are out of order.",
  "quy tắc đầu tư không hợp lệ.": "invalid investment rules.",
  "trùng số thứ tự giao dịch.": "duplicate transaction sequence.",
  "cột giao dịch không khớp nội dung.":
    "transaction columns do not match contents.",
  "mã revision không hợp lệ.": "invalid revision ID.",
  "thiếu giao dịch gốc.": "missing original transaction.",
  "tham chiếu giao dịch không hợp lệ.": "invalid transaction reference.",
  "ví tiền chờ không hợp lệ.": "invalid investment cash wallet.",
  "danh mục đối ứng không phải tiền mặt.": "counterparty category is not cash.",
  "giao dịch thiếu lịch sử tương ứng.":
    "transaction has no corresponding history.",
  "giao dịch gốc không khớp audit.":
    "original transaction does not match audit.",
  "revision không khớp audit.": "revision does not match audit.",
  "định giá nằm sai bảng.": "valuation is in the wrong table.",
  "sổ tiết kiệm không tồn tại.": "term deposit does not exist.",
  "trùng mã giao dịch giữa các bảng.":
    "duplicate transaction IDs across tables.",
  "lô vàng không tồn tại.": "gold lot does not exist.",
  "phân bổ lô vàng không khớp.": "gold lot allocations do not match.",
  "giá vàng không khớp danh mục.": "gold price does not match category.",
  "kỳ chốt không hợp lệ.": "invalid closed period.",
  "số thứ tự tiết kiệm không hợp lệ.": "invalid savings sequence.",
  "giá không khớp audit.": "price does not match audit.",
  "kỳ chốt không khớp audit.": "closed period does not match audit.",
  "snapshot năm tham chiếu hũ hoặc tháng không hợp lệ.":
    "yearly snapshot references an invalid jar or month.",
  "mã nơi giữ không khớp.": "holding location ID does not match.",
  "cấu hình quỹ không khớp.": "fund configuration does not match.",
  "giao dịch quỹ không khớp.": "fund transaction does not match.",
  "Lịch sử, cấu hình hoặc số dư quỹ không hợp lệ.":
    "Invalid fund history, configuration or balances.",
  "Bản sao lưu có sổ dữ liệu hoặc số dư không hợp lệ.":
    "The backup contains invalid ledgers or balances.",
  "Số tiền ngoài giới hạn 24 chữ số.": "Amount exceeds the 24-digit limit.",
  "Hũ sinh hoạt đã ngừng hoạt động hoặc không còn phù hợp. Hãy chọn lại.":
    "Living-cost jar has stopped or is no longer suitable. Choose again.",
  "Chọn ít nhất một hũ chi trong tháng.":
    "Choose at least one monthly spending jar.",
  "Mức sinh hoạt phải lớn hơn 0.": "Living costs must be greater than 0.",
  "Quỹ hoặc nơi giữ tiền không tồn tại.":
    "Fund or holding location does not exist.",
  "Số dư ban đầu phải là giao dịch đầu tiên của quỹ tại nơi giữ này.":
    "Opening balance must be the first transaction for this fund at this location.",
  "Không đủ tiền tại thời điểm giao dịch. Kiểm tra cả các giao dịch sau đó.":
    "Insufficient money at the transaction time. Check later transactions too.",
  "Nơi nhận phải khác nơi nguồn hoặc thuộc quỹ khác.":
    "Destination must be a different location or fund.",
  "Quỹ hoặc nơi nhận không tồn tại.":
    "Receiving fund or location does not exist.",
  "Thiết lập mức sinh hoạt và mục tiêu trước.":
    "Set up living costs and targets first.",
  "Mã cấu hình đã tồn tại.": "Configuration ID already exists.",
  "Chi tiêu hoặc tháng nguồn đã đổi. Tải dữ liệu mới và xem trước lại; nội dung nhập được giữ.":
    "Expenses or source month changed. Load new data and preview again; your draft is preserved.",
  "Chọn cập nhật mức sinh hoạt để thay đổi hũ nguồn.":
    "Choose Update living costs to change source jars.",
  "Nơi giữ mới phải đang hoạt động.": "A new holding location must be active.",
  "Tên nơi giữ đã tồn tại.": "Holding location name already exists.",
  "Chỉ ngừng nơi giữ khi số dư của mọi quỹ bằng 0.":
    "Stop a location only when all fund balances there are zero.",
  "Giao dịch đã tồn tại.": "Transaction already exists.",
  "Giao dịch không tồn tại hoặc đã hủy.":
    "Transaction does not exist or is voided.",
  "Không được thay mã giao dịch.": "Transaction ID cannot change.",
  "Không ghi giao dịch trong tương lai.":
    "Future transactions are not allowed.",
  "Nơi giữ tiền không tồn tại hoặc đã ngừng sử dụng.":
    "Holding location does not exist or is no longer in use.",
  "Thay đổi làm nơi giữ đã ngừng sử dụng có số dư. Khôi phục nơi giữ trước.":
    "This change gives an inactive location a balance. Restore the location first.",
  "Hệ số phải lớn hơn 0.": "Multiplier must be greater than 0.",
  "Mỗi quỹ xuất hiện đúng một lần.": "Each fund must appear exactly once.",
  "Nhập lý do rút tiền.": "Enter a withdrawal reason.",
  "Nhập lý do chuyển tiền.": "Enter a transfer reason.",
  "Nhập lý do sửa hoặc hủy.": "Enter a reason for editing or voiding.",
  "Vui lòng nhập họ và tên.": "Enter your full name.",
  "Họ và tên tối đa 100 ký tự.": "Full name must not exceed 100 characters.",
  "Ngày sinh phải hợp lệ, từ năm 1900 đến hôm nay.":
    "Date of birth must be valid, from 1900 to today.",
  "Không tìm thấy danh mục.": "Category not found.",
  "Tháng phải từ tháng bắt đầu danh mục.":
    "Month must be on or after the category start month.",
  "Danh mục đã tồn tại.": "Category already exists.",
  "Danh mục đã ngừng ở tháng này. Chọn tháng trước khi ngừng.":
    "Category is stopped in this month. Choose an earlier month.",
  "Danh mục đã có số thu. Hãy chọn Ngừng từ tháng để giữ lịch sử.":
    "Category has recorded receipts. Use Stop from month to preserve history.",
  "Chỉ ghi thực nhận ở tháng hiện tại hoặc quá khứ.":
    "Record receipts only in the current or a past month.",
  "Danh mục đã ngừng ở tháng này.": "Category is stopped in this month.",
  "Chưa có số thu để xóa.": "No receipt to delete.",
  "Khoản thu đã bị xóa.": "Income entry has been deleted.",
  "Không tìm thấy khoản thu.": "Income entry not found.",
  "Khoảng tháng không hợp lệ.": "Invalid month range.",
  Tên: "Name",
  Tháng: "Month",
  "Số tiền VND": "Amount VND",
  "Trạng thái": "Status",
  "Mô tả / ghi chú": "Description / note",
  "Tổng đã ghi nhận": "Recorded total",
  "Chưa có dữ liệu": "No data yet",
  "{0} danh mục chưa nhập": "{0} categories not entered",
  "Cố định": "Regular",
  "Phát sinh": "One-off",
  "Chưa nhập": "Not entered",
  "Đã ghi nhận": "Recorded",
  "Tháng không hợp lệ.": "Invalid month.",
  "Nhập số tiền VND nguyên không âm, tối đa 24 chữ số.":
    "Enter a non-negative whole VND amount, up to 24 digits.",
  "Cần nhập tên.": "Name is required.",
  "ví momo": "momo wallet",
  "Ăn uống": "Food",
  "Nhà ở": "Housing",
  "Di chuyển": "Transport",
  "Tích lũy": "Accumulation",
  "Cà phê": "Coffee",
  "Mua sắm": "Shopping",
  "Hóa đơn": "Bills",
  "Học tập": "Education",
  "Sức khỏe": "Health",
  "Du lịch": "Travel",
  "Quà tặng": "Gifts",
  "Thú cưng": "Pets",
  "Sở thích": "Hobbies",
  "Hũ chi tiêu": "Spending jar",
  "Ô tô": "Car",
  "Xe buýt": "Bus",
  "Xe máy": "Motorbike",
  "Xăng xe": "Fuel",
  "Hóa đơn và phí": "Bills and fees",
  "Điện thoại": "Phone",
  "Máy tính": "Computer",
  "Trò chơi": "Games",
  "Âm nhạc": "Music",
  "Phim ảnh": "Films",
  "Thể thao": "Sport",
  "Khám bệnh": "Medical visit",
  Thuốc: "Medicine",
  "Quần áo": "Clothes",
  "Em bé": "Baby",
  "Đồ chơi": "Toys",
  "Đám cưới": "Wedding",
  "Nghỉ dưỡng": "Holiday",
  "Trái cây": "Fruit",
  "Rau củ": "Vegetables",
  "Bánh ngọt": "Cake",
  "Trường học": "School",
  "Sửa chữa": "Repairs",
  "Bảo hiểm": "Insurance",
  "Ngân hàng": "Bank",
  "Thẻ tín dụng": "Credit card",
  "Giao hàng": "Delivery",
  "Công việc": "Work",
  "{0}: số tiền ngoài giới hạn.": "{0}: amount is out of range.",
  "{0}, {1}: số dư lớn hơn tiền có trong hũ.":
    "{0}, {1}: balance exceeds money available in the jar.",
  "{0}, {1}: không đủ tiền để sử dụng. Kiểm tra cả các tháng bị ảnh hưởng.":
    "{0}, {1}: insufficient money for usage. Check all affected months.",
  "Tháng nằm ngoài thời gian quản lý.": "Month is outside the tracking period.",
  "Năm đã chốt, chỉ có thể xem và xuất backup.":
    "Year is closed; only viewing and backup export are available.",
  "Bạn đã thiết lập thời gian quản lý.":
    "You have already set the tracking period.",
  "Tháng bắt đầu không được ở tương lai.":
    "Start month cannot be in the future.",
  "Hãy chọn tháng bắt đầu trước.": "Choose a start month first.",
  "Không tìm thấy hũ chi tiêu.": "Spending jar not found.",
  "Chọn một phương thức có sẵn trong Phân loại.":
    "Choose an existing holding method from Categories.",
  "Chọn một nhóm mục đích có sẵn hoặc để trống.":
    "Choose an existing purpose group or leave blank.",
  "Hũ đã tồn tại.": "Jar already exists.",
  "Hũ chưa bắt đầu trong tháng này.": "Jar has not started in this month.",
  "Số dư tích lũy được tính từ các lần sử dụng.":
    "Accumulation balances are calculated from usage entries.",
  "Tháng tương lai chỉ điều chỉnh mức kế hoạch.":
    "Future months allow planned-amount changes only.",
  "Chỉ hũ tích lũy ghi từng lần sử dụng.":
    "Only accumulation jars record individual usage.",
  "Ngày sử dụng phải từ lúc bắt đầu hũ đến hôm nay.":
    "Usage date must be between the jar's start date and today.",
  "Không thể chuyển lần sử dụng sang hũ khác.":
    "Cannot move a usage entry to another jar.",
  "Không tìm thấy lần sử dụng.": "Usage entry not found.",
  "Tên đã tồn tại.": "Name already exists.",
  "Không thể đổi loại phân loại.": "Category type cannot change.",
  "Chỉ chốt năm đã kết thúc.": "Only completed years can be closed.",
  "Năm không tồn tại.": "Year does not exist.",
  "Năm đã được chốt.": "Year is already closed.",
  "Hãy chốt các năm trước theo thứ tự.": "Close previous years in order first.",
  "Báo cáo tương tác chỉ dành cho năm hiện tại. Xem năm cũ trong Lưu trữ.":
    "Interactive reports are available for the current year only. View older years in Archive.",
  "Chưa phân nhóm": "Ungrouped",
  "Nhập số tiền VND nguyên, không âm, tối đa 24 chữ số.":
    "Enter a non-negative whole VND amount, up to 24 digits.",
  "Ngày không hợp lệ.": "Invalid date.",
  "Tháng này hoặc tháng sau đã chốt. Mở lại tháng bị ảnh hưởng trước khi sửa.":
    "This or a later month is closed. Reopen affected months before editing.",
  "Hai phía giao dịch phải là hai danh mục khác nhau.":
    "The two sides must use different categories.",
  "Sổ tiền gửi không tồn tại hoặc chưa mở.":
    "Term deposit does not exist or is not open yet.",
  "Sổ không thuộc danh mục hoặc đã tất toán.":
    "Deposit does not belong to this category or is already settled.",
  "Thiếu ngày đáo hạn.": "Maturity date is required.",
  "Ngày đáo hạn phải từ ngày gửi trở đi.":
    "Maturity must be on or after the deposit date.",
  "Mã sổ đã tồn tại.": "Deposit ID already exists.",
  "Số gốc rút vượt gốc còn lại.":
    "Principal withdrawn exceeds the remaining principal.",
  "Tiền nhận ròng không thể âm.": "Net receipts cannot be negative.",
  "Lãi nhập gốc không chọn ví nhận.":
    "Capitalised interest cannot select a receiving wallet.",
  "Lãi tái tục và phí vượt lãi thực nhận.":
    "Reinvested interest and fees exceed interest received.",
  "Mỗi đợt mua chỉ chọn một lần.":
    "Each purchase lot can be selected only once.",
  "Đợt mua chưa tồn tại.": "Purchase lot does not exist yet.",
  "Lượng bán vượt lượng còn lại hoặc sai danh mục.":
    "Quantity sold exceeds holdings or belongs to a different category.",
  "Phí vượt tiền bán.": "Fees exceed sale proceeds.",
  "Không ghi giao dịch hoặc giá trong tương lai.":
    "Future transactions or prices are not allowed.",
  "Cần chọn đơn vị vàng.": "Choose a gold unit.",
  "Chỉ vàng có đơn vị số lượng.": "Only gold has a quantity unit.",
  "Tháng hiệu lực trước tháng bắt đầu.":
    "Effective month is before the start month.",
  "Cần rút, chuyển hoặc bán hết tài sản trước khi lưu trữ.":
    "Withdraw, transfer or sell all assets before archiving.",
  "Số mở đầu phải cùng ngày và trước mọi giao dịch của danh mục.":
    "Opening entries must share a date before all category transactions.",
  "Giao dịch thay thế phải giữ mã gốc.":
    "Replacement transaction must preserve the original ID.",
  "Chỉ cập nhật giá cho vàng.": "Prices can be updated only for gold.",
  "Mã giá đã tồn tại.": "Price ID already exists.",
  "Chỉ chốt tháng đã kết thúc.": "Only completed months can be closed.",
  "Chưa có danh mục.": "No categories yet.",
  "Cần chốt tháng {0} trước.": "Close month {0} first.",
  "Cần nhập giá cho tất cả vàng đang giữ trước khi chốt.":
    "Enter prices for all gold held before closing.",
  "Cần xác nhận sử dụng giá từ tháng trước.":
    "Confirm use of prices from a previous month.",
  "Tháng chưa được chốt.": "Month is not closed.",
  "Danh mục lưu trữ vẫn còn tài sản.": "Archived category still holds assets.",
  "Ngày / tháng": "Date / month",
  "Đầu kỳ VND": "Opening VND",
  "Cuối kỳ / giá trị VND": "Closing / value VND",
  "Số lượng": "Quantity",
  "Giá vốn VND": "Cost basis VND",
  "Giá VND/đơn vị": "Price VND/unit",
  "Ngày giá": "Price date",
  "Nạp ròng / kết quả VND": "Net deposits / result VND",
  "Vốn mở đầu VND": "Opening capital VND",
  "Lãi nhận VND": "Interest received VND",
  "Lãi/lỗ đã chốt VND": "Realised profit/loss VND",
  "Giá từ tháng trước": "Price from previous month",
  "Lọc loại giao dịch chỉ áp dụng hoạt động; số dư giữ đầy đủ":
    "Transaction-type filters apply to activity only; balances use full history",
  "Số lượng phải lớn hơn 0.": "Quantity must be greater than 0.",
  "Mã yêu cầu đã được dùng với nội dung khác.":
    "Request ID has already been used with different contents.",
  "Dữ liệu đã thay đổi trên phiên khác. Tải lại dữ liệu rồi thử lại; nội dung đang nhập vẫn được giữ.":
    "Data changed in another session. Reload and try again; your draft is preserved.",
  "Mã yêu cầu đã dùng với nội dung khác.":
    "Request ID already used with different contents.",
  "Dữ liệu đã đổi ở phiên khác. Tải lại phiên bản rồi xem trước; nội dung đang nhập được giữ.":
    "Data changed in another session. Load the new version and preview; your draft is preserved.",
  "Dữ liệu đã thay đổi trên phiên khác. Tải lại dữ liệu rồi xem trước lại; nội dung bạn nhập vẫn được giữ.":
    "Data changed in another session. Reload and preview again; your draft is preserved.",
  "Dữ liệu đã đổi ở phiên khác. Tải dữ liệu mới và xem trước lại; nội dung nhập được giữ.":
    "Data changed in another session. Load new data and preview again; your draft is preserved.",
  "Đăng nhập chưa được cấu hình.": "Sign-in is not configured.",
  "Chưa kết nối dịch vụ đăng nhập và lưu trữ. Xem hướng dẫn cấu hình cloud.":
    "Sign-in and storage are not connected. See cloud setup instructions.",
  "Dịch vụ đăng nhập đang tạm gián đoạn. Nội dung đang nhập được giữ lại; hãy thử lại sau.":
    "The sign-in service is temporarily unavailable. Your draft is preserved; try again later.",
  "Vui lòng đăng nhập để mở dữ liệu tài chính.":
    "Sign in to open financial data.",
  "Cần áp dụng migration 202610190002_label_visuals.sql để lưu logo hoặc biểu tượng phân loại. Dữ liệu chưa được lưu; nội dung đang nhập vẫn được giữ.":
    "Apply migration 202610190002_label_visuals.sql to save category logos or icons. Data has not been saved; your draft is preserved.",
  "Quỹ an toàn chưa được bật trên hệ thống. Cần áp dụng migration Fund theo hướng dẫn triển khai.":
    "Safety funds is not enabled on this system. Apply the Fund migration using the deployment instructions.",
  "Cấu hình giới hạn backup không hợp lệ.":
    "Invalid backup limit configuration.",
  "Bản sao lưu vượt giới hạn dung lượng của môi trường hiện tại. Cần tăng giới hạn trước khi xuất hoặc nhập.":
    "Backup exceeds this environment's size limit. Increase the limit before exporting or importing.",
  "Một phần dữ liệu chưa sẵn sàng. Chưa thể tạo bản sao lưu đầy đủ; hãy kiểm tra lại thiết lập hệ thống.":
    "Some data is unavailable. A complete backup cannot be created; check system setup.",
  "Tính năng khôi phục chưa được bật trên hệ thống này. Bạn vẫn có thể tải bản sao lưu.":
    "Restore is not enabled on this system yet. You can still download a backup.",
  "Mã yêu cầu đã được dùng với file khác.":
    "Request ID has already been used with another file.",
  "Chỉ có thể nhập vào tài khoản chưa có dữ liệu tài chính.":
    "Import is allowed only into an account without financial data.",
  "Đối soát sau nhập không khớp. Toàn bộ lần nhập đã được hủy.":
    "Post-import reconciliation failed. The entire import was rolled back.",
  "Không thể truy cập dữ liệu. Kiểm tra kết nối rồi thử lại; nội dung đang nhập được giữ.":
    "Could not access data. Check your connection and try again; your draft is preserved.",
  "Đường dẫn không tồn tại.": "Path does not exist.",
  "Nguồn yêu cầu không hợp lệ.": "Invalid request origin.",
  "Yêu cầu phải là JSON.": "Request must be JSON.",
  "Yêu cầu quá lớn.": "Request is too large.",
  "JSON không hợp lệ.": "Invalid JSON.",
  "File JSON hoặc yêu cầu không hợp lệ.": "Invalid JSON file or request.",
  "Chưa truy cập được dữ liệu. Kiểm tra kết nối và thử lại.":
    "Could not access data yet. Check your connection and try again.",
  "Chỉ hỗ trợ file JSON.": "Only JSON files are supported.",
  "File vượt giới hạn dung lượng.": "File exceeds the size limit.",
  "Chưa có file để nhập.": "No file selected for import.",
  "Yêu cầu không đúng nguồn ứng dụng.": "Request is not from the app's origin.",
  "Phiên đăng nhập đã thay đổi. Hãy tải lại trang.":
    "Your sign-in session has changed. Reload the page.",
  "Không thể truy cập dữ liệu. Kiểm tra kết nối và thử lại; nội dung đang nhập vẫn được giữ.":
    "Could not access data. Check your connection and try again; your draft is preserved.",
  "Số tiền": "Amount",
  "Số dư đầu kỳ": "Opening balance",
  "Tiền thêm theo tháng": "Monthly funding",
  "Tiền bổ sung": "Extra funding",
  "Số dư cuối tháng": "Closing balance",
  "Mức riêng tháng": "Monthly override",
  "Mô tả": "Description",
  "Phương thức": "Holding method",
  "Nhóm mục đích": "Purpose group",
  "Tháng bắt đầu": "Start month",
  "Ngày sử dụng": "Usage date",
  "Không thể truy cập dữ liệu. Hãy kiểm tra kết nối và thử lại; nội dung đang nhập vẫn được giữ.":
    "Could not access data. Check your connection and try again; your draft is preserved.",
  "Không tìm thấy năm.": "Year not found.",
} as const;
