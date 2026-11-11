> Bản hiện tại: **1.3.0**. Quy tắc học phí và Telegram ở mục 1.2.3 thay thế lịch cũ bên dưới.

# htblxv01

Bản tổng hợp hệ thống tuyển sinh Hưng Thịnh, mã phát hành htblxv01 (phiên bản phần mềm 1.1.0).

## Các chức năng có trong bản này

- Khách hàng/học viên: số điện thoại và CCCD bắt buộc, khóa học, ngày khai giảng, tiến độ đào tạo, hồ sơ bàn giao.
- Trường mặc định cố định Sát Hạch Lái Xe Hưng Thịnh; học phí trường B1 6,5 triệu, B2 7 triệu, C1 8,5 triệu.
- Lịch thanh toán trường ngày1 và25, lịch sử nộp, ngày thực tế, hình thức chuyển khoản/tiền mặt.
- Học phí3đợt: đợt1 chọn2,5/7,5/8,5/9,5 triệu; đợt2 B1/B2 5triệu,C1 7triệu sau khai giảng25ngày; đợt3 phần còn lại sau xác nhận đủ kmDAT.
- Xác nhận đủ đợt2 tạo yêu cầu đăng kýDAT một lần. Chưa tự đăng ký trên cổng trường.
- Bảng chi phí vận hành: ngày, lý do chi, người chi, số tiền và tổng.
- KPI, lương, thưởng theo chính sách đã chốt; quản lý tài khoản Admin/Quản lý cấp Sale/CTV theo quyền.
- Nhập XLSX/CSV, chống trùng, danh sách chờ bổ sung; bản chụp34hồ sơ từ GoogleSheets đã cung cấp.
- Telegram cấu hình qua giao diện Admin tại localhost, lấy nơi nhận, gửi tin thử; nhắc học phí/DAT/kỳ trường. Chưa nhập token/ChatID thực tế trên MacBook nên chưa xác nhận gửi thật.
- Localhost và truy cập điện thoại cùng Wi-Fi bằng npm run lan.

## Công nợ trường đã được người dùng xác nhận

| Nội dung | VNĐ |
|---|---:|
| Tổng phải trả nhóm hồ sơ lịch sử | 228.000.000 |
| Tổng đã trả lịch sử | 175.400.000 |
| Còn nợ lịch sử | 52.600.000 |

Đây là số dư tổng lịch sử, **không phải phiếu chi mới**. Không cộng tổng175,4triệu với các đợt I3:M3, không cộng thêm nhật ký trường chi tiết. Bản nguồn và công thức giữ nguyên để truy vết; trên giao diện hiển thị số nợ dương52,6triệu.

Khi chạy bản này lần đầu, hệ thống lưu đối soát một lần trong settings.schoolOpeningHTBLXV01. Nhóm học viên lịch sử được nhận diện bằng mã hoặc CCCD từ bảng nguồn để không cộng lại học phí trường khi bổ sung vào sổ chính. Hồ sơ thực sự mới ngoài nhóm này cộng nghĩa vụ mới; giao dịch mới sau đối soát cộng vào số đã trả, giảm công nợ. Không ghi đè kỳ lương.

Giao dịch trả trường đã có trong ứng dụng tại thời điểm nâng cấp được giữ nguyên và đánh dấu thuộc phạm vi đối soát tổng, không cộng lần nữa vào175,4triệu. Nếu trong đó có khoản chưa nằm trong xác nhận của người dùng, cần đối soát lại trước khi sử dụng số tổng. Không đoán ngày/hình thức/phân bổ175,4triệu cho từng học viên: bảng từng hồ sơ lịch sử ghi “Chờ đối soát phân bổ”.

Dòng tiền tổng quan dựa trên phiếu thu/chi đã nhập; số dư lịch sử175,4triệu không tự tạo dòng chi mới. Không dùng số này để suy ra tiền mặt tồn quỹ khi chưa có đầy đủ sổ gốc.

## Cập nhật MacBook, giữ nguyên dữ liệu

1. Xuất sao lưu ở Cài đặt & sao lưu. Về Terminal chạy app nhấn Control+C.
2. Giải nén htblxv01.zip **thành thư mục riêng**, không xóa hoặc thay toàn bộ data cũ.
3. Mở Terminal mới, gõ `zsh ` (có dấu cách), kéo file cap-nhat.command từ bản mới vào sau chữ đó rồi Enter.
4. Script sao lưu ứng dụng cũ vào Downloads, chép mã mới vào /Users/thuha/Downloads/driving-center và giữ nguyên data/cấu hìnhTelegram. Nếu không tìm thấy đúng thư mục, script dừng.
5. Trở lại Terminal đã dùng biếnTelegram nếu có, chạy:

```bash
cd /Users/thuha/Downloads/driving-center
npm run lan
```

6. Trên trình duyệt MacBook nhấn Command+Shift+R. Kiểm tra tên HTBLXV01 và Thanh toán trường.
7. Admin vào Nhập file Excel → Nạp34hồ sơ từ bảngHưngThịnh. Các dòng thiếu thông tin/nguồndata/nhân sự được giữ chờ, không đưa vàoKPI hoặc công nợ học viên chính thức.
8. Cài đặt & sao lưu → Cấu hìnhbotTelegram → nhập token mới trênlocalhost → lấy nơi nhận → gửi tin thử. Không gửi token vàoChatGPT.

Chi tiết đầy đủ và giới hạn ở README.md. Chưa cập nhật trực tiếp lênMacBook và chưa kiểm tra hiển thị/Telegram trên máy của người dùng.

## Bản sửa 1.1.2 — hiển thị hồ sơ thiếu và đồng bộ tổng tiền nguồn

Phần này thay thế các mô tả cũ về việc chưa đưa tiền nguồn vào Tổng quan.

