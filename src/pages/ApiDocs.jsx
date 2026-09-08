import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, CheckCircle, ChevronDown, ChevronRight, Zap, Wallet, LayoutGrid, Globe, Info, ShieldCheck } from 'lucide-react'
import { apiKeysApi } from '@/api/apiKeys'
import { useIsReady } from '@/hooks/useIsReady'
import Card, { CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

const BASE_URL = (import.meta.env.VITE_API_URL || 'https://api.rechpays.in/api/v1').replace(/\/$/, '')
const EXT_BASE = `${BASE_URL}/ext`

function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null)
  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }
  return { copy, copiedKey }
}

function CodeBlock({ code, copyKey, onCopy, copiedKey }) {
  return (
    <div className="relative">
      <pre className="bg-[#0F172A] text-[#E2E8F0] text-xs rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
        {code}
      </pre>
      <button
        type="button"
        onClick={() => onCopy(code, copyKey)}
        className="absolute top-2.5 right-2.5 p-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] transition-colors"
        title="Copy to clipboard"
      >
        {copiedKey === copyKey
          ? <CheckCircle size={13} className="text-[#16A34A]" />
          : <Copy size={13} />}
      </button>
    </div>
  )
}

function MethodBadge({ method }) {
  const colors = {
    GET:    'bg-[#DCFCE7] text-[#16A34A]',
    POST:   'bg-[#DBEAFE] text-[#2563EB]',
    PATCH:  'bg-[#FEF3C7] text-[#D97706]',
    DELETE: 'bg-[#FEE2E2] text-[#DC2626]',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${colors[method] || 'bg-[#F1F5F9] text-[#475569]'}`}>
      {method}
    </span>
  )
}

function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-[#2563EB]" />}
          <span className="font-semibold text-[#0F172A] text-sm">{title}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-[#94A3B8]" /> : <ChevronRight size={16} className="text-[#94A3B8]" />}
      </button>
      {open && <div className="p-4 space-y-4 border-t border-[#E2E8F0]">{children}</div>}
    </div>
  )
}

function EndpointRow({
  method,
  path,
  description,
  params,
  body,
  responseExample,
  responseExamples,
  errorExamples,
  copyKey,
  onCopy,
  copiedKey,
  note,
}) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const examples = responseExamples || (responseExample ? [{ title: 'Response', code: responseExample }] : [])

  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-[#F8FAFC] transition-colors text-left"
      >
        <MethodBadge method={method} />
        <code className="text-xs font-mono text-[#475569] flex-1">{path}</code>
        <span className="text-xs text-[#94A3B8] hidden sm:block">{description}</span>
        {open ? <ChevronDown size={14} className="text-[#94A3B8] shrink-0" /> : <ChevronRight size={14} className="text-[#94A3B8] shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-[#E2E8F0] p-4 space-y-4 bg-white">
          <p className="text-sm text-[#475569]">{description}</p>

          {note && (
            <div className="flex items-start gap-2 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs text-[#1E40AF]">
              <Info size={15} className="text-[#2563EB] shrink-0 mt-0.5" />
              <div>{note}</div>
            </div>
          )}

          {params && (
            <div>
              <p className="text-xs font-semibold text-[#0F172A] mb-2">Parameters</p>
              <div className="space-y-1.5">
                {params.map((p) => (
                  <div key={p.name} className="flex items-start gap-2 text-xs flex-wrap">
                    <code className="font-mono text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded shrink-0">{p.name}</code>
                    <span className="text-[#94A3B8] font-mono text-[11px]">{p.in}</span>
                    {p.required ? (
                      <span className="text-[#DC2626] font-semibold text-[11px]">required</span>
                    ) : (
                      <span className="text-[#64748B] text-[11px]">optional</span>
                    )}
                    <span className="text-[#475569]">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {body && (
            <div>
              <p className="text-xs font-semibold text-[#0F172A] mb-2">Request Body (JSON)</p>
              <CodeBlock code={body} copyKey={`${copyKey}-body`} onCopy={onCopy} copiedKey={copiedKey} />
            </div>
          )}

          {examples.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[#0F172A]">Response Format</p>
                {examples.length > 1 && (
                  <div className="flex gap-1">
                    {examples.map((ex, idx) => (
                      <button
                        key={ex.title}
                        type="button"
                        onClick={() => setActiveTab(idx)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          activeTab === idx
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
                        }`}
                      >
                        {ex.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <CodeBlock
                code={examples[activeTab]?.code || ''}
                copyKey={`${copyKey}-res-${activeTab}`}
                onCopy={onCopy}
                copiedKey={copiedKey}
              />
            </div>
          )}

          {errorExamples?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#0F172A] mb-2">Error Responses</p>
              <div className="space-y-2">
                {errorExamples.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-[#FFF5F5] border border-[#FCA5A5] rounded-lg text-xs">
                    <span className="font-bold text-[#DC2626] shrink-0">{e.status}</span>
                    <span className="text-[#7F1D1D]">{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ApiDocs() {
  const ready = useIsReady()
  const { copy, copiedKey } = useCopy()

  const { data: keys = [] } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeysApi.getApiKeys(),
    select: (r) => r.data.data?.keys || r.data.data || [],
    enabled: ready,
  })

  const activeKey = keys.find((k) => k.isActive)
  const displayKey = activeKey ? `${activeKey.keyPrefix}••••••••••••••••` : 'YOUR_API_KEY'

  const authHeader = `X-Api-Key: ${displayKey}`

  const curlBase = (method, path, body) =>
    `curl -X ${method} "${EXT_BASE}${path}" \\
  -H "X-Api-Key: ${displayKey}" \\
  -H "Content-Type: application/json"${body ? ` \\\n  -d '${body}'` : ''}`

  const curlGetRecharge = `curl -X GET "${EXT_BASE}/recharge?mobileNumber=9099277662&amount=11&operatorId=OPERATOR_ID&circleId=CIRCLE_ID&apiKey=${displayKey}"`

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">API Documentation</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Integrate recharge services into your applications, billing software, or portals</p>
      </div>

      {/* Base URL */}
      <Card>
        <CardHeader title="Base URL" />
        <CodeBlock
          code={EXT_BASE}
          copyKey="base-url"
          onCopy={copy}
          copiedKey={copiedKey}
        />
        <p className="text-xs text-[#94A3B8] mt-2">All external partner API requests must be made to this base URL.</p>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader title="Authentication" />
        <p className="text-sm text-[#475569] mb-3">
          Every request must include your active API key. You can authenticate either via the request header or directly in URL query parameters:
        </p>

        {activeKey && (
          <div className="mb-3 p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-lg">
            <p className="text-xs font-semibold text-[#16A34A] mb-1">Your Active Key — {activeKey.name}</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs text-[#0F172A] flex-1 break-all">{displayKey}</code>
              <button
                type="button"
                onClick={() => copy(activeKey.keyPrefix, 'active-key')}
                className="shrink-0 p-1 rounded hover:bg-[#DCFCE7] transition-colors text-[#16A34A]"
                title="Copy prefix"
              >
                {copiedKey === 'active-key' ? <CheckCircle size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1">Go to API Keys page if you need to copy or generate full keys.</p>
          </div>
        )}

        <div className="space-y-2 mb-3">
          <p className="text-xs font-semibold text-[#0F172A]">Method 1: Header (Recommended)</p>
          <CodeBlock
            code={authHeader}
            copyKey="auth-header"
            onCopy={copy}
            copiedKey={copiedKey}
          />
          <p className="text-xs font-semibold text-[#0F172A] pt-1">Method 2: Query Parameter (for GET / legacy callers)</p>
          <CodeBlock
            code={`?apiKey=${displayKey}  (or ?x-api-key=${displayKey})`}
            copyKey="auth-query"
            onCopy={copy}
            copiedKey={copiedKey}
          />
        </div>

        <div className="mt-3 space-y-1.5">
          {[
            ['401', 'API key missing or invalid / revoked'],
            ['401', 'API key has expired'],
            ['403', 'Request IP not in allowed whitelist for this key'],
          ].map(([status, msg]) => (
            <div key={msg} className="flex items-center gap-2 text-xs p-2 bg-[#FFF5F5] border border-[#FCA5A5] rounded-lg">
              <span className="font-bold text-[#DC2626]">{status}</span>
              <span className="text-[#7F1D1D]">{msg}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Response Specification Card */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={18} className="text-[#16A34A]" />
          <h2 className="text-base font-semibold text-[#0F172A]">Recharge Response Format Specification</h2>
        </div>
        <p className="text-xs text-[#475569] mb-4">
          All recharge status checks and partner API endpoints return a standardized, comprehensive response structure:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-[#E2E8F0] rounded-lg mb-4">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-[#0F172A]">Field</th>
                <th className="px-3 py-2 text-left font-semibold text-[#0F172A]">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-[#0F172A]">Values / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">status</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">string</td>
                <td className="px-3 py-2 text-[#334155]">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#16A34A] font-bold font-mono mr-1">&quot;success&quot;</span> = Recharge Successful<br />
                  <span className="inline-block px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#D97706] font-bold font-mono mr-1 mt-1">&quot;pending&quot;</span> = Processing / Awaiting confirmation<br />
                  <span className="inline-block px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#DC2626] font-bold font-mono mr-1 mt-1">&quot;failure&quot;</span> = Failed (Amount not deducted or refunded)
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">txnId</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">string</td>
                <td className="px-3 py-2 text-[#334155]">
                  System-generated Unique Transaction ID (e.g. <code className="font-mono bg-[#F1F5F9] px-1 rounded text-[#0F172A]">TXNKX3A9B2F1C</code>).
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">clientTxnId</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">string | null</td>
                <td className="px-3 py-2 text-[#334155]">
                  Your custom reference transaction ID passed in the request (e.g. <code className="font-mono bg-[#F1F5F9] px-1 rounded text-[#0F172A]">GFG8678JH</code>).
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">providerTxnId</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">string</td>
                <td className="px-3 py-2 text-[#334155]">
                  Provider Reference ID / Operator Transaction ID (e.g. <code className="font-mono bg-[#F1F5F9] px-1 rounded text-[#0F172A]">BR000DYCXWJ2</code>). In failure scenarios, contains error reason or &quot;FAILED&quot;.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">operatorRef</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">string | null</td>
                <td className="px-3 py-2 text-[#334155]">
                  Operator Live Lapu Reference / Confirmation Number.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">number</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">string</td>
                <td className="px-3 py-2 text-[#334155]">10-digit recharged mobile number (e.g. <code className="font-mono bg-[#F1F5F9] px-1 rounded text-[#0F172A]">9099277662</code>).</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">amount</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">number</td>
                <td className="px-3 py-2 text-[#334155]">Recharge amount in INR (e.g. <code className="font-mono bg-[#F1F5F9] px-1 rounded text-[#0F172A]">11</code>).</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">operator</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">string | null</td>
                <td className="px-3 py-2 text-[#334155]">Telecom operator name / code (e.g. <code className="font-mono bg-[#F1F5F9] px-1 rounded text-[#0F172A]">Jio Prepaid</code>).</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">circle</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">string | null</td>
                <td className="px-3 py-2 text-[#334155]">Telecom circle name / code (e.g. <code className="font-mono bg-[#F1F5F9] px-1 rounded text-[#0F172A]">Delhi NCR</code>).</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">message</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">string</td>
                <td className="px-3 py-2 text-[#334155]">Operator response or error description message.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#2563EB] font-semibold">createdAt</td>
                <td className="px-3 py-2 font-mono text-[#64748B]">string (ISO)</td>
                <td className="px-3 py-2 text-[#334155]">Timestamp when the transaction was created.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recharge Section */}
      <Section title="Recharge" icon={Zap} defaultOpen>
        {/* POST /recharge */}
        <EndpointRow
          method="POST"
          path="/recharge"
          description="Initiate a mobile prepaid or postpaid recharge via POST (JSON body or form data)"
          copyKey="recharge-initiate-post"
          onCopy={copy}
          copiedKey={copiedKey}
          note="Supports custom clientTxnId (unique per retailer account). Supports field aliases: mobileNumber / number / mobile / phone, amount / amt, operatorId / operator / op, circleId / circle / state."
          body={JSON.stringify({
            mobileNumber: '9099277662',
            amount: 11,
            operatorId: '6a6f8d11d8fcb29986f98350',
            circleId: '6a6f8d11d8fcb29986f98344',
            clientTxnId: 'GFG8678JH',
            type: 'MOBILE_PREPAID',
          }, null, 2)}
          params={[
            { name: 'mobileNumber', in: 'body', required: true, description: '10-digit mobile number (or number / mobile / phone)' },
            { name: 'amount', in: 'body', required: true, description: 'Recharge amount in INR (or amt)' },
            { name: 'operatorId', in: 'body', required: true, description: 'Operator MongoDB ID (from GET /ext/operators)' },
            { name: 'circleId', in: 'body', required: false, description: 'Circle MongoDB ID (from GET /ext/circles, optional)' },
            { name: 'clientTxnId', in: 'body', required: false, description: 'Your custom unique transaction ID (e.g. GFG8678JH). Unique per retailer.' },
            { name: 'type', in: 'body', required: false, description: 'MOBILE_PREPAID or MOBILE_POSTPAID (default: MOBILE_PREPAID)' },
          ]}
          responseExamples={[
            {
              title: 'Success Response',
              code: JSON.stringify({
                status: 'success',
                txnId: 'TXNKX3A9B2F1C',
                clientTxnId: 'GFG8678JH',
                providerTxnId: 'BR000DYCXWJ2',
                operatorRef: '066362471414026100001',
                number: '9099277662',
                amount: 11,
                operator: 'Jio Prepaid',
                circle: 'Delhi NCR',
                message: 'Success|28|||066362471414026100001|066362471414026501731|066362471414026900001||066362471414026100000',
                createdAt: '2026-09-07T11:53:47.000Z',
              }, null, 2),
            },
            {
              title: 'Pending Response',
              code: JSON.stringify({
                status: 'pending',
                txnId: 'TXNKX3A9B2F1C',
                clientTxnId: 'GFG8678JH',
                providerTxnId: 'TXNKX3A9B2F1C',
                operatorRef: null,
                number: '9099277662',
                amount: 11,
                operator: 'Jio Prepaid',
                circle: 'Delhi NCR',
                message: 'Recharge is currently processing',
                createdAt: '2026-09-07T11:53:47.000Z',
              }, null, 2),
            },
            {
              title: 'Failure Response',
              code: JSON.stringify({
                status: 'failure',
                txnId: 'TXNKX3A9B2F1C',
                clientTxnId: 'GFG8678JH',
                providerTxnId: 'BR000DYCXWJ2',
                operatorRef: null,
                number: '9099277662',
                amount: 11,
                operator: 'Jio Prepaid',
                circle: 'Delhi NCR',
                message: 'Recharge failed: Provider connection timeout',
                createdAt: '2026-09-07T11:53:47.000Z',
              }, null, 2),
            },
          ]}
          errorExamples={[
            { status: '400', message: 'Validation failed: Please provide a valid 10-digit mobile number' },
            { status: '400', message: 'Duplicate clientTxnId. Transaction with ID \'GFG8678JH\' already exists for your account.' },
            { status: '402', message: 'Insufficient wallet balance' },
            { status: '422', message: 'Operator not found or inactive' },
            { status: '429', message: 'Rate limit exceeded: Too many recharge requests' },
          ]}
        />

        {/* GET /recharge (Initiate via URL) */}
        <EndpointRow
          method="GET"
          path="/recharge"
          description="Initiate a recharge via GET request with URL query parameters"
          copyKey="recharge-initiate-get"
          onCopy={copy}
          copiedKey={copiedKey}
          note="Convenient for legacy billing tools, SMS gateways, or URL callbacks that trigger recharges using simple HTTP GET."
          params={[
            { name: 'mobileNumber', in: 'query', required: true, description: '10-digit mobile number (or number / mobile)' },
            { name: 'amount', in: 'query', required: true, description: 'Recharge amount in INR (or amt)' },
            { name: 'operatorId', in: 'query', required: true, description: 'Operator MongoDB ID (or op)' },
            { name: 'circleId', in: 'query', required: false, description: 'Circle MongoDB ID (or circle, optional)' },
            { name: 'clientTxnId', in: 'query', required: false, description: 'Your custom unique transaction ID (e.g. GFG8678JH)' },
            { name: 'apiKey', in: 'query', required: false, description: 'API Key (if not passing in X-Api-Key header)' },
          ]}
          responseExamples={[
            {
              title: 'Success Response',
              code: JSON.stringify({
                status: 'success',
                txnId: 'TXNKX3A9B2F1C',
                clientTxnId: 'GFG8678JH',
                providerTxnId: 'BR000DYCXWJ2',
                operatorRef: '066362471414026100001',
                number: '9099277662',
                amount: 11,
                message: 'Success|28|||066362471414026100001|066362471414026501731|066362471414026900001||066362471414026100000',
              }, null, 2),
            },
            {
              title: 'Failure Response',
              code: JSON.stringify({
                status: 'failure',
                txnId: 'TXNKX3A9B2F1C',
                clientTxnId: 'GFG8678JH',
                providerTxnId: 'BR000DYCXWJ2',
                operatorRef: null,
                number: '9099277662',
                amount: 11,
                message: 'Operator rejected: Invalid denomination',
              }, null, 2),
            },
          ]}
        />

        {/* GET /recharge/:txnId */}
        <EndpointRow
          method="GET"
          path="/recharge/:txnId"
          description="Check current status of a recharge using either the System Transaction ID (e.g. TXN...) or your custom clientTxnId (e.g. GFG8678JH)"
          copyKey="recharge-status"
          onCopy={copy}
          copiedKey={copiedKey}
          note="You can query this endpoint using either your own custom clientTxnId (e.g. /recharge/GFG8678JH) or the system txnId (e.g. /recharge/TXNKX3A9B2F1C)."
          params={[
            { name: 'txnId', in: 'path', required: true, description: 'System Transaction ID OR your custom clientTxnId (e.g. GFG8678JH)' },
          ]}
          responseExamples={[
            {
              title: 'Success Status',
              code: JSON.stringify({
                status: 'success',
                txnId: 'TXNKX3A9B2F1C',
                clientTxnId: 'GFG8678JH',
                providerTxnId: 'BR000DYCXWJ2',
                operatorRef: '066362471414026100001',
                number: '9099277662',
                amount: 11,
                operator: 'Jio Prepaid',
                circle: 'Delhi NCR',
                message: 'Success|28|||066362471414026100001|066362471414026501731|066362471414026900001||066362471414026100000',
                createdAt: '2026-09-07T11:53:47.000Z',
              }, null, 2),
            },
            {
              title: 'Pending Status',
              code: JSON.stringify({
                status: 'pending',
                txnId: 'TXNKX3A9B2F1C',
                clientTxnId: 'GFG8678JH',
                providerTxnId: 'TXNKX3A9B2F1C',
                operatorRef: null,
                number: '9099277662',
                amount: 11,
                operator: 'Jio Prepaid',
                circle: 'Delhi NCR',
                message: 'Recharge is currently processing',
                createdAt: '2026-09-07T11:53:47.000Z',
              }, null, 2),
            },
            {
              title: 'Failed Status',
              code: JSON.stringify({
                status: 'failure',
                txnId: 'TXNKX3A9B2F1C',
                clientTxnId: 'GFG8678JH',
                providerTxnId: 'FAILED',
                operatorRef: null,
                number: '9099277662',
                amount: 11,
                operator: 'Jio Prepaid',
                circle: 'Delhi NCR',
                message: 'Recharge failed: Provider connection timeout',
                createdAt: '2026-09-07T11:53:47.000Z',
              }, null, 2),
            },
          ]}
          errorExamples={[
            { status: '404', message: 'Transaction not found' },
            { status: '403', message: 'Access denied: not your transaction' },
          ]}
        />

        {/* GET /recharge (History list) */}
        <EndpointRow
          method="GET"
          path="/recharge"
          description="Get your paginated recharge transaction history (called without mobileNumber/amount)"
          copyKey="recharge-list"
          onCopy={copy}
          copiedKey={copiedKey}
          params={[
            { name: 'page', in: 'query', required: false, description: 'Page number (default: 1)' },
            { name: 'limit', in: 'query', required: false, description: 'Results per page (default: 20, max: 100)' },
            { name: 'status', in: 'query', required: false, description: 'Filter status: SUCCESS, FAILED, PENDING, PROCESSING, REFUNDED, TIMEOUT' },
            { name: 'mobileNumber', in: 'query', required: false, description: 'Filter by 10-digit mobile number' },
            { name: 'startDate', in: 'query', required: false, description: 'Filter start date (ISO 8601, e.g. 2026-09-01)' },
            { name: 'endDate', in: 'query', required: false, description: 'Filter end date (ISO 8601, e.g. 2026-09-03)' },
          ]}
          responseExample={JSON.stringify({
            success: true,
            message: 'Transactions retrieved',
            data: {
              items: [
                {
                  _id: '6a6f8d11d8fcb29986f98399',
                  txnId: 'TXNKX3A9B2F1C',
                  mobileNumber: '9099277662',
                  amount: 11,
                  status: 'SUCCESS',
                  operator: {
                    _id: '6a6f8d11d8fcb29986f98350',
                    name: 'Jio',
                    code: 'JIO',
                  },
                  circle: {
                    _id: '6a6f8d11d8fcb29986f98344',
                    name: 'Delhi',
                    code: 'DL',
                  },
                  providerTxnId: 'BR000DYCXWJ2',
                  createdAt: '2026-09-03T10:00:00.000Z',
                },
              ],
              pagination: {
                page: 1,
                limit: 20,
                total: 42,
                totalPages: 3,
                hasNext: true,
                hasPrev: false,
              },
            },
          }, null, 2)}
          errorExamples={[{ status: '401', message: 'Authentication required' }]}
        />

        <div className="pt-2">
          <p className="text-xs font-semibold text-[#0F172A] mb-2">cURL Examples</p>
          <div className="space-y-2">
            <div>
              <p className="text-[11px] text-[#64748B] mb-1">POST JSON Recharge:</p>
              <CodeBlock
                code={curlBase('POST', '/recharge', JSON.stringify({ mobileNumber: '9099277662', amount: 11, operatorId: 'OPERATOR_ID', circleId: 'CIRCLE_ID', type: 'MOBILE_PREPAID' }))}
                copyKey="curl-recharge-post"
                onCopy={copy}
                copiedKey={copiedKey}
              />
            </div>
            <div>
              <p className="text-[11px] text-[#64748B] mb-1">GET URL Recharge:</p>
              <CodeBlock
                code={curlGetRecharge}
                copyKey="curl-recharge-get"
                onCopy={copy}
                copiedKey={copiedKey}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Wallet Section */}
      <Section title="Wallet" icon={Wallet}>
        <EndpointRow
          method="GET"
          path="/wallet"
          description="Get your wallet balance, status, and transaction totals"
          copyKey="wallet"
          onCopy={copy}
          copiedKey={copiedKey}
          responseExample={JSON.stringify({
            success: true,
            message: 'Wallet retrieved',
            data: {
              wallet: {
                _id: '6a6f8d11d8fcb29986f98311',
                balance: 1500.00,
                pendingAmount: 0,
                totalCredited: 10000.00,
                totalDebited: 8500.00,
                totalCommission: 150.00,
                status: 'ACTIVE',
                walletLimit: 100000,
                currency: 'INR',
              },
            },
          }, null, 2)}
          errorExamples={[{ status: '401', message: 'Authentication required' }]}
        />
      </Section>

      {/* Operators & Plans Section */}
      <Section title="Operators & Plans" icon={LayoutGrid}>
        <EndpointRow
          method="GET"
          path="/operators"
          description="Get all active operators (Jio, Airtel, Vi, BSNL, etc.)"
          copyKey="operators"
          onCopy={copy}
          copiedKey={copiedKey}
          params={[
            { name: 'type', in: 'query', required: false, description: 'Filter by type: MOBILE_PREPAID or MOBILE_POSTPAID' },
          ]}
          responseExample={JSON.stringify({
            success: true,
            message: 'Active operators retrieved',
            data: {
              operators: [
                {
                  _id: '6a6f8d11d8fcb29986f98350',
                  name: 'Jio',
                  code: 'JIO',
                  type: 'MOBILE_PREPAID',
                  minAmount: 10,
                  maxAmount: 10000,
                  commission: 2.5,
                },
                {
                  _id: '6a6f8d11d8fcb29986f98351',
                  name: 'Airtel',
                  code: 'AIRTEL',
                  type: 'MOBILE_PREPAID',
                  minAmount: 10,
                  maxAmount: 10000,
                  commission: 2.2,
                },
              ],
            },
          }, null, 2)}
          errorExamples={[{ status: '401', message: 'Authentication required' }]}
        />

        <EndpointRow
          method="GET"
          path="/circles"
          description="Get all telecom circles / states"
          copyKey="circles"
          onCopy={copy}
          copiedKey={copiedKey}
          responseExample={JSON.stringify({
            success: true,
            message: 'Circles retrieved',
            data: {
              circles: [
                { _id: '6a6f8d11d8fcb29986f98344', name: 'Delhi', code: 'DL' },
                { _id: '6a6f8d11d8fcb29986f98345', name: 'UP West & Uttarakhand', code: 'UW' },
                { _id: '6a6f8d11d8fcb29986f98346', name: 'Maharashtra & Goa', code: 'MH' },
              ],
            },
          }, null, 2)}
          errorExamples={[{ status: '401', message: 'Authentication required' }]}
        />

        <EndpointRow
          method="GET"
          path="/plans"
          description="Get recharge plans and recommendations for a specific operator and circle"
          copyKey="plans"
          onCopy={copy}
          copiedKey={copiedKey}
          params={[
            { name: 'operatorId', in: 'query', required: true, description: 'Operator MongoDB ID (from GET /ext/operators)' },
            { name: 'circleId', in: 'query', required: true, description: 'Circle MongoDB ID (from GET /ext/circles)' },
          ]}
          responseExample={JSON.stringify({
            success: true,
            message: 'Plan recommendations retrieved',
            data: {
              popularPlans: [
                {
                  _id: '6a6f8d11d8fcb29986f98360',
                  amount: 199,
                  validity: '28 Days',
                  dataAmount: '1.5GB/day',
                  description: '1.5GB/day, Unlimited Calling, 100 SMS/day',
                  isPopular: true,
                },
              ],
              allPlans: [
                {
                  _id: '6a6f8d11d8fcb29986f98361',
                  amount: 19,
                  validity: '1 Day',
                  dataAmount: '1GB',
                  description: '1GB High Speed Data',
                  isPopular: false,
                },
                {
                  _id: '6a6f8d11d8fcb29986f98360',
                  amount: 199,
                  validity: '28 Days',
                  dataAmount: '1.5GB/day',
                  description: '1.5GB/day, Unlimited Calling, 100 SMS/day',
                  isPopular: true,
                },
              ],
              regularPlans: [
                {
                  _id: '6a6f8d11d8fcb29986f98361',
                  amount: 19,
                  validity: '1 Day',
                  dataAmount: '1GB',
                  description: '1GB High Speed Data',
                  isPopular: false,
                },
              ],
              total: 2,
              source: 'CACHE',
              cachedAt: '2026-09-03T06:00:00.000Z',
              operator: '6a6f8d11d8fcb29986f98350',
              circle: '6a6f8d11d8fcb29986f98344',
            },
          }, null, 2)}
          errorExamples={[
            { status: '400', message: 'operatorId and circleId are required' },
            { status: '404', message: 'Operator or circle not found' },
          ]}
        />
      </Section>

      {/* Transaction Status Codes Reference */}
      <Section title="Transaction Status Codes Reference" icon={Globe}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['SUCCESS', 'success', 'Recharge completed successfully. `success: true` is returned.'],
            ['PROCESSING', 'warning', 'Recharge sent to operator, processing in real time. `success: "PENDING"`.'],
            ['PENDING', 'warning', 'Awaiting operator confirmation. `success: "PENDING"`.'],
            ['FAILED', 'danger', 'Recharge failed. `success: false`. Wallet refunded automatically.'],
            ['REFUNDED', 'default', 'Transaction was refunded back to your wallet.'],
            ['TIMEOUT', 'danger', 'Operator did not respond in time. Flagged for status check / auto-refund.'],
          ].map(([status, variant, desc]) => (
            <div key={status} className="flex items-start gap-2 p-2.5 border border-[#E2E8F0] rounded-lg">
              <Badge variant={variant}>{status}</Badge>
              <span className="text-xs text-[#475569] leading-snug">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Complete Integration Step-by-Step Flow */}
      <Card>
        <CardHeader title="Complete Integration Flow" />
        <div className="space-y-3">
          {[
            ['Step 1', 'Get active operators', curlBase('GET', '/operators?type=MOBILE_PREPAID', null)],
            ['Step 2', 'Get telecom circles / states', curlBase('GET', '/circles', null)],
            ['Step 3', 'Fetch plan recommendations', curlBase('GET', '/plans?operatorId=OPERATOR_ID&circleId=CIRCLE_ID', null)],
            ['Step 4', 'Initiate recharge (POST JSON)', curlBase('POST', '/recharge', '{"mobileNumber":"9099277662","amount":11,"operatorId":"OPERATOR_ID","circleId":"CIRCLE_ID","type":"MOBILE_PREPAID"}')],
            ['Step 4 (Alt)', 'Initiate recharge (GET URL method)', curlGetRecharge],
            ['Step 5', 'Check transaction status', curlBase('GET', '/recharge/TXN_ID_OR_PROVIDER_ID', null)],
            ['Step 6', 'Check wallet balance', curlBase('GET', '/wallet', null)],
          ].map(([step, label, code]) => (
            <div key={step}>
              <p className="text-xs font-semibold text-[#0F172A] mb-1.5">{step} — {label}</p>
              <CodeBlock code={code} copyKey={step} onCopy={copy} copiedKey={copiedKey} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
