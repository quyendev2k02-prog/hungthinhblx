# htblxv01 — bản tổng hợp mới nhất

Xem **HTBLXV01.md** để biết cấu hình đã chốt, đối soát175,4triệu đã trả trường và cách cập nhật. Các mục phiên bản bên dưới là lịch sử; nếu khác, HTBLXV01.md được ưu tiên.

# Ghi Danh — quản lý trung tâm tuyển sinh lái xe

Bản 1.0, dành cho trung tâm tuyển sinh và chuyển hồ sơ cho trường. Chạy trên MacBook Apple Silicon bằng Node.js 22.13 trở lên (Node 24/26 đều có thể chạy). Không cần npm install, không cần Docker, không tải thư viện ngoài lúc chạy. Giao diện và dữ liệu hoạt động ngoại tuyến; Telegram cần Internet.

## 1. Cài và mở trên MacBook

1. Giải nén `GhiDanh_MacBook_Source.zip` vào Downloads hoặc Documents. Giữ nguyên toàn bộ thư mục `driving-center`.
2. Mở Terminal, nhập `cd ` (có dấu cách), kéo thư mục `driving-center` vào cửa sổ Terminal, nhấn Enter.
3. Gõ:

```bash
npm start
```

4. Mở trình duyệt tại http://localhost:3000.
5. Lần đầu, tạo tài khoản quản trị với mật khẩu ít nhất 10 ký tự. Không có tài khoản hoặc mật khẩu mặc định.
6. Để dừng: quay lại Terminal, nhấn Control+C. Mở lần sau: vào thư mục và chạy `npm start`.

Có thể dùng `chmod +x start.command` rồi nhấp đúp `start.command`. Nếu macOS không cho mở tệp tải xuống, dùng cách Terminal ở trên; không cần tắt bảo vệ hệ thống.

Nếu cổng 3000 đã được ứng dụng khác dùng:

```bash
PORT=3001 npm start
```

Sau đó truy cập http://localhost:3001. Giữ Terminal mở trong khi sử dụng.

## 2. Trình tự đưa vào dùng

- Nhân sự: thêm quản lý, sale, cộng tác viên, hồ sơ, đào tạo, kế toán. Lương cơ bản/phụ cấp/khấu trừ/tạm ứng là tham số nhập thủ công; cập nhật trước khi chốt từng tháng.
- Cài đặt: tạo tài khoản và liên kết với đúng nhân sự. Mỗi nhân sự tuyển sinh nên có một tài khoản; tránh nhiều tài khoản dùng chung mã nhân sự.
- Tuyển sinh: tạo hồ sơ; chọn sale, nguồn data, hạng học, gói phí trường, trường liên kết và ngày ghi nhận KPI.
- Thu chi: kế toán ghi nhận tiền cọc thực nhận, đánh dấu khoản cọc và nhập mã chứng từ duy nhất. Chỉ ghi nhận khi đã đối soát tiền; không dựa vào ảnh chuyển khoản chưa xác minh.
- Hồ sơ: cập nhật giấy tờ còn thiếu, người giữ, biên nhận, ngày bàn giao và trường xác nhận tiếp nhận.
- Đào tạo: nhập tiến độ lý thuyết, mô phỏng, DAT, cabin, chứng chỉ, sát hạch, lịch tiếp theo và nguồn xác nhận từ trường.
- Thanh toán trường: tạo từng lần thanh toán phân bổ cho hồ sơ. Nếu thanh toán một lệnh ngân hàng cho nhiều hồ sơ, tạo từng dòng với mã `MA-GOC/01`, `MA-GOC/02`… ghi mã gốc trong ghi chú.
- Công việc: giao người phụ trách, ngày hết hạn và trạng thái.
- Bảng lương: chọn tháng, kiểm tra, xuất CSV, chốt kỳ; chỉ xác nhận đã trả khi thực tế đã thanh toán.

Bản giao mặc định không có dữ liệu khách hàng thật. Nếu muốn xem mẫu trước lần chạy đầu tiên, chạy `npm run demo` rồi `npm start`: tạo Sale A có 20 hồ sơ, Sale B 19 hồ sơ, quản lý và một lần thanh toán trường. Lệnh mẫu từ chối chạy nếu đã có dữ liệu; muốn thử sạch, giải nén một bản vào thư mục khác. Có thể thử bằng một nhân sự và hồ sơ giả; nên sao lưu trước khi nhập dữ liệu vận hành.

## 3. Quy tắc KPI đã chốt

| Vai trò | Data cá nhân | Data công ty | Thưởng thêm |
|---|---:|---:|---|
| Sale | 500.000đ/hồ sơ | 200.000đ/hồ sơ | Từ 20 hồ sơ đủ điều kiện/tháng: thêm 2.000.000đ/người |
| Quản lý | 1.000.000đ/hồ sơ | 200.000đ/hồ sơ | 100.000đ × tổng hồ sơ đủ điều kiện của các sale, cộng 1.000.000đ khi công ty có từ 51 hồ sơ đủ điều kiện/tháng |
| Cộng tác viên | 1.500.000đ/hồ sơ | 0đ | Không thưởng tổng, không thêm điều kiện |

- Sale và quản lý: hồ sơ chốt thành công và có cọc đã xác nhận. Trạng thái hoàn tất tiếp tục giữ KPI của hồ sơ đã chốt.
- CTV: hồ sơ nguồn cá nhân thuộc kỳ ghi nhận được tính mặc định, không yêu cầu cọc/trạng thái; đây là ngoại lệ theo yêu cầu. Nếu không muốn tính một đăng ký CTV thì cần xem lại nghiệp vụ trước khi nhập, không tự áp điều kiện mới.
- Mốc sale tính riêng từng người, gộp hai nguồn. Từ 20 trở lên nhận một lần 2 triệu, không nhân đôi khi có 40 hồ sơ.
- Mốc quản lý từ 51, không phải 50. Tổng công ty gồm tất cả hồ sơ đủ điều kiện trong kỳ; khoản 100k chỉ đếm hồ sơ có chủ sở hữu là sale, không tính hồ sơ riêng quản lý/CTV.
- Nếu có nhiều nhân sự mang vai trò quản lý, mỗi quản lý đều được tính hai khoản thưởng tổng theo cùng công thức. Nếu cần chia quỹ quản lý phải bổ sung chính sách riêng.
- Ngày KPI trên hồ sơ xác định tháng ghi nhận. Người có quyền phải đặt ngày này là ngày hồ sơ đủ điều kiện (sale/quản lý); ngày nhập hồ sơ là giá trị gợi ý, không phải chứng nhận được thưởng.
- Mỗi hồ sơ có ID duy nhất, chỉ đếm một lần. Số điện thoại trùng được chặn trong bản 1 để tránh nhập trùng; đăng ký lại/đổi khóa cần quy trình mở rộng trước khi sử dụng trường hợp đó.
- Phần tỷ lệ % giữ null/để trống, chưa tham gia công thức.
- Thực lĩnh = lương cơ bản + phụ cấp + KPI hồ sơ + thưởng mốc + thưởng hồ sơ sale − khấu trừ − tạm ứng.
- Thay chính sách chỉ tác động bảng lương chưa chốt; kỳ đã chốt lưu bản chụp chính sách và số tiền.
- Chốt kỳ khóa sửa hồ sơ thuộc kỳ. Admin có thể mở lại kỳ chưa trả lương với lý do. Kỳ đã trả không mở lại trong bản này; điều chỉnh sau trả cần theo dõi riêng và đối soát trước khi dùng.

## 4. Thanh toán cho trường

| Gói phí nội bộ | Mức mặc định / hồ sơ |
|---|---:|
| B1 | 6.500.000đ |
| B2 | 7.000.000đ |
| C1 | 8.500.000đ |

Tên B1/B2 là tên gói nội bộ do trung tâm yêu cầu. Trường “Hạng đào tạo” tách riêng để dùng B tự động/B số cơ khí/C1. Không tự suy diễn hạng bằng pháp lý từ gói phí.

- Chọn gói khi tạo hồ sơ, phí trường được lưu cố định theo hồ sơ. Thay bảng phí mặc định không đổi phí hồ sơ cũ.
- Công nợ trường = phí trường theo các hồ sơ được gán trường − tiền đã trả ròng. Bản 1 xem việc gán trường là nghĩa vụ dự kiến, chưa phải chi phí kế toán được ghi nhận.
- Hệ thống giữ công nợ hồ sơ hủy để kế toán đối soát; không tự xóa nghĩa vụ trường. Miễn/giảm phí trường theo thỏa thuận cần xử lý trước khi triển khai nghiệp vụ đó.
- Một hồ sơ có thể trả nhiều lần. Chặn trả vượt mức phí, chặn chứng từ trùng, chặn trường hoàn vượt số đã nhận.
- Lịch sử gồm ngày, trường, hồ sơ, loại giao dịch, số tiền, chứng từ, người xác nhận, ghi chú. Không sửa/xóa lịch sử tiền: dùng giao dịch hoàn có chứng từ mới.
- Sau khi đã trả tiền trường, không đổi tên trường trên hồ sơ.
- Thu học phí và trả trường là hai sổ riêng. Dòng tiền tổng quan cộng cả chi trường. Không gọi tổng thu là lợi nhuận hoặc doanh thu kế toán.