- 34 hồ sơ đã nạp xuất hiện ngay trong Tuyển sinh & học viên, gồm các dòng “Chờ bổ sung”; người dùng bổ sung thủ công sau. Không bắt buộc hoàn thiện trước khi xem danh sách. Bảng gộp chặn trùng theo mã/CCCD/điện thoại; khi chuyển chính thức không tạo thêm dòng hiển thị.
- Hồ sơ chờ chưa được tính KPI. Tuy nhiên **tiền lịch sử trong file vẫn được tổng hợp**, không đợi bổ sung CCCD/điện thoại/nguồn data mới hiện báo cáo.
- Số gốc: tổng học phí588.700.000đ; đã thu301.400.000đ; học viên còn phải đóng287.300.000đ.
- Chi vận hành/đầu tư: T8 98.500.000đ, T9 37.688.000đ, T10 51.608.000đ; cộng187.796.000đ. Dùng cột số tiền thực chi của từng dòng chi tiết trong T8/T9/T10, không cộng thêm tab tổng hợp T8&T9, dòng tổng hoặc ghi chú “trong đó”. Tổng28 khoản có số tiền dương. Nếu ghi chú khác cột số tiền, giữ nguyên ghi chú để tra cứu và dùng cột thực chi, không tự thay số.
- Đã trả trường175.400.000đ; còn nợ trường52.600.000đ theo xác nhận.
- Tổng tiền đã chi363.196.000đ =175.400.000+187.796.000 (chưa có hoàn tiền phát sinh). Chênh lệch thu-chi chưa tính vốn góp, không được gọi là tồn quỹ hoặc lợi nhuận.
- Tổng quan, Thu chi & học phí, Chi phí vận hành và Thanh toán trường dùng chung số liệu nguồn + giao dịch phát sinh. Các khoản tiền nguồn đối chiếu với lịch sử nhập theo mã/CCCD, số tiền/ngày hoặc chỉ mục thu lịch sử để không cộng thêm lần nữa khi hoàn thiện hồ sơ. Giao dịch chi trùng nguồn đối chiếu số tiền, lý do và tháng.
- Bảng chi phí hiển thị khoản chi nguồn dù chưa có ngày chi/người chi; có nút Bổ sung để điền hai thông tin này sau, không tạo lại phiếu chi hay đổi tiền gốc.
- Nguồn thu là bản chụp Google Sheets TỔNG; nguồn chi là các bảng chi tiết T8/T9/T10, đọc lại khi tạo bản1.1.2. Không đồng bộ liên tục từGoogleSheets sau khi cài. Số phát sinh ghi trên ứng dụng cập nhật báo cáo; số gốc giữ để truy vết.
- Khi người dùng đã nhập riêng cùng khoản chi nhưng ghi khác lý do/tháng, hệ thống không tự đoán đó là trùng. Cần đối soát trước khi nhập thêm; với khoản có trong bảng nguồn hãy dùng nút Bổ sung, không tạo phiếu chi mới.

Cập nhật bằng cap-nhat.command như hướng dẫn ở trên; script chép thêm public/lead-list.mjs và imports/financial-source.json. Giữ nguyên data/Telegram. Chạy lại npm run lan và làm mới trang. Không cần nạp lại34hồ sơ nếu đã nạp từ trước.

## Bản sửa 1.1.4 — phân công toàn bộ hồ sơ và sửa chặn kỳ lương

- Theo yêu cầu đã xác nhận, khi khởi động bản cập nhật lần đầu: toàn bộ hồ sơ chính thức và hồ sơ chờ hiện có đổi nhân sự phụ trách sang DƯƠNG XUÂN QUYỀN, nguồn data Công ty. Cập nhật một lần, lưu lịch sử phân công cũ, không ghi đè những điều chỉnh thủ công thực hiện sau đó. Các hồ sơ nạp lại từ bản nguồn Hưng Thịnh cũng dùng phân công này.
- Nếu nhân sự đã tồn tại, giữ nguyên vai trò, lương và tài khoản. Nếu chưa có, thêm hồ sơ nhân sự quản lý tên trên với các khoản lương bằng0 để bổ sung sau; không tạo tài khoản đăng nhập hoặc sao chép lương người khác. Nếu có nhiều nhân sự trùng chính xác tên, ghi nhật ký và không đoán chọn người.
- Giữ nguyên trạng thái học/thi, trạng thái chốt hồ sơ, học phí, khoản thu, ngày thu và giấy tờ. Không chuyển mọi hồ sơ sang “Chốt thành công” chỉ vì đổi người phụ trách.
- Bảng lương đã chốt/đã trả giữ nguyên bản chụp; kỳ mở được tính theo phân công mới. Đây là thay đổi chủ sở hữu và nguồn dữ liệu, không phải tự điều chỉnh lương đã chi.
- Sửa lỗi coi một bản ghi nháp bảng lương là kỳ đã chốt. Giao diện và chặn nhập dùng cùng một điều kiện: locked===true hoặc paid===true. Một bản nháp locked:false không chặn hồ sơ.
- Kiểm tra khóa khi nhập chỉ áp dụng kỳ tính KPI thực sự bị ảnh hưởng, không chặn chỉ vì khoản học phí đợt sau được thu ở tháng khác đã chốt lương. Lỗi nhập nêu rõ tháng khóa nếu kỳ thực sự đã chốt.
- Mỗi lần bổ sung/kiểm tra lại, tính lại lỗi từ dữ liệu hiện tại thay vì giữ thông báo lỗi cũ.
- Thêm payroll-state.mjs trong bộ cập nhật. Script cap-nhat.command tự chép tệp này; người cập nhật thủ công phải chép cả tệp cùng thư mục server.mjs.

Kiểm tra:21 bài kiểm tra đạt, gồm dữ liệu mô phỏng nâng cấp có kỳ tháng8 là bản nháp, tháng10 thực sự đã chốt; xác nhận bổ sung hồ sơ KPI tháng8 có khoản thu tháng10 thành công và không làm đổi bảng lương tháng10. Chưa đọc cơ sở dữ liệu thực tế trên MacBook; cập nhật xong cần mở lại trang để nghiệm thu.

## Bản 1.1.5 — cập nhật bàn giao hàng loạt

Trong Hồ sơ & bàn giao:

- Xem cả hồ sơ chính thức và hồ sơ chờ bổ sung. Tìm theo mã/tên/điện thoại, lọc trạng thái bàn giao.
- Tích từng dòng hoặc ô đầu bảng để chọn toàn bộ danh sách đang hiển thị. Có số lượng đã chọn. Khi đổi tìm kiếm/bộ lọc, lựa chọn được xóa để không tác động hồ sơ ẩn.
- Nhấn Cập nhật đã chọn hoặc Cập nhật tất cả đang hiển thị. Biểu mẫu cho thấy số lượng, trạng thái, ngày bàn giao thực tế và ghi chú chung. Nhấn Lưu để thực hiện.
- Hai trạng thái mới: Đã bàn giao và Đã hoàn thành. “Đã hoàn thành” chỉ có nghĩa hoàn tất việc bàn giao hồ sơ, không phải tốt nghiệp khóa học/đạt sát hạch.
- Quyền cập nhật: Admin, Quản lý, bộ phận Hồ sơ. Máy chủ kiểm tra quyền và toàn bộ danh sách trước khi ghi; nếu một hồ sơ đã thay đổi/không tồn tại thì không ghi một phần. Tối đa1.000 hồ sơ/lần.
- Lưu người cập nhật, thời điểm, ngày bàn giao và lịch sử chuyển trạng thái trên từng hồ sơ; nhật ký ghi danh sách ID đã tác động.
- Giữ nguyên tiền, nguồn data, chủ sở hữu, tiến độ học/thi, trạng thái chốt và kỳ KPI. Vẫn cập nhật được nghiệp vụ bàn giao khi kỳ lương đã chốt vì thao tác không sửa tiền hoặc KPI.
- Hồ sơ thiếu CCCD/điện thoại vẫn cập nhật bàn giao được. Khi sau đó bổ sung thành hồ sơ chính thức, lịch sử bàn giao được giữ.

