# Modular Telegram Mini App Bot (JavaScript)

## Menjalankan

1. Buat `.env` dan isi kredensial Telegram yang diperlukan: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_ID`, `TELEGRAM_API_ID`, dan `TELEGRAM_API_HASH`.
2. Jalankan `npm install`.
3. Pastikan browser Chromium Playwright sudah tersedia sesuai konfigurasi environment.
4. Jalankan `npm start` (atau `npm run dev`).

Semua command aplikasi dijalankan melalui bot Telegram long polling. `TELEGRAM_OWNER_ID` membatasi bot ke pesan private dari akun owner; bot token dan owner ID wajib diisi. Nama lama `TELEGRAM_TOKEN_BOT` dan `TELEGRAM_USER_ID` tetap didukung. Saat session MTProto belum tersedia, startup meminta nomor telepon, kode login, dan password 2FA melalui terminal untuk membuat `.teleproto-session`; setelah session tersimpan, interaksi command sepenuhnya melalui Telegram.

Sesi Telegram user (`.teleproto-session`), `config/config.json`, dan folder `data/` perlu disimpan secara persisten saat aplikasi dipindahkan ke VPS. Bot menjalankan satu command pada satu waktu; prompt yang menunggu jawaban berakhir setelah 10 menit dan dapat dibatalkan dengan `/cancel`.

## Menambah service

Buat file JavaScript baru di `src/services/`, misalnya `src/services/example.js`, lalu export default object dengan `name`, `commands`, dan `execute(ctx)`:

```ts
const example = {
  name: "example",
  commands: ["/example"],
  async execute(ctx) {
    const value = await ctx.prompt.question("Input: ");
    ctx.logger.info(`Input diterima (${value.length} karakter).`);
  },
};

export default example;
```

Loader otomatis memindai file `.js` di `src/services/` saat aplikasi dimulai. Tidak perlu menambahkan import atau mengubah `index.js`. Command duplikat atau service yang tidak sesuai kontrak akan menghasilkan error saat startup.

## Catatan

- Service yang memerlukan Telegram client dapat menggunakan `ctx.client`.
- Input service dikelola melalui prompt Telegram dan dapat dibatalkan dengan `/cancel`.
- `/setconfig` memakai inline button untuk mengubah key yang tersedia di `CheckoutConfig` dan `dealsConfig`; perubahan disimpan ke `config/config.json` dan dipakai pada transaksi berikutnya.
- `/checkkout` meminta qty, variasi, dan ongkir. Setelah pesanan berhasil, pilihan disimpan di `data/checkout-preferences.json` dan dapat digunakan ulang pada checkout berikutnya.
- Logic checkout berada di `src/services/deals.js`; urutan request dan langkah checkout di dalam fungsi `checkoutDeals` dipertahankan.
- Fitur angpao belum dibuat, sesuai permintaan.
- Aplikasi menggunakan JavaScript ESM bawaan Node.js; tidak memerlukan transpiler.
- Mode deals memilih quantity dan URL dari saldo koin. Isi `dealsConfig.url_deals_25k` dan `dealsConfig.url_deals_50k` di `config/config.json` dengan URL voucher yang sesuai sebelum menjalankan `/deals`.
- `/startDrama` mendukung mode cookie atau Excel. Mode Excel membaca file `.xlsx` di `data/`, memakai baris pertama sheet pertama sebagai header, dan melewati baris tanpa username atau cookie; nomor HP bersifat opsional.
- `/startDrama` langsung meminta `fetch_coin_missions` tanpa `validate_cookie`. Mode cookie meminta username akun untuk parameter request; antrean Excel melewati baris tanpa username atau cookie.
- `/wdDramaTRY` juga melewati baris tanpa username atau cookie; nomor HP bersifat opsional.
- `/wdDrama` mengecek `can_withdrawal_today` dari `fetch_coin_missions`; jika tersedia, menarik nominal terbesar dari `withdrawal_options` menggunakan `withdraw_drama_coins`.
- `/cancelorder` memilih akun dari `get_order_accounts`, mengambil semua halaman `fetch_shopee_orders`, lalu membatalkan satu per satu pesanan dengan status `label_to_ship`.
- `/wdDrama` mengecualikan username di `data/wddrama-blackhole.json` dari antrean Excel dan menolak penarikan mode cookie untuk username tersebut. Username otomatis ditambahkan setelah penarikan sukses jika `withdrawal_balance - withdrawn_amount < 1000`, atau jika tidak ada opsi yang memenuhi `withdrawal_balance`.
- `/wdDramaTRY` langsung memanggil `fetch_coin_missions` tanpa `validate_cookie`; mode cookie meminta username agar request dan pengecekan blackhole tetap memiliki identitas akun.
- `/getDramaTask` menjalankan action `get_worker_tasks` dan menyimpan response ke `data/drama_task.json`; dashboard renderer tersedia di `data/drama_task.html`.
- `/getDramaTask` menambahkan username dari task berstatus `gagal` ke `data/startdrama-blackhole.json`; `/startDrama` menghapus username tersebut dari antrean sebelum batch berjalan.
- `/checkkout` membaca cookie dan URL produk dari `CheckoutConfig.cookie` dan `CheckoutConfig.url_product` di `config/config.json`, sehingga nilainya bisa diubah oleh fitur set-config nantinya.