## 5. Phân quyền

- Admin: toàn quyền, tài khoản, chính sách, sao lưu, khôi phục.
- Kế toán: thu chi, lịch thu, trả trường, nhân sự thu nhập, bảng lương.
- Quản lý: hồ sơ toàn trung tâm, công việc; không xem bảng lương/toàn bộ tài chính nếu không dùng tài khoản kế toán/admin.
- Sale/CTV: chỉ hồ sơ mình sở hữu và thông tin thu liên quan, công việc được giao.
- Hồ sơ: xem hồ sơ toàn trung tâm, chỉ cập nhật các trường giấy tờ/bàn giao.
- Đào tạo: xem hồ sơ toàn trung tâm, chỉ cập nhật tiến độ học/thi.

Quyền được kiểm tra tại máy chủ, không chỉ ẩn menu. Bản này chưa có tài khoản học viên, chưa có phân quyền theo chi nhánh, chưa có cơ chế tự đặt lại mật khẩu hoặc khóa tài khoản trong giao diện. Admin cần quản lý tài khoản cẩn thận; không chia sẻ tài khoản quản trị.

## 6. Telegram, Zalo và AI

### Telegram nội bộ đã có luồng gửi

Tạo bot và lấy bot token, lấy chat ID của chính nhóm quản lý trung tâm. Trong Terminal trước khi mở ứng dụng:

```bash
export TELEGRAM_BOT_TOKEN='TOKEN_CUA_BAN'
export TELEGRAM_CHAT_ID='CHAT_ID_CUA_BAN'
npm start
```

Hoặc sao chép `.env.example` thành `.env`, nhập giá trị rồi chạy `start.command`. `npm start` không tự đọc `.env`; dùng biến môi trường như trên. Không gửi token cho người khác.

Máy chủ kiểm tra lịch mỗi phút khi đang chạy. Nhắc trước hạn 3 ngày, 1 ngày, đúng hạn và trễ 3 ngày. Kiểm tra lại công nợ trước khi gửi, một thông báo/mốc/ngày. Gửi thất bại tự thử tối đa 3 lần; xem lỗi tại Cài đặt. Tin Telegram hiện gửi nhóm nội bộ, không tự gửi đến học viên. Nếu máy tắt/đóng ứng dụng, nhắc lịch dừng và không bù tất cả mốc đã bỏ qua.

Lịch thu được phân bổ theo thứ tự ngày đến hạn, dựa trên tiền đã thu ròng. Nên gộp các kỳ cùng ngày cho một học viên thành một dòng.

### Chưa kết nối trong bản này

- Zalo: chưa gửi; cần tài khoản doanh nghiệp, mẫu thông báo được duyệt và thông tin tích hợp thực tế để xây adapter phù hợp. Không mô phỏng trạng thái “đã gửi”.
- AI: chưa gọi nhà cung cấp, không thu thập API key. Tổng quan đang dùng phép tính dữ liệu có thể kiểm tra. Sau khi chọn nhà cung cấp và phạm vi truy cập sẽ bổ sung trợ lý.
- Không có kết nối DAT, ngân hàng hoặc cổng trường. Dữ liệu từ trường được nhập tay, có nơi ghi nguồn đối soát.

## 7. Lưu trữ, sao lưu và bảo mật

- Chỉ lắng nghe 127.0.0.1, mặc định localhost:3000. Điện thoại/máy nhân viên khác chưa truy cập được. Đừng đổi sang 0.0.0.0 hoặc đưa ra Internet trước khi bổ sung HTTPS, cơ chế quản trị tài khoản và kiểm tra bảo mật.
- SQLite: `data/center.sqlite`; có thể xuất JSON trong Cài đặt. Sao lưu chứa mật khẩu đã băm và dữ liệu cá nhân; cất riêng an toàn.
- Mật khẩu băm scrypt, session HttpOnly/SameSite, hết hạn sau 8 giờ. Không có mật khẩu mặc định. Chống yêu cầu khác nguồn và giới hạn thử đăng nhập.
- Khôi phục JSON sẽ thay toàn bộ dữ liệu, đăng xuất mọi tài khoản. Ứng dụng tự giữ tệp SQLite trước khôi phục trong data. Không sửa hoặc nhập tệp sao lưu không rõ nguồn.
- Trước khi chép cả thư mục data, dừng ứng dụng để tránh bỏ sót tệp WAL. Không xóa data khi nâng cấp.
- Xuất CSV tương thích Excel, bảo vệ ô bắt đầu bằng ký tự công thức.
- Chứng từ giấy tờ hiện lưu mã/tham chiếu và nội dung; chưa tải file ảnh/PDF lên ứng dụng.