Bộ cập nhật thêm handover.mjs; cap-nhat.command tự chép tệp này. Sao lưu, dừng app, chạy script từ bản mới, chạy lại npm run lan và làm mới trình duyệt. Đầu trang hiển thị HTBLXV01 1.1.5.

## Bản 1.1.6 — lịch thu toàn hệ thống, tất toán trước thi, quỹ và bộ lọc

### Xác minh thu học phí từ Google Sheets

- Đọc đối chiếu lại bảng TỔNG, giữ nguyên số thực thu và ngày nguồn. Có bảng riêng trong Thu chi & học phí cho từng học viên: đợt1/2/3, tiền ghi ở cột đợt trong file, tiền phân bổ, trạng thái đủ/một phần/chưa đóng, tổng đã thu và còn phải đóng.
- Có34 hồ sơ ghi thu lần1 (165.000.000đ),22 hồ sơ có thu lần2 (117.200.000đ),4 hồ sơ có thu lần3 (19.200.000đ). Không suy ra mọi người đã đóng đủ chỉ vì có khoản thu.
- Hồ sơ lịch sử dùng tiền đợt1 thực tế trong file (kể cả ngoài bốn mức chọn của hồ sơ mới). Đợt2 B1/B2 5triệu,C1 7triệu; đợt3 là toàn bộ phần học phí còn lại sau đợt1/2. Tiền vượt một đợt phân bổ tiếp sang đợt sau để không thu trùng.
- Ví dụ Nguyễn Thành Chung C1 có thu5triệu ở cột đợt2, mức cần7triệu nên ghi Đóng một phần, thiếu2triệu đợt2. Nguyễn Chí Phúc B2 đóng8,5triệu+9,2triệu đã đủ tổng17,7triệu, dù cột đợt3 trống vẫn không nhắc thu thêm.
- Hai khoản nguồn còn thiếu ngày: Nguyễn Chí Phúc9,2triệu; Phùng Đức Tâm5,7triệu. Ghi nhận số tiền nguồn để đối soát, không bịa ngày hoặc chứng từ ngân hàng.

### Lịch học phí và Telegram thống nhất

- Đợt2 đến hạn = Ngày khai giảng +25 ngày.
- Đợt3 đến hạn = Ngày xác nhận hoàn thành đủ kmDAT +15 ngày, thay thế quy tắc cũ đến hạn ngay khi đủDAT.
- Nhắc đúng ngày đến hạn nếu còn thiếu tiền, không nhắc sớm3/1ngày theo cơ chế cũ. Nếu máy tắt vào ngày đến hạn thì nhắc một lần khi ứng dụng chạy lại và khoản vẫn quá hạn. Hàng đợi theo mã học viên/đợt/ngày hạn, không sinh tin lặp hằng ngày cho cùng hạn.
- Tin học phí đang chờ từ quy tắc cũ bị hủy nếu không còn đúng lịch mới. Tin đã gửi giữ trong lịch sử, không xóa.
- Hồ sơ thiếu ngày khai giảng/DAT hiển thị chưa đủ dữ liệu, không đoán ngày. Trong Thu chi & học phí có Cập nhật lịch để điền khóa/ngày khai giảng, kể cả hồ sơ thiếu giấy tờ. Admin/Đào tạo chọn ngày hoàn thànhDAT thực tế, không chọn tương lai.
- Nhắc lịch, thu/hoàn tiền và các xác nhận này dùng được cho hồ sơ chờ bổ sung; chưa tự chuyển sang tínhKPI khi chưa nhập chính thức. Số tiền thu thêm được cộng vào báo cáo ngay, không đợi điền đủCCCD/điện thoại.
- Xác nhận đợt2 đủ tiền vẫn tạo yêu cầu đăng kýDAT một lần. Xác minh bảng nguồn không tự bắn hàng loạt yêu cầuDAT cho lịch sử đã học.
- Telegram cần cấu hình thật tại Cài đặt trênlocalhost, máy bật/không ngủ và Internet. Chưa gửi kiểm tra trênbot thật của người dùng trong môi trường tạo gói.

### Tất toán học phí trước đăng ký thi

- Đợt3 là nghĩa vụ thanh toán dứt điểm toàn bộ học phí còn lại.
- Trong Hành trình học có bảng Điều kiện học phí và ghi nhận đăng ký thi. Chặn cả thi kết thúc môn và sát hạch nếu còn nợ bất kỳ khoản học phí nào; máy chủ kiểm tra lại lúc nhấn, không chỉ ẩn nút.
- Chỉ Admin/Quản lý/Hồ sơ/Đào tạo ghi nhận đăng ký; lưu người, thời điểm và loại thi, không tạo trùng cùng học viên/loại thi.
- Ghi nhận này là yêu cầu nội bộ, chưa thay trường tiếp nhận, xác nhận điều kiện đào tạo và lịch thi. Không tự xác nhận đạtDAT, hoàn thành khóa học hoặc đỗ sát hạch.

### Chi phí tháng8/9/10 và số quỹ

| Chỉ tiêu gốc | VNĐ |
|---|---:|
| Vốn góp Anh Hưng | 50.000.000 |
| Vốn góp Anh Việt | 50.000.000 |
| Tổng vốn góp | 100.000.000 |
| Tiền học viên đã thu | 301.400.000 |
| Chi nộp trường đã xác nhận | 175.400.000 |
| Chi vận hành/đầu tư T8 | 98.500.000 |
| Chi vận hành T9 | 37.688.000 |
| Chi vận hành T10 | 51.608.000 |
| Tổng chi vận hành/đầu tư | 187.796.000 |
| Quỹ còn lại theo sổ | **38.204.000** |

Quỹ =100.000.000+301.400.000−175.400.000−187.796.000. Không cộng287,3triệu học phí chưa thu và không trừ52,6triệu nợ trường chưa trả khỏi số tiền hiện còn. Giao dịch thu/chi/hoàn tiền mới cập nhật quỹ theo công thức. Đây là quỹ tính từ số liệu ghi nhận, chưa phải kết quả kiểm kê tiền mặt/tài khoản ngân hàng.

