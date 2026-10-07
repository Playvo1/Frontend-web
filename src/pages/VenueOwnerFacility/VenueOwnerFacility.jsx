import { useEffect, useState } from 'react'
import {
  Check,
  CircleDollarSign,
  Globe,
  House,
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
import { getVenueOwnerFacility } from '../../services/facilityService.js'
import { numberFormat } from '../VenueOwnerBookings/bookingFormat.js'
import './VenueOwnerFacility.css'

// Venue Owner "My venue" page (route: /venue-owner/facility), built from the
// design: page title, a cover banner with the venue's sport, area, name and
// actions, the venue information list and the photos card.
//
// Data comes from facilityService (MOCK for now — see that file). The
// buttons have no action yet (no confirmed backend endpoints for them).

// Localized value of a bilingual field ("name" -> name_ar / name_en).
function localized(facility, field, language) {
  return facility[`${field}_${language === 'ar' ? 'ar' : 'en'}`]
}

function VenueOwnerFacility() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const [venue, setVenue] = useState(null)
  const [facility, setFacility] = useState(null)
  const [hasError, setHasError] = useState(false)

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

  useEffect(() => {
    let isActive = true
    getVenueOwnerFacility()
      .then((data) => isActive && setFacility(data))
      .catch(() => isActive && setHasError(true))
    return () => {
      isActive = false
    }
  }, [])

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

  // Photo count with Arabic-Indic digits in Arabic, as in the design ("٣ صور").
  const countFormat = new Intl.NumberFormat(language === 'ar' ? 'ar-u-nu-arab' : language)
  const price = (value) => `₪${numberFormat.format(value)}`

  // Information rows, in the design's order.
  const rows = facility
    ? [
        { key: 'name', icon: House, value: localized(facility, 'name', language) },
        { key: 'owner', icon: User, value: facility.owner_name },
        { key: 'area', icon: MapPin, value: localized(facility, 'area', language) },
        { key: 'address', icon: Globe, value: localized(facility, 'address', language) },
        { key: 'status', icon: Check, value: t(`venueOwnerFacility.status.${facility.status}`) },
        { key: 'surface', icon: Rows3, value: localized(facility, 'surface', language) },
        {
          key: 'dimensions',
          icon: LayoutGrid,
          value: t('venueOwnerFacility.dimensionsValue', {
            length: facility.length_m,
            width: facility.width_m,
            format: localized(facility, 'team_format', language),
          }),
        },
        { key: 'capacity', icon: Users, value: localized(facility, 'capacity', language) },
        { key: 'morningPrice', icon: CircleDollarSign, value: price(facility.morning_hourly_price) },
        { key: 'eveningPrice', icon: CircleDollarSign, value: price(facility.evening_hourly_price) },
      ]
    : []

  const [mainPhoto, ...otherPhotos] = facility?.images ?? []

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

      {hasError && (
        <p className="vof-message" role="alert">
          {t('venueOwnerFacility.unavailable')}
        </p>
      )}

      {facility && (
        <>
          {/* Cover banner: the venue photo with its sport, area, name and actions. */}
          <section
            className="vof-hero"
            style={{ backgroundImage: `url(${facility.cover_image_url})` }}
            aria-labelledby="vof-hero-title"
          >
            <div className="vof-hero-text">
              <p className="vof-hero-meta">
                <span className="vof-hero-sport">{localized(facility, 'sport', language)}</span>
                <span className="vof-hero-area">
                  <MapPin size={12} aria-hidden="true" />
                  {localized(facility, 'area', language)}
                </span>
              </p>
              <h2 id="vof-hero-title" className="vof-hero-title">
                {localized(facility, 'name', language)}
              </h2>
            </div>
            {/* No actions yet (UI only). */}
            <div className="vof-hero-actions">
              <button type="button" className="vof-button vof-button-ghost">
                <Images size={14} aria-hidden="true" />
                {t('venueOwnerFacility.managePhotos')}
              </button>
              <button type="button" className="vof-button vof-button-navy">
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
                {rows.map(({ key, icon: Icon, value }) => (
                  <div key={key} className="vof-row">
                    <dt className="vof-row-label">
                      <span className="vof-row-icon" aria-hidden="true">
                        <Icon size={15} />
                      </span>
                      {t(`venueOwnerFacility.fields.${key}`)}
                    </dt>
                    <dd className="vof-row-value">
                      <bdi>{value}</bdi>
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
                <span className="vof-photos-count">
                  {t('venueOwnerFacility.photosCount', {
                    count: facility.images.length,
                    value: countFormat.format(facility.images.length),
                  })}
                </span>
              </header>
              {mainPhoto ? (
                <div className="vof-gallery">
                  <img className="vof-photo vof-photo-main" src={mainPhoto.image_url} alt="" />
                  {otherPhotos.slice(0, 2).map((photo) => (
                    <img key={photo.id} className="vof-photo" src={photo.image_url} alt="" />
                  ))}
                </div>
              ) : (
                <p className="vof-photos-empty">{t('venueOwnerFacility.noPhotos')}</p>
              )}
              <div className="vof-photos-footer">
                {/* No action yet (UI only). */}
                <button type="button" className="vof-button vof-button-muted vof-button-full">
                  {t('venueOwnerFacility.viewAllPhotos')}
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerFacility
