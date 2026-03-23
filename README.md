# İtemSatış Webhook Tabanlı Özel Satış Paneli (MVP)

Bu proje İtemSatış üzerinden gelen HTTP POST webhook isteklerini karşılayan, hiçbir eventi kaçırmadan veritabanına loglayan ve gösteren özel bir dashboard uygulamasıdır. 

## Mimari Özellikleri
- **Vercel Background Functions:** Webhook'lar `Next.js App Router`'da HTTP 200 OK yanıtlanıp `waitUntil()` vasıtasıyla asenkron olarak Node.js runtime üzerinde arka planda işlenir. Bu, Vercel free tier (10sn) zaman aşımı limitlerinden kaçınmayı sağlar.
- **Güvenli PENDING Kaydı:** Gelen webhook, Parse/Evaluate iş mantığına girmeden anında `PENDING` statüsüyle veritabanına yazılır.
- **Esnek Event Parser:** Sistemin henüz tanımadığı bir event gönderilirse webhook logu hata vermek yerine `UNMAPPED` statüsü alarak veritabanında saklanmaya devam eder. Arıza çıkarsa da hata detaylarıyla birlikte `FAILED` olur ve daha sonra Retry endpoint ile ( `POST /api/webhooks/[id]/retry` ) tekrar işlenebilir.

## RLS (Row Level Security) ve Auth Akışı
Sistemimiz public (açık) API'lere değil, server-only yetkilendirilmiş (Auth) girişlere dayanır.

### Authentication & UUID İlişkisi
1. Sisteme sadece belirlenmiş 2 yönetici girecektir. Giriş mekanizması `@supabase/ssr` ile Next.js Server (Cookie Session) üzerinden gerçekleşir.  
2. `auth.users` tablosu (Supabase'in saklı ana tablosu), Prisma public şemasındaki `profiles` tablosuna ( Prisma modeli `Profile` ) referansla bağlıdır. 
3. Yöneticinin `id`'si UUID tipindedir ve iki tablo arasında **aynıdır**. Yeni kullanıcı Supabase'den yaratıldığında, ID'si `profiles` id kolonuna da yazılmalıdır.

### RLS Neden Pasif veya İkincil Planda?
- Proje veriye dışarıdan doğrudan PostgREST API veya Supabase Client üzerinden CRUD operasyonu **yapmayacaktır**.
- Tüm veritabanı okuma/yazma (Order çekmek, Product eklemek) işlemleri SSR (Server-Side) olarak Next.js içerisindeki **Prisma ORM** üzerinden (`DATABASE_URL` doğrudan veritabanı connection stream ile) yapılır. 
- Bu sebeple Prisma Service Role (Admin) yetkisiyle bağlandığından RLS bypass edilir. Kullanıcı güvenliği Supabase DB seviyesinde RLS poliçeleriyle değil, **Next.js Middleware + Route Auth Guard** tarafında "Geçerli bir session var mı?" / "Rolü ADMIN mi?" kontrolleriyle sağlanır.

## Kurulum
1. Repoyu klonlayın.
2. Bağımlılıkları yükleyin: `npm install`
3. Supabase'den alınan yetkilerle `.env` (şablon: `.env.example`) dosyasını doldurun.
4. Veritabanı tablolarını basmak için Prisma push komutunu çalıştırın: `npx prisma db push`
5. Yerel sunucuyu ayağa kaldırın: `npm run dev`
