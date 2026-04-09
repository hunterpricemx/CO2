/**
 * @file Server zaman güncellemesi için yardımcı fonksiyonlar
 * @description Fransa zaman dilimindeki sunucu saatini takip eder ve etkinlik sayaçlarını günceller
 */

// Sabit değerler
const TIME_ZONE = "Europe/Paris";
const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

/**
 * Fransa zaman dilimindeki güncel saati alır
 * @returns {Date} Fransa zaman dilimindeki tarih/saat nesnesi
 */
function getServerTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TIME_ZONE }));
}

/**
 * Sayaç gösterimi için HTML şablonu oluşturur
 * @param {Object} timeRemaining - Kalan zaman bilgisi
 * @param {number} timeRemaining.days - Kalan gün sayısı
 * @param {number} timeRemaining.hours - Kalan saat sayısı
 * @param {number} timeRemaining.minutes - Kalan dakika sayısı
 * @returns {string} Biçimlendirilmiş HTML içeriği
 */
function createCountdownHTML({ days, hours, minutes }) {
  return `
    <div class="countdown-container">
      <div class="countdown-segment">
        <div class="countdown-number">${days}</div>
        <div class="countdown-label">days</div>
      </div>
      <div class="countdown-segment">
        <div class="countdown-number">${hours}</div>
        <div class="countdown-label">hours</div>
      </div>
      <div class="countdown-segment">
        <div class="countdown-number">${minutes.toString().padStart(2, '0')}</div>
        <div class="countdown-label">minutes</div>
      </div>
    </div>`;
}

/**
 * Aktif etkinlik gösterimi için HTML şablonu oluşturur
 * @param {Object} [endTime] - Etkinlik bitiş zamanı (varsa)
 * @returns {string} Biçimlendirilmiş HTML içeriği
 */
function createActiveEventHTML(endTime = null) {
  let html = `<span class="active-text"><i class="fas fa-circle-play me-2"></i>ACTIVE NOW</span>`;

  if (endTime) {
    const now = getServerTime();
    const endDiff = endTime - now;
    const endHours = Math.floor(endDiff / (1000 * 60 * 60));
    const endMinutes = Math.floor((endDiff % (1000 * 60 * 60)) / (1000 * 60));
    const endSeconds = Math.floor((endDiff % (1000 * 60)) / 1000);

    html += `<div class="end-time-info mt-2">Ends in: ${endHours}h ${endMinutes}m ${endSeconds}s</div>`;
  }

  return html;
}

/**
 * Belirli bir gün, saat ve dakika için sonraki etkinlik zamanını hesaplar
 * @param {number} day - Haftanın günü (0-6, 0=Pazar)
 * @param {number} hour - Saat (0-23)
 * @param {number} minute - Dakika (0-59)
 * @returns {Date} Sonraki etkinlik zamanı
 */
function calculateNextEventTime(day, hour, minute) {
  const serverTime = getServerTime();
  const serverDay = serverTime.getDay();

  // Sonraki etkinliğe kadar kaç gün kaldığını hesapla
  let daysUntil = (day - serverDay + 7) % 7;

  // Eğer etkinlik bugün ise ve geçmişse, sonraki haftaya ayarla
  if (daysUntil === 0) {
    if (
      serverTime.getHours() > hour ||
      (serverTime.getHours() === hour && serverTime.getMinutes() >= minute)
    ) {
      daysUntil = 7; // Bir sonraki haftaya ayarla
    }
  }

  // Hedef tarihi ayarla
  const targetDate = new Date(serverTime);
  targetDate.setDate(targetDate.getDate() + daysUntil);
  targetDate.setHours(hour, minute, 0, 0);

  return targetDate;
}

/**
 * Sayaç elementini belirtilen etkinlik zamanına göre günceller
 * @param {string} counterId - Sayaç elementinin ID'si
 * @param {Object} eventConfig - Etkinlik yapılandırması
 * @param {number} eventConfig.day - Etkinliğin günü (0-6)
 * @param {number} eventConfig.hour - Etkinliğin saati (0-23)
 * @param {number} eventConfig.minute - Etkinliğin dakikası (0-59)
 * @param {Object} [eventConfig.endTime] - Etkinlik bitiş zamanı yapılandırması
 * @param {number} [eventConfig.endTime.day] - Bitiş günü
 * @param {number} [eventConfig.endTime.hour] - Bitiş saati
 * @param {number} [eventConfig.endTime.minute] - Bitiş dakikası
 */
