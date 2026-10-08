import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import { getVenueOwnerReviews } from '../../services/reviewsService.js'
import { formatDate, numberFormat } from '../VenueOwnerBookings/bookingFormat.js'
import './VenueOwnerReviews.css'

// Venue Owner "Reviews" page (route: /venue-owner/reviews), built from the
// design: page title, the rating summary card (average, stars, total and
// per-star bars) next to the "All reviews" list.
//
// With no reviews yet, the page shows the empty-state design instead (no
// title or cards): a centered message and a "Go to analytics" button.
//
// While the data loads, the page shows the loading design: the same title
// and card layout with placeholder bars (no text), so nothing jumps when the
// data arrives. Loaded data then shows the reviews, or the empty state.
//
// Data comes from reviewsService (MOCK for now — see that file).

const STAR_LEVELS = [5, 4, 3, 2, 1]

// Placeholder review rows in the loading design.
const SKELETON_ROWS = 7

// Avatar colors of the design's reviewer initials, picked by position.
const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#0891b2', '#dc2626', '#4338ca', '#be185d']

// "Ahmed Ali" -> "AA", "Mohammed" -> "MO" (as in the design).
function initials(name) {
  const words = name.trim().split(/\s+/)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)
  return letters.toUpperCase()
}

// Five stars, `filled` of them filled (design: amber filled, gray outline).
function Stars({ filled, size, label }) {
  return (
    <span className="vor-stars" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={size}
          className={index < filled ? 'vor-star vor-star-filled' : 'vor-star'}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

function VenueOwnerReviews() {
  const { t, i18n } = useTranslation()
  const [venue, setVenue] = useState(null)
  const [data, setData] = useState(null)
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
    getVenueOwnerReviews()
      .then((reviewsData) => isActive && setData(reviewsData))
      .catch(() => isActive && setHasError(true))
    return () => {
      isActive = false
    }
  }, [])

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

  const summary = data?.summary
  const reviews = data?.reviews ?? []
  const maxCount = summary ? Math.max(...STAR_LEVELS.map((level) => summary.distribution[level] ?? 0), 1) : 1
  const ratingLabel = (value) => t('venueOwnerReviews.ratingLabel', { value })
  const isLoading = data === null && !hasError
  const isEmpty = Boolean(data) && reviews.length === 0
  const ForwardIcon = i18n.dir() === 'rtl' ? ArrowLeft : ArrowRight

  if (isEmpty) {
    return (
      <DashboardLayout
        navItems={VENUE_OWNER_NAV}
        venue={layoutVenue}
        roleLabelKey="dashboardLayout.roles.venueOwner"
      >
        <section className="vor-empty-state" aria-labelledby="vor-empty-title">
          <h1 id="vor-empty-title" className="vor-empty-title">
            {t('venueOwnerReviews.emptyState.title')}
          </h1>
          <p className="vor-empty-text">{t('venueOwnerReviews.emptyState.message')}</p>
          <Link to="/venue-owner/analytics" className="vor-empty-button">
            {t('venueOwnerReviews.emptyState.action')}
            <ForwardIcon size={16} aria-hidden="true" />
          </Link>
        </section>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      navItems={VENUE_OWNER_NAV}
      venue={layoutVenue}
      roleLabelKey="dashboardLayout.roles.venueOwner"
    >
      <header className="vor-header">
        <h1 className="vor-title">{t('venueOwnerReviews.title')}</h1>
        <p className="vor-subtitle">{t('venueOwnerReviews.subtitle')}</p>
      </header>

      {hasError && (
        <p className="vor-message" role="alert">
          {t('venueOwnerReviews.unavailable')}
        </p>
      )}

      {/* Loading state (design): placeholder cards in the page's layout. */}
      {isLoading && (
        <div className="vor-grid" aria-busy="true">
          <div className="vor-card vor-summary" aria-hidden="true">
            <span className="vor-skeleton vor-skeleton-average" />
            <span className="vor-skeleton vor-skeleton-total" />
            <ul className="vor-bars">
              {STAR_LEVELS.map((level) => (
                <li key={level} className="vor-bar-row vor-skeleton-bar-row">
                  <span className="vor-skeleton vor-skeleton-level" />
                  <span className="vor-skeleton vor-skeleton-bar" />
                </li>
              ))}
            </ul>
          </div>

          <div className="vor-card vor-list" aria-hidden="true">
            <div className="vor-list-header">
              <span className="vor-skeleton vor-skeleton-heading" />
            </div>
            <ul className="vor-reviews">
              {Array.from({ length: SKELETON_ROWS }, (_, row) => (
                <li key={row} className="vor-review vor-skeleton-review">
                  <span className="vor-skeleton vor-skeleton-avatar" />
                  <span className="vor-skeleton-lines">
                    <span className="vor-skeleton vor-skeleton-name" />
                    <span className="vor-skeleton vor-skeleton-line" />
                    <span className="vor-skeleton vor-skeleton-line-short" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {data && (
        <div className="vor-grid">
          {/* Start side: rating summary. */}
          <section className="vor-card vor-summary" aria-label={t('venueOwnerReviews.summaryLabel')}>
            <p className="vor-average">{summary.avg_rating.toFixed(1)}</p>
            <Stars filled={Math.floor(summary.avg_rating)} size={18} label={ratingLabel(summary.avg_rating)} />
            <p className="vor-total">
              {t('venueOwnerReviews.reviewsCount', {
                count: summary.total,
                value: numberFormat.format(summary.total),
              })}
            </p>

            <ul className="vor-bars">
              {STAR_LEVELS.map((level) => {
                const count = summary.distribution[level] ?? 0
                return (
                  <li key={level} className={`vor-bar-row vor-bar-row-${level}`}>
                    <span className="vor-bar-level">
                      {level}
                      <Star size={11} className="vor-star vor-star-filled" aria-hidden="true" />
                    </span>
                    <span className="vor-bar-track" aria-hidden="true">
                      <span className="vor-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </span>
                    <span className="vor-bar-count">
                      <span className="vor-visually-hidden">{t('venueOwnerReviews.starsLevel', { count: level })}: </span>
                      {numberFormat.format(count)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* End side: all reviews. */}
          <section className="vor-card vor-list" aria-labelledby="vor-list-title">
            <header className="vor-list-header">
              <h2 id="vor-list-title" className="vor-list-title">
                {t('venueOwnerReviews.allReviews')}
              </h2>
              <span className="vor-badge">{numberFormat.format(summary.total)}</span>
            </header>

            <ul className="vor-reviews">
              {reviews.map((review, index) => (
                <li key={review.id} className="vor-review">
                  <span
                    className="vor-avatar"
                    style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                    aria-hidden="true"
                  >
                    {initials(review.player_name)}
                  </span>
                  <div className="vor-review-body">
                    <div className="vor-review-top">
                      <p className="vor-review-name">
                        <bdi>{review.player_name}</bdi>
                        <Stars filled={review.rating} size={12} label={ratingLabel(review.rating)} />
                      </p>
                      <time className="vor-review-date" dateTime={review.created_at}>
                        <bdi>{formatDate(review.created_at)}</bdi>
                      </time>
                    </div>
                    {review.comment && (
                      <p className="vor-review-comment" dir="auto">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <p className="vor-list-footer">
              {t('venueOwnerReviews.showing', {
                count: summary.total,
                shown: numberFormat.format(reviews.length),
                value: numberFormat.format(summary.total),
              })}
            </p>
          </section>
        </div>
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerReviews
