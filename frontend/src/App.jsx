import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import ColumnPicker from './components/ColumnPicker'
import DemoButton from './components/DemoButton'
import MetricCard from './components/MetricCard'
import GaugeChart from './components/GaugeChart'
import ShapChart from './components/ShapChart'
import ConflictBanner from './components/ConflictBanner'
import IntersectionalChart from './components/IntersectionalChart'
import TradeoffCurve from './components/TradeoffCurve'
import { fetchDemoIntersectional, fetchDemoTradeoff } from './utils/api'

const STATUS_TEXT = {
  fair: 'text-green-600',
  borderline: 'text-yellow-600',
  biased: 'text-red-600',
}

function DatasetInfoCard() {
  return (
    <div className="bg-blue-50/70 border border-blue-200 border-l-4 border-l-indigo-500 rounded-lg px-4 py-3">
      <h3 className="text-sm font-semibold text-slate-900">
        Nepal Financial Inclusion Survey 2021
      </h3>
      <p className="text-xs text-slate-500 mb-2">
        Source: World Bank Global Findex 2021
      </p>
      <ul className="text-sm text-slate-700 space-y-0.5">
        <li>• 58.8% of adults have a financial account</li>
        <li>• Women: 54.9% · Men: 63.2%</li>
        <li>• Raw gender gap: 8.3 percentage points</li>
      </ul>
      <p className="text-xs text-slate-500 italic mt-2">
        Audit below shows model-detected bias, which exceeds the raw gap due
        to compounding feature interactions.
      </p>
    </div>
  )
}

