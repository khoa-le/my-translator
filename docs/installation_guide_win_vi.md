# Hướng dẫn cài đặt — Windows

Hướng dẫn từng bước cài đặt và sử dụng **My Translator** trên Windows 10/11.

---

## Yêu cầu

- Windows 10 trở lên (x64 hoặc ARM64)
- API key từ [Soniox](https://soniox.com) (trả theo dùng, ~$0.12/giờ)
- **Thuyết minh TTS** (tuỳ chọn): Xem [Hướng dẫn TTS](tts_guide_vi.md) để chọn nhà cung cấp (Edge TTS miễn phí, không cần API key)

---

## Bước 1 — Tải xuống

Tải file `.exe` mới nhất tại: [**Releases — Windows**](https://github.com/phuc-nt/my-translator/releases/latest)

Chọn phiên bản phù hợp:
- **x64** — Đa số PC Windows (Intel/AMD)
- **arm64** — Windows trên ARM (Surface Pro X, laptop Snapdragon)

---

## Bước 2 — Bỏ qua SmartScreen

> ⚠️ Ứng dụng chưa có chữ ký số. Windows SmartScreen sẽ chặn lần chạy đầu tiên.

Khi thấy màn hình **"Windows protected your PC"**:

1. Nhấn **"More info"** (Thêm thông tin)

![SmartScreen — nhấn More info](user_manual_win/mytrans_win_01.png)

2. Nhấn **"Run anyway"** (Vẫn chạy)

![Nhấn Run anyway](user_manual_win/mytrans_win_02.png)

---

## Bước 3 — Cài đặt

Trình cài đặt sẽ hướng dẫn bạn:

1. Nhấn **Next** để bắt đầu

![Welcome to My Translator Setup](user_manual_win/mytrans_win_03.png)

2. Chọn thư mục cài đặt (để mặc định là được) → nhấn **Next**

![Chọn thư mục cài đặt](user_manual_win/mytrans_win_04.png)

3. Đợi cài đặt hoàn tất → nhấn **Next**

![Cài đặt hoàn tất](user_manual_win/mytrans_win_05.png)

4. Tích **"Run My Translator"** → nhấn **Finish**

![Hoàn thành — Chạy My Translator](user_manual_win/mytrans_win_06.png)

---

## Bước 4 — Cấu hình API Key và ngôn ngữ

Ứng dụng mở lên. Nhấn ⚙️ để mở **Settings** (Cài đặt).

Cấu hình:

1. **SONIOX API KEY** — Dán API key (Bắt buộc)
2. **Source** — Chọn ngôn ngữ nguồn (hoặc để Auto-detect - tự nhận diện)
3. **Target** — Chọn ngôn ngữ đích (VD: Vietnamese, English...)
4. **Audio Source** — Chọn System Audio (âm thanh máy tính) hoặc Microphone

![Settings — API Key và ngôn ngữ](user_manual/mytrans_setting_1.png)

Kéo xuống để xem thêm tuỳ chọn:

- **Font Size** — Điều chỉnh cỡ chữ
- **Max Lines** — Số dòng hiển thị tối đa
- **Show original text** — Hiện text gốc bên cạnh bản dịch
- **Custom Context** — Thêm lĩnh vực/thuật ngữ để dịch chính xác hơn

![Settings — TTS Narration](user_manual/mytrans_setting_2.png)

Nhấn **Save & Close** khi xong.

> 💡 **Lấy API key Soniox ở đâu?**
> 1. Vào [console.soniox.com](https://console.soniox.com) → tạo tài khoản
> 2. Nạp tiền ($10 tối thiểu, dùng rất lâu với ~$0.12/giờ)
> 3. Vào **API Keys** → tạo và copy key

![Soniox Console — Billing](user_manual/mytrans_key_1.png)

---

## Bước 5 — Bật Thuyết Minh TTS (Tuỳ chọn)

Muốn bản dịch được **đọc thành lời**? Có 3 nhà cung cấp:

| Nhà cung cấp | Chi phí | Chất lượng | Cài đặt |
|---------------|---------|------------|---------|
| 🎙️ **Edge TTS** | Miễn phí | Tự nhiên | Không cần gì |
| 🌐 **Google Chirp 3 HD** | Free 1M ký tự/tháng | Gần giọng người | Cần Google Cloud API key |
| ✨ **ElevenLabs** | ~$5/tháng trở lên | Cao cấp | Cần ElevenLabs API key |

### Cài nhanh (Edge TTS — miễn phí):

1. Settings → tab **TTS** → Provider: **Edge TTS**
2. Chọn giọng → **Save & Close**
3. Trên màn hình chính, bấm nút **TTS** (hoặc `Ctrl+T`) để bật

### Google hoặc ElevenLabs:

Xem [Hướng dẫn TTS](tts_guide_vi.md) để biết cách lấy API key từng bước.

> ⚠️ **Windows: dùng tai nghe khi ở chế độ one-way.** Trên Windows, việc bắt âm thanh hệ thống hiện cũng bắt luôn TTS của chính app, dễ tạo vòng lặp feedback (TTS bị bắt lại và dịch lại). Dùng tai nghe để tránh. Chế độ two-way tự tắt TTS nên không bị ảnh hưởng.

> 💡 TTS **mặc định TẮT** mỗi lần mở app — bật bằng nút TTS hoặc `Ctrl+T`. Nếu không dùng, app vẫn hoạt động bình thường — chỉ dịch text.

---

## Bước 6 — Bắt đầu dịch!

Nhấn ▶ để bắt đầu. Ứng dụng sẽ hiện **Listening...**

Giờ phát bất kỳ âm thanh nào trên PC (YouTube, Zoom, podcast...) và bản dịch sẽ xuất hiện theo thời gian thực!

Nếu TTS đã bật, bạn có thể bật/tắt bằng nút **TTS** hoặc `Ctrl+T`.

![App đang dịch với TTS bật](user_manual/mytrans_tts_1.png)

---

## Mẹo sử dụng

- **System Audio** bắt tất cả âm thanh đang phát trên PC — không cần virtual cable
- **Microphone** bắt giọng nói trực tiếp từ mic
- **TTS** đọc bản dịch thành lời — bật/tắt bằng nút TTS hoặc `Ctrl+T`
- Ứng dụng hoạt động như **overlay** — kéo thả tự do, thay đổi kích thước tuỳ ý
- Bản dịch được **lưu tự động** — nhấn 📋 để xem file transcript

---

## Phím tắt

| Phím tắt | Chức năng |
|----------|-----------|
| `Ctrl+Enter` | Bắt đầu / Dừng |
| `Ctrl+,` | Mở Settings |
| `Esc` | Đóng Settings |
| `Ctrl+1` | Chuyển sang System Audio |
| `Ctrl+2` | Chuyển sang Microphone |
| `Ctrl+3` | Chuyển sang Both (System + Mic) |
| `Ctrl+T` | Bật/tắt thuyết minh TTS |
| `Ctrl+M` | Thu nhỏ cửa sổ |
| `Ctrl+P` | Bật/tắt Always-on-Top (ghim) |
| `Ctrl+D` | Bật/tắt chế độ Compact |

---

## Khắc phục sự cố

### SmartScreen chặn trình cài đặt
→ Nhấn **"More info"** → **"Run anyway"** (xem Bước 2).

### Không hiện bản dịch
→ Kiểm tra API key Soniox đã đúng trong Settings (⚙️).

### Không bắt được âm thanh hệ thống
→ Đảm bảo đang phát audio trên PC. Một số ứng dụng dùng exclusive audio mode — thử nguồn audio khác.

### Ứng dụng không mở
→ Đảm bảo WebView2 Runtime đã cài. Windows 10/11 thường có sẵn, nhưng phiên bản cũ cần cài từ [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

## Cập nhật

My Translator có tính năng **tự động cập nhật**. Khi có bản mới:

1. **Badge xanh** xuất hiện trên icon ⚙️ Settings
2. Mở Settings → tab **About** → bấm **Download & Install**
3. App sẽ tự khởi động lại với bản mới

Không cần tải installer thủ công cho các bản cập nhật sau!
