
## Security, Authentication & Abuse Prevention Strategy

Untuk memastikan keamanan *budget* API (Fal.ai) dan mencegah eksploitasi oleh *bot*, *spammer*, atau *abuser*, Audora menerapkan arsitektur *Passwordless* dan *Multi-layered Rate Limiting*. Strategi ini dirancang untuk melindungi *runway* finansial MVP tanpa mengorbankan kenyamanan *user* organik.

### 1. Passwordless Authentication (Better Auth)
Sistem tidak menggunakan form pendaftaran dengan kombinasi *email* dan *password* konvensional untuk menutup celah pembuatan akun palsu secara massal.
* **Primary Auth (Social Login):** *User* mendaftar dan masuk menggunakan **Google Auth** atau **GitHub Auth**. Alur ini sangat optimal dan familiar untuk target *market developer* maupun desainer.
* **Fallback Auth (Magic Link):** Jika *user* ingin mendaftar menggunakan *email* secara manual, sistem menggunakan alur **Magic Link**. *User* wajib mengklik tautan verifikasi yang dikirim ke *inbox* asli mereka via **Resend** sebelum bisa mengakses *dashboard* dan mengklaim kredit.

### 2. Multi-Layer Rate Limiting (Upstash Redis)
Pencegahan eksploitasi diimplementasikan di level *Middleware* (Next.js) menggunakan `@upstash/ratelimit` dengan 3 lapis perlindungan:

* **Layer 1: User ID Rate Limit (Proteksi API Cost)**
  * **Target:** *Endpoint* `/api/generate`.
  * **Rule:** Maksimal **3 request per menit per `userId`**.
  * **Tujuan:** Mencegah *user* valid yang mengalami *network lag* (atau sengaja iseng) menekan tombol "Generate" berkali-kali secara instan yang berisiko menguras saldo API Fal.ai.

* **Layer 2: Global IP Rate Limit (Proteksi DDoS / Brute Force)**
  * **Target:** Seluruh *endpoint* aplikasi (Global Middleware).
  * **Rule:** Sangat longgar, maksimal **50 request per menit per IP Address**.
  * **Tujuan:** Menolak *bot* atau *script* otomatis yang mencoba membombardir *server* dari luar, namun tetap aman bagi *user* organik yang menggunakan IP publik bersama.

* **Layer 3: Sybil Attack Defense (Proteksi Sign-up Bonus)**
  * **Target:** *Logic* pemberian 2 Kredit Gratis saat proses *Onboarding*.
  * **Rule:** Sistem mencatat IP Address saat *user* baru berhasil *login* pertama kali. Maksimal hanya **5 akun per IP per hari** yang berhak mendapatkan bonus kredit awal.
  * **Tujuan:** Memberikan kelonggaran bagi *user* organik yang mendaftar dari jaringan publik (seperti *cafe* atau *coworking space*), namun tetap mencegah satu individu menernak puluhan akun dari satu perangkat untuk memonopoli *tier* gratis. Akun ke-6 dari IP yang sama di hari tersebut tetap bisa mendaftar dan masuk, namun saldo awalnya secara otomatis diset menjadi **0 kredit**.

### 3. User Experience (UX) & Graceful Error Handling
Untuk menjaga kenyamanan *user* dan mencegah ulasan negatif akibat *false positive* dari Layer 3, Audora menerapkan SOP operasional berikut:

* **Zero-Credit Warning Banner:** Jika *user* organik masuk dan mendapati saldonya 0 akibat pembatasan klaim IP jaringan mereka, sistem **wajib** memunculkan *banner* notifikasi peringatan di atas halaman *Dashboard*.
  * **Draft Copywriting:** *"Hai! Sepertinya jaringan Wi-Fi yang kamu gunakan sudah mencapai batas maksimal klaim kredit gratis hari ini. Tapi tenang saja, akunmu sudah aktif! Kamu bisa mulai generate ikon 3D dengan melakukan [Top-up Kredit] atau hubungi [Support] jika ini adalah sebuah kesalahan."*
* **Benefit of the Doubt (Manual Override):** Jika terdapat *user* yang melakukan komplain organik (via *email* atau media sosial) terkait saldo 0 di awal pendaftaran, tim *support* / admin akan langsung menyuntikkan 2 kredit secara manual. Tindakan ini merupakan bentuk *excellent customer service* untuk mengubah rasa frustrasi menjadi loyalitas pelanggan.

***