## 8. Kiểm tra

```bash
npm test
```

Có kiểm tra công thức KPI tại mốc 19/20, 50/51, ngoại lệ CTV, tách tháng; kiểm tra API về đăng nhập, phân quyền, xác nhận cọc, thanh toán trường, trùng chứng từ, vượt phí, chốt kỳ, sao lưu và khôi phục. Không sử dụng dữ liệu thật, test chạy cơ sở dữ liệu tạm và xóa sau khi xong.

## 9. Cấu trúc mã nguồn

- `server.mjs`: HTTP, SQLite, tài khoản, quyền, giao dịch, công nợ, lịch nhắc, sao lưu.
- `kpi.mjs`: chính sách và công thức tính KPI.
- `public/`: giao diện tiếng Việt, không cần biên dịch.
- `test/`: kiểm tra tự động.
- `start.command`: mở ứng dụng trên macOS.

Đây là bản chức năng đầu tiên để chạy thử quy trình, không phải hệ thống tích hợp đầy đủ Zalo/AI. Trước khi nhập dữ liệu vận hành, thử các trường hợp thực tế với người phụ trách kế toán và hồ sơ.

## Ghi nhận kiểm thử bản giao

Các bài kiểm tra tự động và kiểm tra cú pháp đã đạt trên Node.js 24.22.1/Linux. Chưa chạy trực tiếp trên MacBook của người dùng. Kiểm tra giao diện bằng trình duyệt tự động trong môi trường tạo gói bị chặn bởi hạn chế hệ thống; cần mở localhost trên MacBook để nghiệm thu hiển thị và thao tác thực tế.

## Cập nhật 1.0.1 — thông tin học viên

- Số điện thoại và số CCCD bắt buộc khi lưu hồ sơ. CCCD lưu kiểu chuỗi, đủ 12 chữ số, giữ nguyên số 0 đầu.
- Hồ sơ cũ không bị xóa; hiển thị nhãn “Thiếu CCCD”. Bổ sung CCCD tại Tuyển sinh hoặc Hồ sơ & bàn giao trước khi lưu cập nhật khác. Hồ sơ thuộc kỳ đã chốt cần admin mở lại kỳ chưa trả theo quy trình có sẵn; không tự mở khóa kỳ lương.
- Không đưa số CCCD vào thông báo Telegram hoặc danh sách tổng quan; xem tại biểu mẫu hồ sơ theo quyền truy cập.
- Nâng cấp MacBook: xuất sao lưu trong Cài đặt, dừng ứng dụng (Control+C), giải nén bản mới ở thư mục riêng. Chép đè `server.mjs`, `public/app.js`, `package.json` vào đúng vị trí trong thư mục đang sử dụng. Giữ nguyên thư mục `data` và cấu hình Telegram. Sau đó `npm start`, tải lại trang bằng Command+Shift+R.

## Cập nhật 1.0.2 — cấp tài khoản

Chỉ Admin và Quản lý có mục Cấp tài khoản. Quản lý thêm nhân sự Sale/CTV và cấp tài khoản cho họ; không cấp Admin, Quản lý hoặc tài khoản bộ phận tài chính. Admin cấp mọi vai trò. Mỗi nhân sự có tối đa một tài khoản. Quản lý không xem thu nhập cố định của nhân sự khác, không sửa lương khi tạo nhân sự. Không có đăng ký công khai sau lần thiết lập Admin đầu tiên. Nâng cấp bằng cùng ba tệp như bản 1.0.1, giữ nguyên data và biến môi trường Telegram.

## Cập nhật 1.0.3 — đồng bộ lương/KPI và điện thoại

Phần này thay thế mô tả cũ về kỳ KPI:

