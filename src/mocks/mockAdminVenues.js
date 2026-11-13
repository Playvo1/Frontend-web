import facilityCover from '../assets/facility/facility-cover.jpg'
import facilityPhoto1 from '../assets/facility/facility-photo-1.jpg'
import facilityPhoto2 from '../assets/facility/facility-photo-2.jpg'
import facilityPhoto3 from '../assets/facility/facility-photo-3.jpg'

// MOCK DATA — demo mode only (no VITE_API_BASE_URL). The Admin "Venues
// management" rows of the design, used to render the page while the backend
// has no admin endpoint that lists venues. Never used in API mode.
// Bilingual fields follow the backend's _ar / _en convention (VENUE).
export const MOCK_ADMIN_VENUES = [
  {
    id: 1,
    name_ar: 'ملعب النخبة الرياضي',
    name_en: 'Elite Sports Field',
    city_ar: 'غزة',
    city_en: 'Gaza',
    address_ar: 'شارع الوحدة، حي الرمال',
    address_en: 'Al-Wehda Street, Al-Rimal',
    owner_name: 'أحمد الخطيب',
    created_at: '2025-12-12',
    status: 'active',
    image_url: facilityCover,
  },
  {
    id: 2,
    name_ar: 'أكاديمية الأبطال',
    name_en: 'Champions Academy',
    city_ar: 'رام الله',
    city_en: 'Ramallah',
    address_ar: 'شارع الإرسال، البيرة',
    address_en: 'Al-Irsal Street, Al-Bireh',
    owner_name: 'سامي منصور',
    created_at: '2025-12-08',
    status: 'active',
    image_url: facilityPhoto3,
  },
  {
    id: 3,
    name_ar: 'ملعب المدينة',
    name_en: 'City Stadium',
    city_ar: 'نابلس',
    city_en: 'Nablus',
    address_ar: 'شارع فيصل، وسط المدينة',
    address_en: 'Faisal Street, City Center',
    owner_name: 'يوسف عودة',
    created_at: '2025-11-29',
    status: 'active',
    image_url: facilityPhoto2,
  },
  {
    id: 4,
    name_ar: 'ملعب الساحل',
    name_en: 'Coast Field',
    city_ar: 'خانيونس',
    city_en: 'Khan Younis',
    address_ar: 'شارع البحر، المواصي',
    address_en: 'Al-Bahr Street, Al-Mawasi',
    owner_name: 'محمود النجار',
    created_at: '2025-11-21',
    status: 'inactive',
    image_url: facilityPhoto1,
  },
  {
    id: 5,
    name_ar: 'نادي الشمال',
    name_en: 'North Club',
    city_ar: 'جباليا',
    city_en: 'Jabalia',
    address_ar: 'شارع الترنس، مشروع بيت لاهيا',
    address_en: 'Al-Trans Street, Beit Lahia Project',
    owner_name: 'فادي حمدان',
    created_at: '2025-11-14',
    status: 'active',
    image_url: facilityPhoto2,
  },
  {
    id: 6,
    name_ar: 'ملعب القمة',
    name_en: 'Summit Field',
    city_ar: 'الخليل',
    city_en: 'Hebron',
    address_ar: 'شارع الجامعة، الحرس',
    address_en: 'University Street, Al-Haras',
    owner_name: 'خالد التميمي',
    created_at: '2025-11-02',
    status: 'inactive',
    image_url: facilityPhoto3,
  },
]

// Cities offered by the demo "Add venue" form (the backend has no endpoint
// that lists cities). Demo mode only.
export const MOCK_CITIES = [
  { id: 1, name_ar: 'غزة', name_en: 'Gaza', country_ar: 'فلسطين', country_en: 'Palestine' },
  { id: 2, name_ar: 'خانيونس', name_en: 'Khan Younis', country_ar: 'فلسطين', country_en: 'Palestine' },
  { id: 3, name_ar: 'رفح', name_en: 'Rafah', country_ar: 'فلسطين', country_en: 'Palestine' },
  { id: 4, name_ar: 'دير البلح', name_en: 'Deir al-Balah', country_ar: 'فلسطين', country_en: 'Palestine' },
  { id: 5, name_ar: 'جباليا', name_en: 'Jabalia', country_ar: 'فلسطين', country_en: 'Palestine' },
]

// Sports offered by the demo "Add venue" form (API mode: GET /sports).
// Demo mode only.
export const MOCK_SPORTS = [{ id: 1, name_ar: 'كرة القدم', name_en: 'Football' }]

// Details of the demo venues for the Admin venue details page (sport,
// dimensions, description, photos and the owner's account). Demo mode only;
// the owner emails use the reserved example.com domain and the phones are
// placeholders.
const DEMO_PHOTOS = [facilityCover, facilityPhoto3, facilityPhoto2, facilityPhoto1]

export const MOCK_ADMIN_VENUE_DETAILS = {
  1: {
    owner_email: 'ahmad.khatib@example.com',
    owner_phone: '0599000101',
    description_ar: 'ملعب كرة قدم حديث بأرضية عشبية وتجهيزات إضاءة مناسبة للحجوزات المسائية، مع مرافق مهيأة للاعبين.',
    description_en: 'A modern football pitch with a grass surface, floodlights for evening bookings and facilities ready for players.',
  },
  2: { owner_email: 'sami.mansour@example.com', owner_phone: '0599000102' },
  3: { owner_email: 'yousef.odeh@example.com', owner_phone: '0599000103' },
  4: { owner_email: 'mahmoud.najjar@example.com', owner_phone: '0599000104' },
  5: { owner_email: 'fadi.hamdan@example.com', owner_phone: '0599000105' },
  6: { owner_email: 'khaled.tamimi@example.com', owner_phone: '0599000106' },
}

// Values shared by every demo venue's details.
export const MOCK_ADMIN_VENUE_DETAIL_DEFAULTS = {
  sport_ar: 'كرة القدم',
  sport_en: 'Football',
  country_ar: 'فلسطين',
  country_en: 'Palestine',
  length_m: 40,
  width_m: 20,
  description_ar: null,
  description_en: null,
  owner_status: 'active',
  images: DEMO_PHOTOS.map((image_url, index) => ({ id: index + 1, image_url })),
}