Chi phí lấy cột Thực chi của các bảng chi tiếtT8/T9/T10; loại dòng tổng, dòng “trong đó” và không cộng lại tab tổng hợp. Giữ ghi chú gốc để tra cứu khi ghi chú khác số tiền cột. Không suy đoán các lần trả trường theo tháng vì nhật ký chi tiết chưa khớp tổng175,4triệu đã xác nhận.

### Bộ lọc và bóc tách chi phí

- Tuyển sinh & học viên có bộ lọc kết hợp: trạng thái hồ sơ, hạng/gói, khóa, nhân sự phụ trách, nguồn data, giấy tờ đủ/thiếu/chưa cập nhật, bàn giao, tiến độ và thông tin còn thiếu. Tìm mã/tên không dấu, xem số kết quả, xóa bộ lọc, xuấtCSV đúng danh sách đang lọc.
- Menu Chi phí có hai nhóm riêng: Chi nộp về trường và Chi phí vận hành & đầu tư. Chọn xem một nhóm hoặc cả hai, tổng từng nhóm riêng và quỹ chung không cộng trùng. Hoàn tiền học viên nằm trong phần quỹ riêng, không giả thành chi vận hành.

### Cập nhật

Tải lại góihtblxv01.zip, dừng ứng dụng, chạy cap-nhat.command, mở lại npm run lan và làm mới trang. Đầu trang1.1.6. Giữ nguyên data, token, hồ sơ và lịch sử chốt lương. Không cần nạp lại34hồ sơ đã có.

## Bản 1.1.7 — ngày vào làm, chấm công, lương theo công, nhóm tháng và cảnh báo

### Nhân sự và chấm công

- Nhân sự thêm Ngày vào làm. Hồ sơ cũ giữ trống để bổ sung đúng ngày thực tế, không tự gán ngày cập nhật.
- Menu Chấm công: chọn tháng/nhân sự, xem tổng công và danh sách từng ngày, thêm hoặc sửa trạng thái/nghi chú, xuấtCSV.
- Đủ ngày=1công; nửa ngày=0,5công; nghỉ=0công. Mỗi nhân sự/ngày có một bản ghi; lưu lại cùng ngày sẽ cập nhật thay vì cộng trùng.
- Không chấm trước ngày vào làm hoặc ngày tương lai. Khi sửa, ngày/nhân sự giữ nguyên; chỉ sửa trạng thái hoặc ghi chú. Admin/Quản lý/Kế toán được chấm; tài khoản nhân viên/CTV chỉ xem công của mình.
- Cần bổ sung ngày vào làm trước khi nhập công. Bảng lương cảnh báo dữ liệu còn thiếu; không tự coi ngày chưa chấm là đủ công.

### Lương theo công

Lương theo công = Lương cơ bản tháng / Công chuẩn tháng × Tổng công thực tế.

- Công chuẩn tạm mặc định26/tháng, Admin/Kế toán chỉnh theo từng tháng trước chốt, từ1đến31 theo bước0,5.
- Chỉ tính công từ ngày vào làm, trong đúng tháng. Làm tròn lương quy đổi đến đồng sau phép tính.
- Phụ cấp/KPI/thưởng/khấu trừ/tạm ứng giữ công thức cũ; chỉ phần lương cơ bản được quy đổi theo công. Phụ cấp chưa tự chia theo công, chưa có chính sách tăng ca hoặc ngày nghỉ có hưởng lương riêng.
- Không tự tínhKPI trước/sau ngày vào làm theo một chính sách mới; KPI vẫn theo quy tắc hồ sơ đã được chốt trong các bản trước.
- Khi công thực tế vượt công chuẩn, hiển thị cảnh báo để kiểm tra, vẫn dùng công thức đã chọn; không tự áp hệ số tăng ca.
- Nhân sự có lương cơ bản dương cần ngày vào làm và dữ liệu chấm công trước khi chốt kỳ đang làm việc. Chốt lương giữ bản chụp công chuẩn/các ngày công/số tiền. Sau chốt không sửa chấm công hoặc công chuẩn của kỳ đó; bảng lương đã chốt trước khi nâng cấp không đổi.
- Bảng lương thêm cột Lương tháng, Công chuẩn, Công thực tế, Lương theo công và cảnh báo. XuấtCSV có cùng số công và số tiền.
- Lương tính trên bảng chưa tự tạo thêm khoản chi vận hành. Sổ quỹ chỉ trừ chi đã ghi nhận trong file/giao dịch; nếu phát sinh trả lương mới chưa có trong dữ liệu nguồn, kế toán ghi khoản chi tương ứng một lần, không nhập lại lương nguồn đã có.

### Chi phí vận hành theo tháng

- Mỗi tháng có một bảng riêng và tổng tháng: T8 98.500.000đ; T9 37.688.000đ; T10 51.608.000đ theo file gốc.
- Bộ lọc tháng để xem một tháng hoặc tất cả. Khoản chi mới phân vào tháng theo ngày chi; khoản nguồn thiếu ngày giữ đúng tháng báo cáo gốc, không đoán ngày.
- Tiền nộp trường thuộc nhóm riêng, không nằm trong các tổng vận hành. Các dòng nguồn và giao dịch trùng được đối soát như trước.
- Tổng tháng/quỹ là số liệu toàn kỳ; tìm kiếm chỉ lọc dòng chi tiết, không tự thay số dư quỹ.

### Quỹ trên Tổng quan

Ô nổi bật “QUỸ CÒN LẠI SAU CHI PHÍ VÀ NỘP TRƯỜNG” tính trực tiếp: vốn100triệu + thu301,4triệu − vận hành/đầu tư187,796triệu − nộp trường175,4triệu =38.204.000đ theo số gốc. Giao dịch thu/chi/hoàn mới cập nhật theo sổ; khoản học phí chưa thu và nợ trường chưa trả theo dõi riêng. Không phải kết quả kiểm kê tiền mặt/ngân hàng.

### Màu cảnh báo và bộ lọc các danh sách

- Chữ Chờ khai giảng tô đỏ khi trường Khóa học/tiến độ có đúng nội dung này. Không tự đổi trạng thái học viên chỉ vì chưa nhập ngày khai giảng.
- Tên học viên có đợt2/3 đến hạn hoặc quá hạn và còn tiền thiếu được tô đỏ, có nhãn Đến hạn/Quá hạn. Ngày hạn tại bảng học phí cũng tô đỏ. Khoản đã trả đủ hoặc chưa đến hạn không tô đỏ.
- Tuyển sinh bổ sung lọc Chờ khai giảng, học phí đến/quá hạn, đã tất toán/còn nợ ngoài các bộ lọc cũ.
- Bàn giao giữ tìm mã/tên/điện thoại và trạng thái; Đào tạo lọc hạng/khóa/hạn tiền/tất toán; Thu chi lọc học viên/hạn/tất toán; Chi phí lọc nhóm/tháng/từ khóa; Trường lọc học viên/hạng; Công việc lọc trạng thái/phụ trách/hạn; Nhân sự lọc vai trò/ngày vào làm; Chấm công lọc tháng/nhân sự; Bảng lương lọc tháng/vai trò/tên; Tài khoản lọc vai trò/tên; Danh sách chờ nhập lọc hạng/từ khóa lỗi.
- Các bộ lọc chỉ thay danh sách hiển thị/xuấtCSV tương ứng, không xóa dữ liệu hoặc thay số tổng kế toán, không làm rộng quyền truy cập.