- Sale/quản lý: tháng tính KPI là tháng của ngày muộn hơn giữa ngày chốt và ngày nhận khoản cọc đầu tiên được xác nhận trong sổ thu. Nếu chốt tháng 10, nhận cọc tháng 11 thì tính KPI tháng 11. CTV vẫn dùng ngày ghi nhận riêng, không thêm điều kiện.
- Ngày chốt được giữ khi chuyển hồ sơ sang trạng thái chốt/hoàn tất, dùng ngày trên biểu mẫu làm ngày chốt. Hồ sơ cũ dùng ngày KPI cũ làm ngày chốt nếu chưa có wonDate. Cần sửa ngày cũ nếu trước đây nhập sai; phần mềm không đoán lại lịch sử thật.
- Bảng lương hiển thị toàn bộ nhân sự, gồm hồ sơ/đào tạo/kế toán (các vai trò này nhận phần lương cố định, không tự thêm KPI).
- Có bảng đối soát từng hồ sơ: ngày tính, khoản cọc, có được tính trong kỳ đang chọn hay không và lý do. Bảng lương mở tự cập nhật mỗi 15 giây khi không mở biểu mẫu.
- Kỳ đã chốt vẫn giữ bản chụp; không tự sửa lương đã trả. Đây là bảo toàn kỳ lương, không phải mất đồng bộ.

### Truy cập điện thoại cùng Wi-Fi

Sau khi cập nhật, dừng ứng dụng rồi chạy trong Terminal đang có cấu hình Telegram:

```bash
cd /Users/thuha/Downloads/driving-center
npm run lan
```

Terminal sẽ in dòng “Điện thoại cùng Wi-Fi: http://192.168.…:3000” (IP thực tế có thể khác). Mở chính địa chỉ đó trong Safari/Chrome trên điện thoại, đăng nhập bằng tài khoản đã được cấp. Không nhập localhost trên điện thoại. Máy tính và điện thoại phải cùng Wi-Fi, không dùng mạng khách tách thiết bị. Nếu macOS hỏi quyền mạng cục bộ, cho phép ứng dụng nhận kết nối theo nhu cầu này. MacBook phải bật, không ngủ và ứng dụng đang chạy.

Nếu không hiện IP, mở Cài đặt hệ thống → Wi-Fi → Chi tiết mạng đang kết nối để xem địa chỉ IP. Không cấu hình chuyển tiếp cổng router. Chế độ này dùng HTTP trong mạng nội bộ tin cậy, chưa mã hóa đường truyền; nếu cần đăng nhập qua 4G hoặc truy cập từ xa, cần bổ sung HTTPS cùng máy chủ hoặc mạng riêng.

Cài đặt: sao lưu, dừng ứng dụng, chép đè **bốn** tệp `server.mjs`, `kpi.mjs`, `package.json`, `public/app.js`. Giữ nguyên `data` và cấu hình Telegram. Mở lại và tải mới giao diện.

## Cập nhật 1.0.4 — tải lên Excel chứa thông tin học viên

### Nâng cấp

Sao lưu và dừng ứng dụng. Từ gói mới, chép đè `server.mjs`, `kpi.mjs`, `package.json`, `public/app.js` và **chép thêm `importer.mjs`** cùng thư mục với server.mjs. Giữ nguyên data và cấu hình Telegram. Chạy `npm start` hoặc `npm run lan`, tải mới trang. Không cần npm install hoặc thư viện bổ sung.

### Cách nhập

1. Đăng nhập Admin → **Nhập file Excel**. Nhập hàng loạt kèm lịch sử tiền chỉ dành cho Admin; nhân viên không được tự nhập sổ thu hàng loạt.
2. Chọn .xlsx/.csv/.tsv (không hỗ trợ .xls cũ, file mã hóa/mật khẩu hoặc XLSM). Tối đa 6 MB/file, 1.000 học viên/lần. Cấu trúc XLSX tiêu chuẩn được đọc trực tiếp; nếu file đặc thù đọc lỗi, lưu một bản XLSX đơn giản hoặc CSV UTF-8. Không gửi file ra Internet.
3. Chọn sheet và dòng tiêu đề (trong 40 dòng đầu), kiểm tra ghép cột. Có thể tải mẫu CSV và mở bằng Excel. Sheet phải có hàng tiêu đề, không dùng tiêu đề nhiều tầng/gộp ô.
4. Ghép mã học viên, họ tên, CCCD, điện thoại, hạng/gói, hồ sơ, khóa, tiến độ, học phí, người phụ trách, nguồn, trường, còn phải thu, tối đa 4 cặp số tiền/ngày thu. Chọn rõ năm cho ngày thiếu năm (ví dụ 10/8). Số tiền tính bằng đồng, dùng số nguyên hoặc dạng 18,000,000 / 18.000.000; không dùng 18tr/18.5 triệu.
5. Nếu thiếu cột nguồn/trường thì có thể chọn giá trị chung. Chọn người phụ trách chung sẽ ghi đè người phụ trách trên toàn bộ file; nếu mỗi dòng là người khác, để chế độ đối chiếu tên và tạo nhân sự tương ứng trước. Không tự tạo nhân sự, đoán vai trò hoặc đoán nguồn.
6. Xem trước và kiểm tra. Dữ liệu chưa được đưa vào sổ học viên ở bước này.
7. Xác nhận: dòng hợp lệ thành học viên, các khoản tiền thành phiếu thu lịch sử (khoản thu đầu tiên đánh dấu cọc); dòng lỗi lưu riêng ở danh sách chờ. Dòng chờ không tham gia KPI/công nợ và không tự sinh thông báo học phí.
8. Trong danh sách chờ, nhấn Bổ sung để sửa thông tin, ngày thu, nguồn và người phụ trách, rồi nhập chính thức. Dòng trùng với học viên có sẵn phải đối soát riêng, không ghi đè tự động.

