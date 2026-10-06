import { useEffect, useState } from 'react'
import {
  Check,
  CircleDollarSign,
  Globe,
  House,
  ImageOff,
  Images,
  LayoutGrid,
  MapPin,
  Rows3,
  SquarePen,
  User,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import './VenueOwnerFacility.css'

// Venue Owner "My venue" page (route: /venue-owner/facility), built from the
// design reference: page title, a cover banner with the venue's name and
// actions, the venue information list and the photos card.
//
// UI only for now: the backend (github.com/Playvo1/Backend main @ 1e2e9be)
// has no endpoint that returns the owner's venue (GET /owner/venues was
// removed), so no facility data is loaded and every value shows an
// "unavailable" state. The buttons have no action yet.
//
// Rows follow the design, in order. They are the labels only; values will
// come from the backend once its venue endpoint is confirmed.
const INFO_ROWS = [
  { key: 'name', icon: House },
  { key: 'owner', icon: User },
  { key: 'area', icon: MapPin },
  { key: 'address', icon: Globe },
  { key: 'status', icon: Check },
  { key: 'surface', icon: Rows3 },
  { key: 'dimensions', icon: LayoutGrid },
  { key: 'capacity', icon: Users },
  { key: 'morningPrice', icon: CircleDollarSign },
  { key: 'eveningPrice', icon: CircleDollarSign },
]

function VenueOwnerFacility() {
  const { t } = useTranslation()
  const [venue, setVenue] = useState(null)

  // Sidebar venue card / top-bar subtitle: same source as the other
  // Venue Owner pages.
  useEffect(() => {
    let isActive = true
    getVenueOwnerVenue()
      .then((venueData) => isActive && setVenue(venueData))
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [])

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

  return (
    <DashboardLayout
      navItems={VENUE_OWNER_NAV}
      venue={layoutVenue}
      roleLabelKey="dashboardLayout.roles.venueOwner"
    >
      <header className="vof-header">
        <h1 className="vof-title">{t('venueOwnerFacility.title')}</h1>
        <p className="vof-subtitle">{t('venueOwnerFacility.subtitle')}</p>
      </header>

      {/* Cover banner. No venue data/photo yet: shows the unavailable state. */}
      <section className="vof-hero" aria-labelledby="vof-hero-title">
        <div className="vof-hero-text">
          <h2 id="vof-hero-title" className="vof-hero-title">
            {t('venueOwnerFacility.unavailable')}
          </h2>
        </div>
        {/* No actions yet (UI only). */}
        <div className="vof-hero-actions">
          <button type="button" className="vof-button vof-button-ghost">
            <Images size={14} aria-hidden="true" />
            {t('venueOwnerFacility.managePhotos')}
          </button>
          <button type="button" className="vof-button vof-button-primary">
            <SquarePen size={14} aria-hidden="true" />
            {t('venueOwnerFacility.editVenue')}
          </button>
        </div>
      </section>

      <div className="vof-grid">
        {/* Start side: venue information. */}
        <section className="vof-card vof-info" aria-labelledby="vof-info-title">
          <header className="vof-card-header">
            <h2 id="vof-info-title" className="vof-card-title">
              {t('venueOwnerFacility.infoTitle')}
            </h2>
            <button type="button" className="vof-edit">
              <SquarePen size={13} aria-hidden="true" />
              {t('venueOwnerFacility.edit')}
            </button>
          </header>
          <dl className="vof-rows">
            {INFO_ROWS.map(({ key, icon: Icon }) => (
              <div key={key} className="vof-row">
                <dt className="vof-row-label">
                  <span className="vof-row-icon" aria-hidden="true">
                    <Icon size={15} />
                  </span>
                  {t(`venueOwnerFacility.fields.${key}`)}
                </dt>
                <dd className="vof-row-value">
                  <span aria-hidden="true">—</span>
                  <span className="vof-sr-only">{t('venueOwnerFacility.notAvailable')}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* End side: photos. */}
        <section className="vof-card vof-photos" aria-labelledby="vof-photos-title">
          <header className="vof-card-header">
            <h2 id="vof-photos-title" className="vof-card-title">
              {t('venueOwnerFacility.photosTitle')}
            </h2>
          </header>
          <div className="vof-photos-empty">
            <ImageOff className="vof-photos-empty-icon" size={28} strokeWidth={1.5} aria-hidden="true" />
            <p className="vof-photos-empty-text">{t('venueOwnerFacility.noPhotos')}</p>
          </div>
          <div className="vof-photos-footer">
            {/* No action yet (UI only). */}
            <button type="button" className="vof-button vof-button-muted vof-button-full">
              {t('venueOwnerFacility.viewAllPhotos')}
            </button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

export default VenueOwnerFacility
