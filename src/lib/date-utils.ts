/**
 * İtemSatış'tan gelen "26 Mart 2025, 22:07" veya "26 Mart 2025 , 22:07" formatındaki 
 * Türkçe tarihleri parse eder.
 */
export function parseTurkishDate(dateStr: string): Date {
  const months: Record<string, number> = {
    "Ocak": 0, "Şubat": 1, "Mart": 2, "Nisan": 3, "Mayıs": 4, "Haziran": 5,
    "Temmuz": 6, "Ağustos": 7, "Eylül": 8, "Ekim": 9, "Kasım": 10, "Aralık": 11
  };

  try {
    // Virgülleri temizle ve fazla boşlukları teklileştir
    const cleanStr = dateStr.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    const parts = cleanStr.split(" ");
    
    // ["26", "Mart", "2025", "22:07"]
    const day = parseInt(parts[0]);
    const month = months[parts[1]];
    const year = parseInt(parts[2]);
    
    // Saat/dakika varsa (22:07)
    let hour = 0;
    let minute = 0;
    if (parts[3] && parts[3].includes(":")) {
      const timeParts = parts[3].split(":");
      hour = parseInt(timeParts[0]);
      minute = parseInt(timeParts[1]);
    }

    if (isNaN(day) || month === undefined || isNaN(year)) {
      throw new Error("Geçersiz tarih bileşenleri");
    }

    return new Date(year, month, day, hour, minute);
  } catch (e) {
    console.error("Tarih parse hatası:", dateStr, e);
    // Hata durumunda çok eski bir tarih dönerek filtreye takılmasını sağla
    return new Date(0); 
  }
}
