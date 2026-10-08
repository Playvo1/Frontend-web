// MOCK — development/demo data for the Venue Owner Reviews page, reproducing
// the design reference. These are NOT real players or real reviews.
//
// Shape follows the documented rating fields (POST /bookings/{id}/rating:
// rating 1–5 + comment; VENUE.avg_rating). There is no documented endpoint
// for the venue owner to list reviews yet, so the summary/list shape below
// is a frontend-side assumption to be mapped once that endpoint exists.
//
// The summary values (average, total, per-star counts) are taken as shown in
// the design; only the 8 latest reviews shown in the design are listed.
export const MOCK_VENUE_OWNER_REVIEWS = {
  summary: {
    avg_rating: 4.8,
    total: 127,
    distribution: { 5: 78, 4: 31, 3: 11, 2: 5, 1: 2 },
  },
  reviews: [
    {
      id: 1,
      player_name: 'Ahmed Ali',
      rating: 5,
      comment: 'ملعب رائع وتجربة ممتازة. كان السطح في حالة مثالية والمرافق نظيفة تمامًا.',
      created_at: '2026-09-18',
    },
    {
      id: 2,
      player_name: 'Mohammed',
      rating: 4,
      comment: 'تجربة جيدة. كان الحجز سلسًا والملعب مضاءً جيدًا. أوصي به.',
      created_at: '2026-09-17',
    },
    {
      id: 3,
      player_name: 'Khalid Hassan',
      rating: 5,
      comment: 'ملعب ممتاز! كانت الكشافات رائعة لمبارياتنا المسائية. سنعود حتمًا.',
      created_at: '2026-09-16',
    },
    {
      id: 4,
      player_name: 'Omar Saleh',
      rating: 4,
      comment: 'ملعب جميل بشكل عام. مواقف السيارات قد تكون ضيقة في أوقات الذروة، لكن لا شيء كبير.',
      created_at: '2026-09-15',
    },
    {
      id: 5,
      player_name: 'Yusuf Ibrahim',
      rating: 5,
      comment: 'عشب عالي الجودة وإدارة رائعة. أفضل ملعب كرة قدم في المنطقة.',
      created_at: '2026-09-14',
    },
    {
      id: 6,
      player_name: 'Tariq Mahmoud',
      rating: 3,
      comment: 'تجربة متوسطة. كان هناك بعض الالتباس مع تأكيد الحجز. يمكن تحسين التواصل.',
      created_at: '2026-09-13',
    },
    {
      id: 7,
      player_name: 'Samir Nasser',
      rating: 5,
      comment: 'منشأة رائعة، نظيفة وآمنة واحترافية. سأحجز بالتأكيد مرة أخرى!',
      created_at: '2026-09-12',
    },
    {
      id: 8,
      player_name: 'Rami Yousef',
      rating: 4,
      comment: 'ملعب متين بقيمة جيدة مقابل السعر. غرف تبديل الملابس كانت نظيفة.',
      created_at: '2026-09-11',
    },
  ],
}