### Cài bản1.1.7

Sao lưu, dừng ứng dụng. Giải nén bản mới riêng, chạy cap-nhat.command để chép thêm attendance.mjs và các filepublic mới, giữ nguyên data/token. Chạy npm run lan và tải mới trang. Đầu trang1.1.7. Vào Nhân sự bổ sung Ngày vào làm thực tế; sau đó Chấm công chọn tháng, kiểm tra Công chuẩn và ghi công. Không cần nạp lại34hồ sơ.

Kiểm thử33bài đạt (công thức lương/công, không chấm trùng, trước ngày vào làm, khóa kỳ, tổng chi theo tháng, cảnh báo đỏ, phép tính quỹ, phân quyền và các luồng trước). Có kiểm tra việc dựngHTML của14màn hình trong môi trường giả lậpDOM; chưa thay thế nghiệm thu hiển thị trực quan trên Safari/MacBook/iPhone của người dùng.


## Bản 1.1.8 — Tải file chấm công
Trong Chấm công, chọn Tải mẫu CSV hoặc tải .xlsx/.csv/.tsv của anh. Dòng đầu có Ngày, Nhân sự, Trạng thái (hoặc Số công), Ghi chú. Mỗi dòng là một nhân sự/một ngày. Tên nhân sự phải khớp tên đã tạo hoặc dùng mã nhân viên. Ngày nên ghi đủ năm dd/mm/yyyy hay yyyy-mm-dd; ngày thiếu năm dùng năm hiện tại. Nhận Đủ ngày/1, Nửa ngày/0.5, Nghỉ/0; không tự hiểu các mã nghỉ phép khác.

Admin, Quản lý và Kế toán được tải và xem trước. Chỉ khi bấm Xác nhận nhập các dòng hợp lệ mới lưu. File tối đa 6 MB, tổng 1.000 dòng; đọc mọi sheet có cùng cấu trúc, không nhận bảng ma trận ngày nằm ngang. Ngày trước vào làm, ở tương lai, kỳ lương đã chốt, nhân sự chưa xác định, trạng thái sai hoặc ngày đã chấm được báo lỗi và bỏ qua. Không tạo nhân sự tự động, không ghi đè công đã có. Chấm công nhập thành công tham gia tính lương theo công ngay; bảng lương đã chốt giữ nguyên. Chọn đúng tháng để xem dữ liệu vừa nhập.

Cập nhật trên MacBook: sao lưu dữ liệu → Control+C dừng máy chủ → giải nén bản mới → chạy cap-nhat.command và chọn thư mục ứng dụng cũ → npm run lan → tải mới trang. Bản mã nguồn không chứa dữ liệu đang vận hành hay token của anh.


## Bản 1.1.9 — Tổng hồ sơ trường và chi phí theo tháng
Phiếu thanh toán trường mặc định Tổng toàn bộ hồ sơ trên hệ thống, gồm hồ sơ chính thức và hồ sơ nhập chờ bổ sung đã loại trùng. Trường cố định Hưng Thịnh. Phiếu lưu số lượng và danh sách ID tại thời điểm ghi nhận; số tiền, hình thức, ngày và mã chứng từ phải nhập thực tế. Có thể chọn một hồ sơ riêng. Nộp chung giảm tổng nợ và quỹ, chưa tự xác nhận từng học viên đã trả đủ. Tổng nợ vẫn giữ số lịch sử đã đối soát, không cộng lặp. Giao dịch đã lưu giữ nguyên lịch sử.

Chi phí ứng dụng vào tháng theo ngày chi; giữ thời điểm tạo, người ghi và mã chứng từ. Chi phí nguồn khi bổ sung ngày được chuyển sang tháng tương ứng; ngày bỏ trống giữ tháng nguồn ban đầu. Tổng chi không đổi khi chuyển tháng. Lịch sử bổ sung nguồn lưu nối tiếp nội dung trước/sau và người/thời điểm cập nhật; không tạo lại các lịch sử cũ chưa từng được ghi. Không xóa lịch sử khi chuyển tháng.


## Bản 1.2.0 — Quản trị sửa/xóa chi phí vận hành
Chỉ tài khoản vai trò Quản trị được nút Sửa/Xóa ở từng khoản chi nguồn và khoản chi thêm trong ứng dụng. Được sửa ngày chi, số tiền, lý do chi, người chi; bắt buộc ghi lý do thay đổi. Khi xóa cũng phải nhập lý do và bấm lưu xác nhận. Xóa loại khoản khỏi tổng chi/tháng/quỹ, nhưng giữ bản gốc trong dữ liệu lưu trữ và nhật ký trước/sau. Sửa không đổi thời điểm tạo hoặc mã chứng từ ban đầu; mã chứng từ của khoản đã xóa vẫn không được dùng lại. Kế toán tiếp tục được thêm khoản chi và bổ sung ngày/người chi nguồn, không có quyền sửa tiền hoặc xóa. Chức năng này áp dụng chi phí vận hành; tiền nộp trường vẫn dùng giao dịch nộp/hoàn riêng và giữ lịch sử. Lịch sử cũ chưa có thời điểm tạo hiển thị Chưa lưu thời điểm ở bản cũ.


## Bản 1.2.1 — Ba cột thanh toán cho học viên và trường
Thu chi & học phí / Lịch thu và công nợ học viên có Đợt 1, Đợt 2, Đợt 3, mỗi cột tổng tiền ròng và danh sách khoản/ngày thực tế. Nút Bổ sung đợt mở phiếu thu với học viên đã chọn. Thanh toán trường có ba cột cho từng hồ sơ và bảng tổng giao dịch theo đợt; nút bổ sung tổng giữ mặc định toàn bộ hồ sơ. Khi ghi thu/hoàn học phí hay trả/hoàn trường mới phải chọn đợt và nhập số tiền, ngày, chứng từ; hoàn tiền trừ vào đợt được chọn.

