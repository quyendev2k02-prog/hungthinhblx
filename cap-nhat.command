#!/bin/zsh
set -e
source_dir="$(cd "$(dirname "$0")" && pwd)"
target_dir="${1:-$HOME/Downloads/driving-center}"
if [ ! -f "$target_dir/server.mjs" ]; then
  echo "Không tìm thấy ứng dụng tại: $target_dir"
  echo "Giữ cửa sổ này và hỏi lại người hỗ trợ để chọn đúng thư mục; chưa thay đổi dữ liệu."
  read "?Nhấn Enter để đóng..."
  exit 1
fi
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Cổng 3000 đang chạy. Quay về Terminal ứng dụng nhấn Control+C rồi chạy cập nhật lại."
  read "?Nhấn Enter để đóng..."
  exit 1
fi
backup_dir="$HOME/Downloads/ghi-danh-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
cp -R "$target_dir/." "$backup_dir/"
if [ "$source_dir" != "$(cd "$target_dir" && pwd)" ]; then
  for file in server.mjs kpi.mjs importer.mjs finance.mjs payroll-state.mjs handover.mjs attendance.mjs courses.mjs package.json README.md HTBLXV01.md start.command; do
    cp "$source_dir/$file" "$target_dir/$file"
  done
  mkdir -p "$target_dir/public" "$target_dir/imports" "$target_dir/test"
  cp "$source_dir/public/"* "$target_dir/public/"
  cp "$source_dir/imports/"* "$target_dir/imports/"
  cp "$source_dir/test/"* "$target_dir/test/"
fi
chmod +x "$target_dir/start.command"
echo "Đã cập nhật htblxv01 (1.3.0). Dữ liệu và cấu hình Telegram được giữ nguyên."
echo "Bản sao dự phòng: $backup_dir"
echo "Quay về Terminal ứng dụng, chạy npm run lan."
read "?Nhấn Enter để đóng..."
