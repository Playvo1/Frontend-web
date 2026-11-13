// MOCK DATA — demo mode only (no VITE_API_BASE_URL). The Admin "Payment
// receipts" rows of the design, used to render the page without the backend.
// Never used in API mode: API builds leave this file out (see vite.config.js).
// Fictional players; the receipts have no image (image_url null), so the page
// shows its placeholder icon. Upload times are relative to now, so "Today" /
// "Yesterday" and the date filter can be seen; booking dates follow them.
// Shape: what adminPaymentReceiptsService.getPaymentReceipts returns.

const DAY_MS = 24 * 60 * 60 * 1000

// N days ago at hh:mm (local time) as an ISO string.
function uploaded(daysAgo, hours, minutes) {
  const date = new Date(Date.now() - daysAgo * DAY_MS)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

// N days from now as "YYYY-MM-DD" (local date).
function slotDate(daysFromNow) {
  const date = new Date(Date.now() + daysFromNow * DAY_MS)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function receipt(id, status, bookingId, player, venue, slot, upload, extra = {}) {
  return {
    id,
    status,
    image_url: null,
    uploaded_at: upload,
    verified_at: null,
    rejection_reason: null,
    booking: {
      id: bookingId,
      player_name: player,
      venue_ar: venue[0],
      venue_en: venue[1],
      slot_date: slot[0],
      start_time: slot[1],
      end_time: slot[2],
      total_price: slot[3],
    },
    ...extra,
  }
}

const CITY = ['ملعب المدينة', 'City Stadium']
const CHAMPIONS = ['أكاديمية الأبطال', 'Champions Academy']
const ELITE = ['ملعب النخبة الرياضي', 'Elite Sports Field']
const COAST = ['ملعب الساحل', 'Coast Field']
const NORTH = ['نادي الشمال', 'North Club']
const SUMMIT = ['ملعب القمة', 'Summit Field']

export const MOCK_ADMIN_PAYMENT_RECEIPTS = [
  receipt(7, 'pending', 4809, 'خالد منصور', CITY, [slotDate(2), '21:00', '22:00', 80], uploaded(1, 20, 31)),
  receipt(8, 'pending', 4818, 'أحمد سالم', CHAMPIONS, [slotDate(3), '18:00', '19:00', 70], uploaded(0, 9, 15)),
  receipt(9, 'pending', 4821, 'محمد أبو عيشة', ELITE, [slotDate(3), '20:00', '21:00', 90], uploaded(0, 10, 42)),
  receipt(6, 'verified', 4796, 'سامر النجار', COAST, [slotDate(1), '19:00', '20:00', 60], uploaded(2, 16, 22), {
    verified_at: uploaded(2, 18, 5),
  }),
  receipt(5, 'rejected', 4788, 'رامي حسونة', NORTH, [slotDate(0), '17:00', '18:00', 60], uploaded(3, 11, 10), {
    rejection_reason: 'المبلغ في الإيصال لا يطابق قيمة الحجز.',
  }),
  receipt(4, 'verified', 4771, 'ياسر عبد الله', SUMMIT, [slotDate(-1), '21:00', '22:00', 75], uploaded(4, 14, 48), {
    verified_at: uploaded(4, 16, 30),
  }),
  receipt(3, 'verified', 4724, 'مصطفى العطار', ELITE, [slotDate(-7), '22:00', '23:00', 90], uploaded(10, 18, 34), {
    verified_at: uploaded(10, 19, 2),
  }),
]