### Bảo toàn dữ liệu

- Mã học viên gốc lưu ở `externalCode`; ID kỹ thuật dùng riêng để tránh ghi đè.
- Chặn trùng mã, CCCD hoặc điện thoại trong file và dữ liệu đã nhập. Hai người trùng tên nhưng khác thông tin định danh không tự gộp.
- CCCD/điện thoại nên đặt kiểu Text trong Excel trước khi nhập; số 0 đầu đã mất trong file không tự phục dựng. Nếu ô có định dạng đầy đủ số 0 (000000000000), bộ đọc giữ phần số 0 theo định dạng đó.
- Ô công thức không được tự tính hoặc tin vào giá trị lưu tạm: chuyển thành Values trong bản sao Excel trước khi nhập. Lỗi được đưa vào danh sách chờ.
- Kiểm tra ngày hợp lệ, thu không vượt học phí và công nợ có khớp hay không. Thiếu ngày của khoản thu không tự điền ngày hôm nay.
- Khi có khoản thu, bản nhập lịch sử mặc định xem hồ sơ đã chốt; ngày chốt theo khoản thu đầu tiên trong các cột. Xếp các lần thu đúng thứ tự thời gian. Nếu không phải hồ sơ đã chốt thì cần chỉnh dữ liệu trước khi xác nhận.
- Quy ước B1 → B tự động; B2 → B số cơ khí; C1 → C1 chỉ áp dụng cho gói nội bộ của dữ liệu nhập, phải kiểm tra thực tế. Nâng D và hạng ngoài danh mục sẽ giữ chờ, không tự đổi sang C1.
- Tiến độ học gốc giữ trong ghi chú; DAT chỉ đánh dấu chưa đối soát, không tự tạo giờ/km hoặc kết quả đạt.
- Phí trường áp dụng bảng mặc định theo gói tại lúc nhập. Các khoản thu học viên không được chuyển thành lịch sử trả trường.
- Nhập toàn bộ trong giao dịch SQLite; sự cố trước khi hoàn tất sẽ rollback. Chặn nhấn nhập lại cùng lần xem trước. Lần xem trước mới kiểm tra lại trùng với dữ liệu hiện có.
- Giữ bản gốc đã tải lên, bản xem trước và dòng chờ trong cơ sở dữ liệu để đối soát; bản sao lưu sẽ chứa thông tin này. Không gửi tệp sao lưu ra ngoài nếu không được phép.

Kiểm thử bổ sung: đọc XLSX với shared strings/ngày/định dạng số 0; CSV có dấu phẩy; thiếu ngày; lịch sử tiền; nhập thành công; dòng chờ; bổ sung dòng chờ; chống nhập lặp; kiểm tra quyền Admin.

## Cập nhật 1.0.5 — quy trình thu chi, trường cố định và bot Telegram

Phần này là cấu hình mới nhất, thay thế các mô tả cũ có khác biệt.

### Cài bản cập nhật

1. Trong Cài đặt xuất sao lưu, dừng ứng dụng bằng Control+C.
2. Chép đè các file mã nguồn từ bản mới: `server.mjs`, `kpi.mjs`, `importer.mjs`, **`finance.mjs`**, `package.json`, `public/app.js`, `public/style.css`; chép thêm thư mục **`imports`**. Không thay thế `data`, không xóa `telegram-config.json` trong data nếu có.
3. Chạy `npm start` hoặc `npm run lan`. Tải lại trang bằng Command+Shift+R.
4. Gói cập nhật này chứa bản chụp dữ liệu học viên do chính người dùng cung cấp, gồm CCCD/điện thoại. Không chia sẻ gói ra công khai.

### Học phí 3 đợt