Khoản bổ sung là tiền phát sinh mới, không nhập lại khoản đã có. Đối soát khoản thu nhập từ nguồn không cộng trùng. Khoản lịch sử chưa có ngày hiển thị Chưa có ngày đóng; chưa gắn đợt hiển thị Chưa phân đợt trong lịch sử, không đoán theo thứ tự. Khoản thứ tư ở file được giữ ở ngoài ba đợt. Tổng 175,4 triệu nộp trường lịch sử vẫn giữ nguyên, không tự chia đợt hoặc phân bổ học viên. Hạn nhắc học phí và điều kiện tất toán trước thi giữ theo cấu hình đã chốt.


## Bản 1.2.2 — Telegram nhắc hạn trường và học phí theo giai đoạn
Thanh toán trường: gửi khi đến ngày 1 hoặc 25 (giờ Việt Nam) và tổng công nợ còn lớn hơn 0; một thông báo mỗi ngày kỳ hạn. Số nợ được kiểm tra lại trước khi gửi, không gửi tồn đọng của ngày kỳ cũ vào ngày khác.

Học phí: đợt 2 = ngày khai giảng +25 ngày; đợt 3 = ngày xác nhận đủ km DAT +15 ngày. Mỗi hạn có một tin nhắc trước đúng 3 ngày, và một tin đến/quá hạn nếu còn nợ. Không gửi tin trước hạn đã cũ, không gửi khi đã đủ tiền, học viên hủy hoặc ngày hạn đã thay đổi. Đợt 1 ghi nhận lúc tuyển sinh; chưa có lịch hạn riêng nên không tự đoán ngày nhắc. Đăng ký DAT giữ theo quy trình sau xác nhận đủ đợt 2; yêu cầu đổi sang đợt 3 chưa được xác định nên chưa đổi.

Đây là lịch trong mã nguồn; cần cấu hình bot/token và Chat ID trên máy chạy ứng dụng. Dùng bot đã có: Cài đặt & sao lưu → Cấu hình bot Telegram (trên localhost MacBook) → Lấy danh sách nơi nhận → Gửi tin thử. Nếu chưa có bot, tạo bằng BotFather /newbot, gửi /start cho bot rồi cấu hình token tại localhost, không gửi token vào cuộc trò chuyện. Tin tới nhóm/cá nhân quản lý đã cấu hình, không tự gửi riêng học viên. MacBook phải bật, ứng dụng chạy và có Internet; kiểm tra mỗi phút. Nếu máy tắt hết ngày nhắc trước 3 ngày, không thể gửi đúng thời điểm đã qua; ngày đến/quá hạn vẫn nhắc khi chạy lại nếu còn nợ. Không có dịch vụ chạy nền trên đám mây trong bản này.


## Bản 1.2.3 — Lịch theo tiền đóng đợt1, xác minh đợt3 và tất toán
- Đợt1 =2.500.000đ: đợt2 đến hạn sau7ngày từ ngày đóng đủ đợt1, không tính từ khai giảng hoặc ngày chốt. Mức đợt2 giữ quy định trước: B1/B2 5.000.000đ, C1 7.000.000đ.
- Đợt1 =7.500.000 / 8.500.000 / 9.500.000đ: bỏ qua đợt2, không thu hoặc nhắc trùng.
- Đợt3: khai giảng +25ngày; B1/B2 5.000.000đ, C1 7.000.000đ.
- Đợt cuối — tất toán: số tiền còn lại sau ba đợt; hạn = ngày xác minh đủ đợt3 +15ngày. Admin/Kế toán có nút Xác minh đủ đợt3 khi tổng thu ròng đã đủ mức lũy kế. Không tự xác minh hoặc gán ngày cho hồ sơ cũ. Ngày đủ km DAT không còn là mốc tính hạn tiền.

Nhắc trước3ngày, khi đến/quá hạn còn nợ, không gửi khi đã đủ tiền. Cảnh báo màu đỏ/lọc đến hạn dùng cùng lịch. Trường vẫn kỳ ngày1/25. Quy tắc mới thay thế thông báo học phí cũ đang chờ; giữ lịch sử tin đã gửi. Đăng ký DAT tạo một yêu cầu nội bộ sau xác minh đủ đợt3 theo yêu cầu cập nhật; không gửi lại nếu bot đã gửi yêu cầu DAT trước đây. Việc thi vẫn bắt buộc tất toán toàn bộ học phí.

Ngày đợt1: lấy từ cột thu đầu trong nguồn; với phiếu mới, lấy ngày cộng dồn thu đủ mức đợt1 (ưu tiên phiếu đã gắn đợt1). Thiếu ngày nguồn thì bổ sung trong Cập nhật lịch, Admin/Kế toán mới được nhập ngày đóng đợt1; trường này không tạo thêm khoản thu. Không lấy ngày KPI thay ngày đóng. Mức lịch sử ngoài bốn mức đã chốt và hạng chưa có định mức hiện Cần đối soát, không tự đoán lịch. Nếu học phí còn thấp hơn mức đợt tiếp theo thì chỉ yêu cầu đến hết số dư, không thu vượt học phí.

Thêm lựa chọn Đợt cuối trên phiếu học phí và cột lịch sử riêng; phiếu nộp trường vẫn ba đợt. Các khoản nguồn giữ số tiền/ngày gốc, tổng thu/quỹ không đổi khi nâng cấp. Cài bằng cap-nhat.command sau khi sao lưu và dừng máy chủ, chạy lại npm run lan. Máy chủ phải chạy và có Internet để Telegram gửi đúng ngày; bản cập nhật không xác nhận kết nối Telegram thực tế trên MacBook.


## Bản 1.2.4 — Chỉnh sửa và xóa lưu trữ học viên
Trong Tuyển sinh & học viên, đổi Mở thành Chỉnh sửa cho hồ sơ chính thức theo quyền hiện có. Hồ sơ thuộc kỳ KPI đã chốt vẫn cần mở kỳ trước khi sửa theo quy định cũ. Admin có Chỉnh sửa cho dòng chờ, được lưu tên/điện thoại/CCCD/khóa/học phí/ghi chú khi chưa đủ thông tin; hoàn thiện bằng nút Hoàn thiện hồ sơ sau. Không tự đổi hồ sơ chờ thành hồ sơ chốt hoặc tính KPI.

Chỉ Admin có Xóa hồ sơ. Nhập lý do và xác nhận lưu; đây là xóa lưu trữ: ẩn khỏi tuyển sinh, học viên, bàn giao và hành trình đang vận hành, hủy tin học phí đang chờ và dừng phát sinh nhắc mới. Lịch sử xóa hiện cuối danh sách; giữ bản chụp gốc và nhật ký chỉnh sửa. Khoản thu/chi, nghĩa vụ trường, công nợ và KPI đã ghi không bị xóa; kỳ lương chốt không đổi. Hồ sơ đã xóa vẫn là danh tính đã tồn tại, không tự nhập lại thành người mới. Chức năng không tạo phiếu hoàn tiền, không giảm nghĩa vụ trường, không xóa nợ. Thông tin kế toán còn hiển thị để đối soát. Không có chức năng phục hồi tự động trong bản này; bản gốc vẫn có trong sao lưu.

