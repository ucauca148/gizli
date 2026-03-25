/**
 * İtemSatış'tan gelen "26 Mart 2025, 22:07" formatındaki Türkçe tarihleri parse eder.
 */
export function parseTurkishDate(dateStr: string): Date {
  const months: Record<string, number> = {
    "Ocak": 0, "Şubat": 1, "Mart": 2, "Nisan": 3, "Mayıs": 4, "Haziran": 5,
    "Temmuz": 6, "Ağustos": 7, "Eylül": 8, "Ekim": 9, "Kasım": 10, "Aralık": 11
  };

  try {
    // "26 Mart 2025, 22:07" -> ["26", "Mart", "2025,", "22:07"]
    const parts = dateStr.split(" ");
    const day = parseInt(parts[0]);
    const month = months[parts[1]];
    const year = parseInt(parts[2].replace(",", ""));
    const timeParts = parts[3].split(":");
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);

    return new Date(year, month, day, hour, minute);
  } catch (e) {
    console.error("Tarih parse hatası:", dateStr, e);
    return new Date(0); // Hata durumunda çok eski bir tarih dön (24h filtresine takılsın)
  }
}
