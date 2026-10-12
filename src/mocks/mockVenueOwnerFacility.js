import facilityCover from '../assets/facility/facility-cover.jpg'
import facilityPhoto1 from '../assets/facility/facility-photo-1.jpg'
import facilityPhoto2 from '../assets/facility/facility-photo-2.jpg'
import facilityPhoto3 from '../assets/facility/facility-photo-3.jpg'

// MOCK DATA — development only, used to render the Venue Owner "My venue"
// page (/venue-owner/facility) from the design while the backend is not
// reachable from the frontend. Values are the ones shown in the design.
// Replace via facilityService.js once the backend venue endpoint is
// confirmed; map its response to this shape so the page does not change.
//
// Bilingual fields use the backend's _ar / _en convention (VENUE entity).
// Fields marked "design" have no confirmed backend field yet.
export const MOCK_VENUE_OWNER_FACILITY = {
  id: 1,
  name_ar: 'ملعب غزة الرياضي',
  name_en: 'Gaza Sports Field',
  owner_name: 'أحمد سمير صيام', // design (the owner's account name)
  sport_ar: 'كرة القدم', // design (backend gives sport_ids only)
  sport_en: 'Football',
  area_ar: 'غزة، فلسطين',
  area_en: 'Gaza, Palestine',
  address_ar: 'شارع الوحدة',
  address_en: 'Al-Wehda Street',
  status: 'active', // active | inactive
  surface_ar: 'عشب صناعي (FIFA Pro)', // design
  surface_en: 'Artificial turf (FIFA Pro)',
  length_m: 40,
  width_m: 20,
  team_format_ar: '5 في 5', // design
  team_format_en: '5-a-side',
  capacity_ar: '10 لاعبين + مشجعين', // design
  capacity_en: '10 players + spectators',
  morning_hourly_price: 75, // design
  evening_hourly_price: 140, // design
  cover_image_url: facilityCover, // design
  images: [
    { id: 1, image_url: facilityPhoto1 },
    { id: 2, image_url: facilityPhoto3 },
    { id: 3, image_url: facilityPhoto2 },
  ],
}