Bản này bao gồm toàn bộ lịch nhắc 1.2.3 phía trên. Sau cập nhật cần bật máy chủ và kiểm tra tin thử Telegram tại localhost.


## Bản 1.2.5 — Ba cột ngang và cả ba là khoản chi
Thanh toán trường có ba bảng nằm ngang (điện thoại kéo ngang):
1. Anh Việt: chi theo tổng đối chiếu tiền thu học viên tháng8/2026 đợt1+2; bản nguồn hiện có104.000.000đ. Khoản nguồn hiển thị ngày thu đối chiếu, chưa có ngày chi thực tế; không gán ngày thu thành ngày chi. Phiếu nhập lại nguồn đã đối soát không tạo thêm khoản chi lần nữa. Khoản thiếu ngày hoặc chưa gắn đợt chưa tự đoán vào tổng này.
2. Anh Hưng: chi cho Anh Hưng, ghi ngày chi thực tế, số tiền, hình thức, chứng từ và nội dung.
3. Đức Thịnh: tổng thực nộp trường, gồm số lịch sử đã xác nhận175.400.000đ và phát sinh chưa nằm trong tổng lịch sử; giữ loại trùng các đợt thành phần đã nằm trong tổng. Bổ sung tạo giao dịch nộp trường thật.

Theo xác nhận mới của người dùng, CẢ BA đều là chi độc lập và giảm tiền tồn: tổng chi = chi Anh Việt + chi Anh Hưng + tiền trường + chi vận hành + hoàn học viên. Tiền tồn = vốn góp + thu học viên − tổng chi. Chi Anh Việt/Anh Hưng chưa tự giảm công nợ trường; chỉ tiền thực nộp trường mới giảm nghĩa vụ trường. Không nhập cùng một khoản ở hai bảng; hệ thống chặn mã chứng từ mới trùng giữa ba nhóm chi. Bản này không tự gán khoản Anh Việt/Hưng là bộ phận của175,4 triệu khi chưa có liên kết chứng từ chứng minh.

Với số nguồn: vốn100tr + thu301,4tr − trường175,4tr − vận hành187,796tr − chi Anh Việt104tr = ÂM65,796tr; phần mềm giữ kết quả âm để đối soát, không tự thêm vốn hoặc bỏ khoản chi. Số quỹ trước bản này38,204tr thay đổi do mới bổ sung104tr chi Anh Việt theo yêu cầu. Dữ liệu thực tế trên máy có thể khác nếu đã thêm/sửa/xóa.

Admin/Kế toán được Thêm/Bổ sung, chỉ Admin được Xóa và phải ghi lý do. Xóa chi Anh Việt giảm nhóm chi và tăng tiền tồn, KHÔNG xóa phiếu thu học viên ban đầu. Xóa chi Anh Hưng giảm chi/tăng tồn. Xóa Đức Thịnh giảm chi trường/tăng tồn và tăng lại nợ trường. Khi xóa số tổng lịch sử trường, giữ bản chụp tổng cũ và chứng từ gốc trong lịch sử; không tự lấy các đợt thành phần để thay số tổng. Giữ nhật ký mọi bổ sung/xóa và bản gốc khoản xóa. Mã chứng từ đã xóa không dùng lại.

Tổng quan, Chi phí và Thanh toán trường cùng lấy một số tổng; chi Anh Việt/Hưng tách riêng khỏi vận hành. Quy tắc mới này thay thế diễn giải Anh Hưng chỉ là chuyển nội bộ không trừ quỹ. Tải bản mới, sao lưu, dừng máy chủ, chạy cap-nhat.command, chạy lại npm run lan và tải mới trang.


## Bản 1.2.6 — Ô số tiền ngay trên ba cột
Mỗi cột Anh Việt, Anh Hưng, Đức Thịnh có Tổng số tiền đã chi nổi bật, ô Số tiền bổ sung (đ), và cột Số tiền (đ) ở từng dòng. Nhập tiền rồi bấm Bổ sung: chuyển số tiền vào biểu mẫu để chọn ngày, hình thức, chứng từ và xác nhận lưu; chưa xác nhận thì chưa trừ quỹ. Có thể để trống ô ngoài và nhập trong biểu mẫu. Cách tính ba nhóm chi và lịch sử giữ nguyên bản 1.2.5.


## Bản 1.2.7 — Đồng bộ khai giảng theo ba ảnh và đợt1 toàn bộ2,5triệu
Theo cập nhật08/11/2026, định mức đợt1 thống nhất2.500.000đ cho toàn bộ học viên, thay quy tắc chọn bốn mức cũ. Nguồn thu lịch sử, phiếu thu lớn hơn2,5triệu và ngày thu giữ nguyên để đối soát; không ghi đè khoản8tr/8,5tr thành2,5tr, không tạo phiếu thu mới, không đổi tổng thu/chi/quỹ. Số ghi theo cột thu gốc có thể gồm nhiều giai đoạn, trong khi định mức đầu chỉ2,5triệu. Đợt2 theo ngày thu đủ đợt1+7ngày; đợt3 khai giảng+25ngày (B1/B2 5tr, C1 7tr); đợt cuối xác minh đủ đợt3+15ngày. Nhắc trước3ngày như trước. Hạng ngoàiB1/B2/C1 vẫn cần đối soát định mức.

Mã khóa được ghép đúng hạng: B1 nội bộ =B.01 tự động; B2 nội bộ =B số sàn; C1 =C1. Lấy cột Ngày mở lớp làm ngày khai giảng, không lấy ngày chốt hồ sơ hoặc ngày học tập trung. Ảnh tháng10 ghi khai giảng20/10 nhưng chốt22/10, vẫn giữ đúng hai mốc riêng.

Bảng lịch được nhập nguyên theo nội dung nhìn thấy:
- 07/09: BK25–26, C1K16–17, B.01K47–48.
- 15/09: BK27–28, C1K18–19, B.01K49–51.
- 26/09: BK29–30, C1K20–21, B.01K52–54.
- 09/10: BK29–30, C1K20–21, B.01K55–59.
- 20/10: BK31–32, C1K22–24, B.01K60–62.
- 30/10: BK33–34, C1K25, B.01K63. Ảnh chỉ cho thấyK63 ở nhóm này, không tự điềnK64–69.
- 10/11: BK36–37, C1K26–27, B.01K70–72.
- 20/11: BK38–39, C1K28, B.01K73–75.
- 28/11: BK40, C1K29–30, B.01K76–79.