export default function App() {
  const [file, setFile] = useState(null)
  const [auditResult, setAuditResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDemo, setIsDemo] = useState(false)
  const [intersectional, setIntersectional] = useState(null)
  const [intersectionalLoading, setIntersectionalLoading] = useState(false)
  const [tradeoff, setTradeoff] = useState(null)
  const [tradeoffLoading, setTradeoffLoading] = useState(false)

  useEffect(() => {
    setAuditResult(null)
    setError(null)
    setIsDemo(false)
    setIntersectional(null)
    setIntersectionalLoading(false)
    setTradeoff(null)
    setTradeoffLoading(false)
  }, [file])

  const handleDemoResult = (data) => {
    setAuditResult(data)
    setIsDemo(true)
    setError(null)
    setIntersectional(null)
    setIntersectionalLoading(true)
    setTradeoff(null)
    setTradeoffLoading(true)
    fetchDemoIntersectional()
      .then((d) => setIntersectional(d))
      .catch((e) => console.warn('Intersectional fetch failed:', e))
      .finally(() => setIntersectionalLoading(false))
    fetchDemoTradeoff()
      .then((d) => setTradeoff(d))
      .catch((e) => console.warn('Tradeoff fetch failed:', e))
      .finally(() => setTradeoffLoading(false))
  }

  const handleUploadResult = (data) => {
    setAuditResult(data)
    setIsDemo(false)
    setError(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">FairLens</h1>
          <span className="text-slate-400 text-xs mt-0.5">
            Algorithmic bias auditing · Nepal financial inclusion data
          </span>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-300 hover:text-white text-sm font-medium"
        >
          GitHub
        </a>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <aside className="w-full md:w-2/5 bg-slate-800 text-slate-100 p-6 flex flex-col gap-6 border-r border-slate-700 overflow-y-auto">
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Quick start
            </h2>
            <DemoButton
              onResult={handleDemoResult}
              onLoading={setLoading}
              onError={setError}
            />
          </section>

          <div className="border-t border-slate-700"></div>

          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Upload your own
            </h2>
            <FileUpload onFileSelect={setFile} />
          </section>

          {file && (
            <section>
              <ColumnPicker
                file={file}
                onAuditResult={handleUploadResult}
                onLoading={setLoading}
                onError={setError}
              />
            </section>
          )}
        </aside>

        <main className="w-full md:w-3/5 bg-white p-6 md:p-8 overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-md px-4 py-3 text-sm"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="h-full min-h-[400px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 text-sm">Running audit…</p>
              </div>
            </div>
          ) : auditResult ? (
            <div className="flex flex-col gap-6">
              {auditResult.conflict?.has_conflict && (
                <ConflictBanner conflict={auditResult.conflict} />
              )}

              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-1">
                  Audit Results
                </h2>
                <p className="text-sm text-slate-500">
                  Overall status:{' '}
                  <span
                    className={`font-semibold ${
                      STATUS_TEXT[auditResult.summary.overall_status] || 'text-slate-700'
                    }`}
                  >
                    {String(auditResult.summary.overall_status).toUpperCase()}
                  </span>
                  {auditResult.summary?.num_biased_metrics !== undefined && (
                    <span className="ml-2 text-slate-400">
                      ({auditResult.summary.num_biased_metrics} of 4 metrics biased)
                    </span>
                  )}
                </p>
              </div>

              <GaugeChart metrics={auditResult.metrics} />

              {isDemo && <DatasetInfoCard />}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MetricCard
                  name="Demographic Parity"
                  description="Approval rate gap"
                  data={auditResult.metrics.demographic_parity}
                  humanize={isDemo}
                />
                <MetricCard
                  name="Disparate Impact"
                  description="Ratio of approval rates"
                  data={auditResult.metrics.disparate_impact}
                  humanize={isDemo}
                />
                <MetricCard
                  name="Equal Opportunity"
                  description="True positive rate gap"
                  data={auditResult.metrics.equal_opportunity}
                  humanize={isDemo}
                />
                <MetricCard
                  name="Equalized Odds"
                  description="TPR & FPR difference"
                  data={auditResult.metrics.equalized_odds}
                  humanize={isDemo}
                />
              </div>

              <ShapChart shap={auditResult.shap} />

              {isDemo && (
                <section>
                  <div className="mb-3">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Beyond Single-Attribute Analysis
                    </h2>
                    <p className="text-sm text-slate-500">
                      Intersectional analysis reveals compounding disadvantage
                      invisible to single-attribute audits.
                    </p>
                  </div>
                  {intersectionalLoading ? (
                    <div className="bg-white rounded-lg border border-slate-200 p-5">
                      <div className="h-5 w-56 bg-slate-200 rounded animate-pulse mb-2" />
                      <div className="h-4 w-72 bg-slate-200 rounded animate-pulse mb-4" />
                      <div className="h-64 bg-slate-100 rounded animate-pulse" />
                    </div>
                  ) : intersectional ? (
                    <IntersectionalChart
                      data={intersectional}
                      title="Intersectional Analysis: Gender × Income"
                      subtitle="Approval rates by combined demographic group"
                    />
                  ) : null}
                </section>
              )}

              {isDemo && (
                <section>
                  <div className="mb-3">
                    <h2 className="text-lg font-semibold text-slate-900">
                      The Cost of Fairness
                    </h2>
                    <p className="text-sm text-slate-500">
                      Based on Hardt et al. (2016) — equality of opportunity
                      in supervised learning.
                    </p>
                  </div>
                  {tradeoffLoading ? (
                    <div className="bg-white rounded-lg border border-slate-200 p-5">
                      <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-2" />
                      <div className="h-4 w-64 bg-slate-200 rounded animate-pulse mb-4" />
                      <div className="h-64 bg-slate-100 rounded animate-pulse" />
                    </div>
                  ) : tradeoff ? (
                    <TradeoffCurve
                      data={tradeoff}
                      title="The Fairness-Accuracy Tradeoff"
                      subtitle="What does it cost to make this model fair?"
                    />
                  ) : null}
                </section>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400">
              <svg
                className="w-16 h-16 mb-4 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-lg text-slate-500">Run an audit to see results</p>
              <p className="text-sm mt-1">Try the demo or upload your own CSV</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