function updateEventCounter(counterId, { day, hour, minute, endTime }) {
  const counterElement = document.getElementById(counterId);
  if (!counterElement) return;

  // Mevcut sunucu saatini al
  const now = getServerTime();

  // Sayacın bulunduğu kutuyu bul ve Fransa saati göstergesini ekle
  const timerBox = counterElement.closest('.timer-box');
  if (timerBox && !timerBox.querySelector('.france-time')) {
    const franceTimeEl = document.createElement('div');
    franceTimeEl.className = 'france-time';
    franceTimeEl.innerHTML = `<i class="fa-regular fa-clock me-1"></i>Server Time: <span class="france-time-display">${now.toLocaleTimeString('en-US', {hour12: false})}</span>`;
    timerBox.insertBefore(franceTimeEl, timerBox.firstChild);
  }

  // Sonraki etkinlik zamanını hesapla
  const nextEventTime = calculateNextEventTime(day, hour, minute);
  const timeDiff = nextEventTime - now;

  // Etkinlik şu anda aktifse
  if (timeDiff <= 0) {
    let eventEndTime = null;

    // Etkinlik bitişi tanımlanmışsa
    if (endTime) {
      const endDate = new Date(now);

      // Aynı gün bitiş (çoğu etkinlik 1 saat sürüyor)
      if (!endTime.day) {
        endDate.setHours(endTime.hour, endTime.minute, 0, 0);
        // Eğer bitiş saati şu anki saatten önceyse, aynı etkinlik hala devam ediyor demektir
        if (endDate <= now) {
          endDate.setDate(endDate.getDate() + 1); // yarına ayarla
        }
      } 
      // Belirli bir günde biten etkinlikler (örn: GuildWar)
      else {
        const dayDiff = (endTime.day - now.getDay() + 7) % 7;
        endDate.setDate(endDate.getDate() + dayDiff);
        endDate.setHours(endTime.hour, endTime.minute, 0, 0);
      }

      if (endDate > now) {
        eventEndTime = endDate;
      }
    }

    counterElement.innerHTML = createActiveEventHTML(eventEndTime);
    counterElement.classList.add('active');
  } 
  // Etkinlik henüz başlamamışsa sayaç göster
  else {
    counterElement.classList.remove('active');
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    counterElement.innerHTML = createCountdownHTML({ days, hours, minutes });
  }
}

/**
 * Tüm etkinlik sayaçlarını günceller
 */
function updateAllEventCounters() {
  // France saati göstergelerini güncelle
  document.querySelectorAll('.france-time-display').forEach(el => {
    el.textContent = getServerTime().toLocaleTimeString('en-US', {hour12: false});
  });

  // Etkinlik sayaçlarını güncelle
  updateEventCounter('counter-guildwar', { 
    day: DAYS_OF_WEEK.SATURDAY, 
    hour: 15, 
    minute: 0, 
    endTime: { day: DAYS_OF_WEEK.SUNDAY, hour: 17, minute: 0 }
  });

  updateEventCounter('counter-citywar', { 
    day: DAYS_OF_WEEK.TUESDAY, 
    hour: 18, 
    minute: 0,
    endTime: { hour: 19, minute: 0 }
  });

  updateEventCounter('counter-miniboss', { 
    day: DAYS_OF_WEEK.SATURDAY, 
    hour: 18, 
    minute: 0,
    endTime: { hour: 19, minute: 0 }
  });

  updateEventCounter('counter-ccw', { 
    day: DAYS_OF_WEEK.THURSDAY, 
    hour: 18, 
    minute: 0,
    endTime: { hour: 19, minute: 0 }
  });

  updateEventCounter('counter-tcgw', { 
    day: DAYS_OF_WEEK.WEDNESDAY, 
    hour: 18, 
    minute: 0,
    endTime: { hour: 19, minute: 0 }
  });
}

// Dışa aktarılan API
window.EventTimers = {
  updateAllEventCounters,
  getServerTime
};