- Thêm Khóa học và Ngày khai giảng vào bảng tuyển sinh. Hồ sơ mới chọn đợt 1 trong 2,5 / 7,5 / 8,5 / 9,5 triệu. Đây là kế hoạch thu, không tự ghi tiền đã nhận.
- Đợt 2: B1/B2 5 triệu, C1 7 triệu; hạn là ngày khai giảng +25 ngày. Thiếu ngày khai giảng thì chưa sinh hạn, không đoán.
- Đợt 3: số học phí còn lại sau đợt 1 và 2, kích hoạt khi Admin/Đào tạo nhấn Xác nhận đủ km DAT. Khoản còn phải thu trừ toàn bộ tiền đã thu ròng nên không nhắc lại khoản đã trả trước.
- Thu tiền tại Thu chi & học phí. Phân bổ theo thứ tự đợt 1 → 2 → 3, kể cả tiền nhận nhiều lần. Hoàn tiền làm giảm số đã thu ròng.
- Admin/Kế toán nhấn “Xác nhận đủ đợt 2” chỉ khi sổ thu đã đủ tổng đợt 1 +2 và hồ sơ chốt. Hệ thống tạo một yêu cầu đăng ký DAT cho mỗi học viên. Đây là yêu cầu nhân sự đăng ký, không phải xác nhận trường đã đăng ký xong.
- Xác nhận đủ DAT là xác nhận nghiệp vụ thủ công có người xác nhận và ngày; phần mềm chưa nối thiết bị DAT, không tự suy ra đủ km từ chữ “DAT” trong file nguồn.
- Nhắc đợt 2/3 vào trước hạn 3 ngày, trước 1 ngày, đúng hạn, trễ 3 ngày; chỉ khi còn tiền thiếu. Không gửi nhắc đợt 3 trước khi có xác nhận DAT.
- Với hồ sơ lịch sử đã có trước cập nhật: không tự chọn lại mức đợt 1 hoặc khai giảng. Bổ sung kế hoạch theo thực tế trước khi dùng nhắc ba đợt. Lịch thủ công cũ chỉ tiếp tục nhắc với hồ sơ chưa chuyển sang kế hoạch ba đợt.
- Các khoản thu tiếp theo không đánh dấu cọc vẫn nhập được sau khi kỳ KPI đầu tiên đã chốt. Điều chỉnh cọc ảnh hưởng KPI kỳ đã chốt vẫn bị chặn để đối soát.

### Chi phí vận hành

Menu riêng: Ngày chi, Lý do chi, Người chi, Số tiền đã chi và tổng chi. Mỗi giao dịch có mã chứng từ duy nhất để chống trùng, dùng chung sổ chi với dòng tiền, không cộng lặp. Các khoản cũ giữ nguyên; thiếu người chi dùng người đã xác nhận để tra cứu, không sửa lịch sử gốc.

### Thanh toán trường

- Trường nhận hồ sơ cố định: Sát Hạch Lái Xe Hưng Thịnh; bỏ lựa chọn trường mới.
- Lịch bắt buộc đối soát và nộp các khoản còn nợ: ngày 1 và25 hằng tháng. Màn hình liệt kê toàn bộ hồ sơ còn nợ và kỳ tiếp theo. Ngày 1/25 tạo thông báo tổng nợ; không tự chuyển tiền hay ghi đã nộp.
- Bắt buộc hình thức Chuyển khoản/Tiền mặt và ngày nộp thực tế. Vẫn cho ghi ngày thực tế ngoài kỳ để lưu đúng việc nộp sớm/chậm, không sửa ngày để khớp lịch.
- Phí mặc định B1 6,5 triệu; B2 7 triệu; C1 8,5 triệu. Lịch sử cũ giữ nguyên hình thức nếu chưa có, hiển thị “Chưa bổ sung” thay vì tự đoán.
- Khi nâng cấp, tên trường trên hồ sơ chuyển sang mặc định, tên cũ giữ trong previousSchool; lịch sử giao dịch gốc không bị ghi đè.

### Cấu hình Telegram trên giao diện

Mở **http://localhost:3000 trên MacBook**, đăng nhập Admin → Cài đặt & sao lưu:

1. Tạo bot riêng tại @BotFather bằng /newbot, hoặc dùng bot đã tạo. Nếu token cũ từng lộ, dùng token mới sau khi /revoke. Không gửi token vào ChatGPT.
2. Nhấn Cấu hình bot Telegram, nhập token mới. Có thể để trống Chat ID lần đầu. Nhấn Lưu: ứng dụng kiểm tra getMe thực tế.
3. Trong Telegram mở bot gửi /start; hoặc thêm bot vào nhóm riêng rồi gửi /start@username_bot.
4. Nhấn Lấy danh sách nơi nhận, chọn đúng cuộc trò chuyện/nhóm, Lưu.
5. Nhấn Gửi tin thử, xác nhận gửi, mở Telegram kiểm tra.
6. Nhấn Kiểm tra và gửi thông báo đến hạn; xem sent/pending/failed và nội dung lỗi. Không có lịch đến hạn thì không có nhắc học phí để gửi; tin thử dùng để kiểm tra kết nối độc lập.

