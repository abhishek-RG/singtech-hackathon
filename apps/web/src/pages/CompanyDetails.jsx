import { Link, useParams } from 'react-router';
import Button from '../components/Button.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  LEAD_COMPANIES,
  calculatePotentialSalePrice,
  formatCurrency,
  getCompanyById,
  getScoreTier,
} from '../features/lead-scoring/leadsData.js';
import '../features/lead-scoring/LeadScoring.css';

const POINTER_LABELS = [
  'Why They Are a Fit',
  'Current Infrastructure Gap',
  'Immediate Sales Action',
];

export default function CompanyDetails() {
  const { companyId } = useParams();
  const company = getCompanyById(companyId);

  if (!company) {
    return (
      <div className="container page-center">
        <p className="page-center__code">404</p>
        <h1>Company account not found</h1>
        <p className="text-muted">
          The requested enterprise or government lead could not be found in the scoring pipeline.
        </p>
        <Button to="/leads">Back to Lead Scoring Dashboard</Button>
      </div>
    );
  }

  const calculatedTotal = calculatePotentialSalePrice(
    company.yearlyPrice,
    company.expectedContractYears,
  );
  const tier = getScoreTier(company.engagementScore);
  const sectorClass =
    company.sector === 'Government' ? 'lead-sector-badge--government' : 'lead-sector-badge--mnc';

  return (
    <div className="container lead-page">
      <Link to="/leads" className="details-back">
        <span aria-hidden="true">←</span> Back to B2B Lead Scoring Dashboard
      </Link>

      <section className="details-hero" aria-labelledby="company-title">
        <div className="details-hero__main">
          <div className="details-hero__badges">
            <span className={`lead-sector-badge ${sectorClass}`}>{company.sector}</span>
            <StatusBadge status={tier.status}>{tier.label}</StatusBadge>
          </div>

          <h1 id="company-title" className="details-hero__title">
            {company.companyName}
          </h1>

          <p className="details-hero__product-line">
            Recommended Singtel Solution:{' '}
            <span className="details-hero__product-name">{company.recommendedProduct}</span>
          </p>
        </div>

        <div className="details-score-box" aria-label="Engagement score breakdown">
          <div className="details-score-box__header">
            <span className="details-score-box__label">Engagement Score</span>
            <span className="details-score-box__number">{company.engagementScore} / 100</span>
          </div>
          <div
            className="lead-meter"
            style={{ marginBottom: 0 }}
            role="progressbar"
            aria-valuenow={company.engagementScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Engagement score ${company.engagementScore} out of 100`}
          >
            <div className="lead-meter__fill" style={{ width: `${company.engagementScore}%` }} />
          </div>
        </div>
      </section>

      <section className="formula-card" aria-labelledby="formula-title">
        <div className="formula-card__header">
          <div>
            <h2 id="formula-title" className="card__title">
              Potential Sale Price Valuation Breakdown
            </h2>
            <p className="card__hint" style={{ marginTop: 'var(--space-1)' }}>
              Dynamically calculated from annual contract value and expected multi-year commitment.
            </p>
          </div>
          <code>potentialSalePrice = yearlyPrice * expectedContractYears</code>
        </div>

        <div className="formula-card__equation" role="region" aria-label="Pricing formula math">
          <div className="formula-step">
            <span className="formula-step__label">Yearly Price (ACV)</span>
            <span className="formula-step__value">{formatCurrency(company.yearlyPrice)}</span>
            <span className="formula-step__field">yearlyPrice / year</span>
          </div>

          <div className="formula-operator" aria-hidden="true">
            ×
          </div>

          <div className="formula-step">
            <span className="formula-step__label">Expected Contract Term</span>
            <span className="formula-step__value">
              {company.expectedContractYears}{' '}
              {company.expectedContractYears === 1 ? 'Year' : 'Years'}
            </span>
            <span className="formula-step__field">expectedContractYears</span>
          </div>

          <div className="formula-operator" aria-hidden="true">
            =
          </div>

          <div className="formula-step formula-step--result">
            <span className="formula-step__label">Potential Sale Price (TCV)</span>
            <span className="formula-step__value">{formatCurrency(calculatedTotal)}</span>
            <span className="formula-step__field">potentialSalePrice</span>
          </div>
        </div>

        <div className="formula-card__code-bar">
          Formula verification: <strong>{formatCurrency(company.yearlyPrice)}</strong> (yearlyPrice)
          {' × '}
          <strong>{company.expectedContractYears}</strong> (expectedContractYears) ={' '}
          <strong>{formatCurrency(calculatedTotal)}</strong> (potentialSalePrice)
        </div>
      </section>

      <div className="details-grid">
        <article className="card" aria-labelledby="pointers-title">
          <div className="card__header">
            <h2 id="pointers-title" className="card__title">
              Sales Representative Attack Plan
            </h2>
            <StatusBadge status="ok">3 Key Pointers</StatusBadge>
          </div>
          <p className="text-muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            Actionable intelligence covering strategic fit, current infrastructure gaps, and
            immediate next steps.
          </p>

          <ul className="pointers-list">
            {company.keyPointers.map((pointer, index) => (
              <li key={index} className="pointers-list__item">
                <span className="pointers-list__tag">
                  {POINTER_LABELS[index] ?? `Key Pointer ${index + 1}`}
                </span>
                <p className="pointers-list__text">{pointer}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="card" aria-labelledby="breakdown-title">
          <div className="card__header">
            <h2 id="breakdown-title" className="card__title">
              Deeper Account Breakdown
            </h2>
          </div>

          <dl className="breakdown-dl">
            <div className="breakdown-dl__row">
              <dt>Company Name</dt>
              <dd>{company.companyName}</dd>
            </div>
            <div className="breakdown-dl__row">
              <dt>Sector Classification</dt>
              <dd>{company.sector}</dd>
            </div>
            <div className="breakdown-dl__row">
              <dt>Engagement Score</dt>
              <dd>{company.engagementScore} / 100</dd>
            </div>
            <div className="breakdown-dl__row">
              <dt>Recommended Product</dt>
              <dd>{company.recommendedProduct}</dd>
            </div>
            <div className="breakdown-dl__row">
              <dt>Yearly Price (ACV)</dt>
              <dd>{formatCurrency(company.yearlyPrice)}</dd>
            </div>
            <div className="breakdown-dl__row">
              <dt>Expected Contract Years</dt>
              <dd>{company.expectedContractYears} years</dd>
            </div>
            <div className="breakdown-dl__row">
              <dt>Potential Sale Price (TCV)</dt>
              <dd style={{ color: 'var(--accent-text)', fontWeight: 800 }}>
                {formatCurrency(calculatedTotal)}
              </dd>
            </div>
          </dl>

          <p className="card__hint">
            All pricing figures are dynamically derived from annual licensing and managed service
            commitments.
          </p>
        </article>
      </div>

      <section className="card details-switcher" aria-label="Switch company account">
        <div>
          <h2 className="card__title">Compare Other Scored Accounts</h2>
          <p className="card__hint" style={{ marginTop: 'var(--space-1)' }}>
            Jump directly to another enterprise or government lead in your pipeline.
          </p>
        </div>

        <div className="details-switcher__links">
          {LEAD_COMPANIES.map((item) => (
            <Button
              key={item.id}
              to={`/leads/${item.id}`}
              variant={item.id === company.id ? 'primary' : 'secondary'}
              size="sm"
            >
              {item.companyName}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