Với34 hồ sơ nguồn chưa có ngày khai giảng xác nhận: tự khớp18 hồ sơ, còn16 chờ bổ sung/đối soát. Nhóm khớp: K53B1 →26/09 (2); K55B1 →09/10 (2); K60B1/BK31B2 →20/10 (8); BK33B2 →30/10 (2); BK37B2/C1K26 →10/11 (4). BK29B2 lặp trong tháng9 và10 nên không tự chọn. Nếu hồ sơ đã có ngày trùng một trong hai lịch thì giữ ngày đó. B2 ghiK60 và B1K69 chưa khớp ảnh; giữ nguyên hạng, không tự đổi sangB1 hoặc suy đoán ngày. Học viên chờ khai giảng hoặc chưa có khóa tiếp tục chờ.

Khi nâng cấp, chương trình cập nhật hồ sơ hiện có một lần, kể cả dòng nhập chờ bổ sung, giữ lịch sử ngày/mức đầu trước–sau trong studentCourseHistory. Hồ sơ xóa lưu trữ không được khôi phục. Hồ sơ nhập hoặc sửa khóa sau đó được đối chiếu cùng bộ lịch. Hồ sơ lương đã chốt giữ nguyên tiền/KPI. Các thông báo đang chờ theo quy tắc cũ được kiểm tra lại trước gửi, không đổi lịch sử tin đã gửi. Không gửi lại vô hạn mỗi khi tải lại trang.

Ở Tuyển sinh & học viên, bảng Khóa cần đối soát khai giảng hiển thị từng hồ sơ thiếu/trùng/sai mã. Có thể vào Cập nhật lịch để chọn đúng đợt trong trường hợp trùng, hoặc bổ sung mã khóa còn thiếu. Ngày đã có không thuộc lớp trùng được giữ để đối soát, không tự đoán. Lịch trường và kế toán giữ nguyên bản1.2.6, gồm số dư âm nếu trước đó đã âm.

Áp dụng trên MacBook: sao lưu → Control+C → giải nén bản mới → cap-nhat.command → npm run lan → tải mới trang. Tự động cập nhật diễn ra khi chạy phiên bản mới; công cụ này chưa trực tiếp sửa dữ liệu trên MacBook từ xa.


## Bản 1.2.8 — Đối chiếu học phí

Trong Thu chi & học phí, học viên có mức học phí đã xác định và còn phải thu bằng 0đ được tô xanh nhạt và hiện nhãn HOÀN THÀNH. Áp dụng cả khi thu đủ qua bốn đợt và khi học viên tất toán sớm. Bảng đối chiếu nguồn dùng mức học phí hiện hành của hồ sơ.

Ô tích ghi nhận đã đối chiếu và được lưu theo tài khoản trên trình duyệt đang dùng. Hai bảng học phí chia sẻ dấu tích của cùng học viên. Chỉ số phía trên đếm học viên được tích trong kết quả đang hiển thị.


## Bản 1.2.9

- Menu gồm Dashbroad Hưng Thịnh, Quản lý học viên, Học viên thanh toán và Chi phí vận hành.
- Mã hiển thị HT0001, HT0002… được cấp lần đầu theo ngày chốt hồ sơ từ cũ đến mới. Hồ sơ thiếu ngày chốt dùng ngày ghi nhận trong hệ thống hoặc ngày thu đợt đầu có trong nguồn. Hồ sơ thiếu cả các mốc này xếp cuối. Hồ sơ mới dùng mã tiếp theo để giữ ổn định mã đã cấp. Mã nguồn tiếp tục phục vụ đối chiếu các phiếu thu.
- Vào Chấm công → Nhập bảng Hưng Thịnh T8–T10/2026 → Xác nhận nhập các dòng hợp lệ. Có 229 dòng cho 6 nhân sự. Quy đổi 8 giờ thành 1 công, 4 giờ thành 0,5 công, 5 giờ thành 0,625 công. OFF/LỄ là 0 giờ làm. Ô trống, phần KPI, phụ cấp và số tiền không được đưa vào công. Ghép theo tên trong dòng CA. Hồ sơ nhân sự chưa khớp, ngày đã có dữ liệu, ngày trước ngày vào làm và kỳ lương đã chốt được liệt kê để đối soát.


## Bản 1.3.0

Trong **Học viên thanh toán**, Admin và Kế toán có thể sửa học phí, lịch và mức đóng theo đợt, ngày xác minh, phiếu thu hoặc hoàn, phiếu nguồn và lịch thanh toán cũ. Số dư và mức đợt cuối được tính từ học phí và phiếu thu. Nhập lý do khi sửa. Mỗi thay đổi có nhật ký trước và sau cùng cảnh báo trong hàng đợi Telegram. Cảnh báo gửi đến bot nội bộ đã cấu hình khi máy chủ hoạt động. Tiền cọc liên quan kỳ KPI đã chốt cần mở kỳ theo quyền hiện hành trước khi chỉnh. Dấu đối chiếu của Admin và Kế toán lưu trên máy chủ.

Vào **Chấm công → Nhập bảng Hưng Thịnh T8–T10/2026** để xem trước và xác nhận 229 dòng công và 12 dòng KPI từ tệp mới. Admin có thể thêm Sale có tên rõ ràng và chưa có hồ sơ. Hồ sơ mới cần bổ sung lương và ngày vào làm từ dữ liệu nhân sự thực tế. Các tên Hồng Giang khác nhau được giữ theo nguồn để đối chiếu. Công tháng 8–9 được bổ sung vào hồ sơ kỳ đã chốt. Số thực lĩnh đã chốt được giữ theo bản chốt. Tháng 10 được nhập công và KPI nguồn, kỳ vẫn mở. KPI theo file hiển thị cạnh kết quả hệ thống để đối chiếu.

Bảng **Lợi nhuận** chỉ hiện cho Admin. Đặt mật khẩu riêng lần đầu, rồi nhập để mở bảng. Phiên xem có hiệu lực 15 phút. Lợi nhuận gộp lấy thu ròng trừ phí đã nộp trường. Dự kiến lấy thu ròng cộng còn phải thu, trừ tổng nghĩa vụ trường và các khoản chi vận hành, Anh Việt và Anh Hưng. Điểm hoàn vốn là mức thu ròng cần đạt để bù các khoản chi và nghĩa vụ này. Bảng chi tiết cho phép đối chiếu từng thành phần.

Bảng dữ liệu co theo chiều rộng trang. Bảng nhiều cột chuyển sang thẻ có nhãn ở khổ hẹp.