Token lưu riêng `data/telegram-config.json` với quyền file giới hạn, không trả về giao diện, không nằm trong sao lưu JSON hoặc gói mã nguồn. Chỉ cho nhập token qua localhost trên MacBook để tránh gửi token qua Wi-Fi HTTP. Biến môi trường cũ là nguồn dự phòng nếu chưa lưu cấu hình mới. Máy phải có Internet, bật ứng dụng và không ngủ. Tin nhắn gửi vào nơi nhận nội bộ đã chọn, không tự gửi riêng từng học viên; không kèm CCCD/điện thoại.

### Nạp dữ liệu từ Google Sheets đã cung cấp

- Nguồn: https://docs.google.com/spreadsheets/d/1NwtwBkeG9od86xI3BXBwQPzUeVFMm3a1oNr-caJ8_B0/edit, sheet TỔNG.
- 34 hồ sơ có tên, tổng học phí 588.700.000đ, đã thu 301.400.000đ, còn phải thu 287.300.000đ. Bỏ các dòng chỉ có mã dự phòng nhưng chưa có tên. Các tab báo cáo tháng không nhập lặp học viên.
- Admin vào Nhập file Excel → **Nạp 34 hồ sơ từ bảng Hưng Thịnh**. Dữ liệu được đưa vào danh sách chờ bổ sung, giữ mã/giấy tờ/khóa/tiến độ/lịch sử tiền/ghi chú. Không đoán nguồn data, không tự tạo nhân sự theo vai trò chưa chốt.
- Nhấn Bổ sung từng dòng để điền phần thiếu và chọn đúng nhân sự, nguồn data rồi nhập vào sổ chính. Thiếu ngày khoản thu, CCCD/điện thoại, hạng ngoài danh mục sẽ không đưa vào sổ chính hoặc KPI. Không ghi đè hồ sơ trùng; nhấn nạp lần nữa không lặp bản chụp này.
- Dữ liệu ở gói là bản chụp, chưa đồng bộ liên tục với Google Sheets.
- Nhật ký thanh toán trường gốc giữ nguyên trong phần nguồn để đối soát, chưa tự phân bổ cho từng học viên. Vùng H2:O5 được giữ cả giá trị và công thức gốc. H3=228tr; I3:M3 cộng175,4tr; N3=SUM(I3:M3); O3=N3-H3=-52,6tr. Cách người dùng mô tả N3 khác với công thức/nhãn gốc nên chưa chuyển thành số dư sổ trường cho đến khi xác nhận.
- Các khoản nhật ký trường chi tiết cộng140,2tr và chưa đủ ngày/hình thức/phân bổ ở một số dòng, khác tổng175,4tr. Không cộng cả hai nguồn vào dòng tiền để tránh ghi trùng.

### Kiểm thử

Kiểm tra tự động gồm: ba đợt học phí, +25 ngày qua tháng, mốc1/25 qua năm, chi phí bắt buộc lý do/người chi, xác nhận đợt2 đủ tiền, không tạo trùng yêu cầu DAT, kích hoạt đợt3, nạp34 hồ sơ và chống lặp, nhập Excel/CSV, phân quyền, KPI và sao lưu. Chưa kiểm thử gửi Telegram thật do chưa có token/Chat ID được nhập an toàn trong ứng dụng của người dùng; chưa truy cập được dữ liệu SQLite trên MacBook.

### Cập nhật dễ hơn bằng một lệnh

Sau khi dừng server, mở Terminal mới, gõ `zsh ` rồi kéo tệp `cap-nhat.command` của thư mục mới giải nén vào, nhấn Enter. Script sao lưu toàn bộ ứng dụng cũ trong Downloads, chép đúng các tệp mới vào `~/Downloads/driving-center`, giữ data/token. Nếu app nằm nơi khác thì script sẽ dừng thay vì đoán. Nó kiểm tra cổng3000; nếu đang dùng cổng khác, phải tự dừng ứng dụng trước để sao lưu đúng SQLite. Sau đó về Terminal chạy ứng dụng cũ để giữ biến môi trường và chạy `npm run lan`.
