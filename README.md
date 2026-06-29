# InstaSave — Instagram Downloader

Instagram reels, story ve gönderilerini MP4 (video) ve PNG (görsel) olarak indirmenizi sağlayan Next.js uygulaması.

## Özellikler

- Reels, post ve story bağlantı desteği
- Otomatik format: video → MP4, görsel → PNG
- Siyah-beyaz modern arayüz
- Çoklu medya (carousel) desteği
- Tek tıkla veya toplu indirme

## Kurulum

```bash
npm install
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## Kullanım

1. Instagram'dan reels, story veya gönderi bağlantısını kopyalayın
2. Bağlantıyı kutuya yapıştırın
3. **İndir** butonuna tıklayın
4. Önizlemeden medyayı indirin

### Desteklenen bağlantı formatları

- `https://www.instagram.com/reel/SHORTCODE/`
- `https://www.instagram.com/p/SHORTCODE/`
- `https://www.instagram.com/stories/KULLANICI/STORY_ID/`

## Notlar

- Yalnızca **halka açık** içerikler desteklenir
- Gizli hesapların story ve gönderileri indirilemez
- Süresi dolmuş story'ler erişilemez olabilir
- Instagram API değişiklikleri indirmeyi etkileyebilir

## Teknolojiler

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- [btch-downloader](https://github.com/hostinger-bot/btch-downloader) — Instagram medya çıkarma (`igdl`)
