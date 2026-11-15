import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  LEAD_COMPANIES,
  SORT_KEYS,
  SORT_OPTIONS,
  formatCurrency,
  getScoreTier,
  sortCompanies,
} from '../features/lead-scoring/leadsData.js';
import '../features/lead-scoring/LeadScoring.css';

const SECTORS = ['All', 'MNC', 'Government'];

export default function LeadScoringDashboard() {
  const [sortBy, setSortBy] = useState(SORT_KEYS.SCORE);
  const [sectorFilter, setSectorFilter] = useState('All');

  const displayedCompanies = useMemo(() => {
    const filtered =
      sectorFilter === 'All'
        ? LEAD_COMPANIES
        : LEAD_COMPANIES.filter((company) => company.sector === sectorFilter);

    return sortCompanies(filtered, sortBy);
  }, [sectorFilter, sortBy]);

  const summaryStats = useMemo(() => {
    const totalPipeline = displayedCompanies.reduce(
      (sum, company) => sum + company.potentialSalePrice,
      0,
    );
    const avgScore =
      displayedCompanies.length > 0
        ? Math.round(
            displayedCompanies.reduce((sum, company) => sum + company.engagementScore, 0) /
              displayedCompanies.length,
          )
        : 0;

    return { totalPipeline, avgScore, count: displayedCompanies.length };
  }, [displayedCompanies]);

  return (
    <div className="container lead-page">
      <header className="lead-header">
        <div>
          <p className="lead-header__eyebrow">AI sales copilot · Singtel Enterprise</p>
          <h1 className="lead-header__title">B2B Lead Scoring Dashboard</h1>
          <p className="lead-header__subtitle">
            Prioritize high-intent enterprise and government accounts by engagement readiness and
            multi-year contract value.
          </p>
        </div>
        <StatusBadge status="ok">{summaryStats.count} Active Accounts Scored</StatusBadge>
      </header>

      <section className="lead-summary" aria-label="Pipeline metrics summary">
        <div className="lead-summary__item">
          <p className="lead-summary__label">Total Pipeline Value</p>
          <p className="lead-summary__value lead-summary__value--accent">
            {formatCurrency(summaryStats.totalPipeline)}
          </p>
        </div>
        <div className="lead-summary__item">
          <p className="lead-summary__label">Average Engagement Score</p>
          <p className="lead-summary__value">{summaryStats.avgScore} / 100</p>
        </div>
        <div className="lead-summary__item">
          <p className="lead-summary__label">Active Sort Criterion</p>
          <p className="lead-summary__value">
            {sortBy === SORT_KEYS.SCORE ? 'Metric Score' : 'Potential Sale Price'}
          </p>
        </div>
      </section>

      <section className="lead-toolbar" aria-label="Filtering and sorting controls">
        <div className="lead-toolbar__group">
          <label htmlFor="sector-filter" className="lead-toolbar__label">
            Sector
          </label>
          <select
            id="sector-filter"
            className="lead-select"
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                {sector === 'All' ? 'All Sectors (MNC & Government)' : sector}
              </option>
            ))}
          </select>
        </div>

        <div className="lead-toolbar__group">
          <span className="lead-toolbar__label" id="sort-group-label">
            Sort by
          </span>
          <div className="lead-toggle-group" role="group" aria-labelledby="sort-group-label">
            {SORT_OPTIONS.map((option) => {
              const isActive = sortBy === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`lead-toggle-btn ${isActive ? 'lead-toggle-btn--active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => setSortBy(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lead-grid" aria-label="Scored B2B company leads">
        {displayedCompanies.map((company, index) => {
          const sectorClass =
            company.sector === 'Government'
              ? 'lead-sector-badge--government'
              : 'lead-sector-badge--mnc';
          const tier = getScoreTier(company.engagementScore);

          return (
            <Link
              key={company.id}
              to={`/leads/${company.id}`}
              className="lead-card"
              aria-label={`View details for ${company.companyName}`}
            >
              <div>
                <div className="lead-card__top">
                  <div className="lead-card__badges">
                    <span className="lead-rank-badge">#{index + 1}</span>
                    <span className={`lead-sector-badge ${sectorClass}`}>{company.sector}</span>
                  </div>

                  <div className="lead-score-pill">
                    <span className="lead-score-pill__label">Engagement</span>
                    <span className="lead-score-pill__value">
                      {company.engagementScore}
                      <span className="lead-score-pill__max">/100</span>
                    </span>
                  </div>
                </div>

                <h2 className="lead-card__title">{company.companyName}</h2>

                <div
                  className="lead-meter"
                  role="progressbar"
                  aria-valuenow={company.engagementScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${company.companyName} engagement score ${company.engagementScore} out of 100`}
                >
                  <div
                    className="lead-meter__fill"
                    style={{ width: `${company.engagementScore}%` }}
                  />
                </div>

                <dl className="lead-card__meta">
                  <div className="lead-card__meta-row">
                    <dt className="lead-card__meta-label">Recommended Product</dt>
                    <dd className="lead-card__product">{company.recommendedProduct}</dd>
                  </div>

                  <div className="lead-card__meta-row">
                    <dt className="lead-card__meta-label">Potential Sale Price</dt>
                    <dd className="lead-card__price-group">
                      <span className="lead-card__price">
                        {formatCurrency(company.potentialSalePrice)}
                      </span>
                      <span className="lead-card__price-formula">
                        {formatCurrency(company.yearlyPrice)}/yr × {company.expectedContractYears}{' '}
                        yrs
                      </span>
                    </dd>
                  </div>

                  <div className="lead-card__meta-row">
                    <dt className="lead-card__meta-label">Readiness Signal</dt>
                    <dd style={{ margin: 0 }}>
                      <StatusBadge status={tier.status}>{tier.label}</StatusBadge>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="lead-card__footer">
                <span>View attack plan &amp; pricing breakdown</span>
                <span className="lead-card__arrow" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
