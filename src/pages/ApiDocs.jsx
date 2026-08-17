import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, CheckCircle, ChevronDown, ChevronRight, Zap, Wallet, LayoutGrid, Globe } from 'lucide-react'
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
        onClick={() => onCopy(code, copyKey)}
        className="absolute top-2.5 right-2.5 p-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] transition-colors"
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
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
      <button
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

function EndpointRow({ method, path, description, params, body, responseExample, errorExamples, copyKey, onCopy, copiedKey }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
      <button
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

          {params && (
            <div>
              <p className="text-xs font-semibold text-[#0F172A] mb-2">Parameters</p>
              <div className="space-y-1.5">
                {params.map((p) => (
                  <div key={p.name} className="flex items-start gap-2 text-xs">
                    <code className="font-mono text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded shrink-0">{p.name}</code>
                    <span className="text-[#94A3B8]">{p.in}</span>
                    {p.required && <span className="text-[#DC2626]">required</span>}
                    <span className="text-[#475569]">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {body && (
            <div>
              <p className="text-xs font-semibold text-[#0F172A] mb-2">Request Body</p>
              <CodeBlock code={body} copyKey={`${copyKey}-body`} onCopy={onCopy} copiedKey={copiedKey} />
            </div>
          )}

          {responseExample && (
            <div>
              <p className="text-xs font-semibold text-[#0F172A] mb-2">Response</p>
              <CodeBlock code={responseExample} copyKey={`${copyKey}-res`} onCopy={onCopy} copiedKey={copiedKey} />
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">API Documentation</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Integrate recharge services into your own application</p>
      </div>

      <Card>
        <CardHeader title="Base URL" />
        <CodeBlock
          code={EXT_BASE}
          copyKey="base-url"
          onCopy={copy}
          copiedKey={copiedKey}
        />
        <p className="text-xs text-[#94A3B8] mt-2">All API requests must be made to this base URL.</p>
      </Card>

      <Card>
        <CardHeader title="Authentication" />
        <p className="text-sm text-[#475569] mb-3">
          Every request must include your API key in the <code className="bg-[#F1F5F9] px-1.5 py-0.5 rounded font-mono text-xs text-[#2563EB]">X-Api-Key</code> request header.
        </p>

        {activeKey && (
          <div className="mb-3 p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-lg">
            <p className="text-xs font-semibold text-[#16A34A] mb-1">Your Active Key — {activeKey.name}</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs text-[#0F172A] flex-1 break-all">{displayKey}</code>
              <button
                onClick={() => copy(activeKey.keyPrefix, 'active-key')}
                className="shrink-0 p-1 rounded hover:bg-[#DCFCE7] transition-colors text-[#16A34A]"
              >
                {copiedKey === 'active-key' ? <CheckCircle size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1">Go to API Keys page to copy your full key.</p>
          </div>
        )}

        <CodeBlock
          code={authHeader}
          copyKey="auth-header"
          onCopy={copy}
          copiedKey={copiedKey}
        />

        <div className="mt-3 space-y-1.5">
          {[
            ['401', 'API key missing or invalid'],
            ['401', 'API key has expired'],
            ['403', 'Request IP not in allowed list'],
          ].map(([status, msg]) => (
            <div key={msg} className="flex items-center gap-2 text-xs p-2 bg-[#FFF5F5] border border-[#FCA5A5] rounded-lg">
              <span className="font-bold text-[#DC2626]">{status}</span>
              <span className="text-[#7F1D1D]">{msg}</span>
            </div>
          ))}
        </div>
      </Card>

      <Section title="Recharge" icon={Zap} defaultOpen>
        <EndpointRow
          method="POST"
          path="/recharge"
          description="Initiate a mobile prepaid or postpaid recharge"
          copyKey="recharge-initiate"
          onCopy={copy}
          copiedKey={copiedKey}
          body={JSON.stringify({
            mobileNumber: '9876543210',
            amount: 199,
            operatorId: '6a6f8d11d8fcb29986f98350',
            circleId: '6a6f8d11d8fcb29986f98344',
            type: 'MOBILE_PREPAID',
          }, null, 2)}
          params={[
            { name: 'mobileNumber', in: 'body', required: true, description: '10-digit mobile number' },
            { name: 'amount', in: 'body', required: true, description: 'Recharge amount in INR' },
            { name: 'operatorId', in: 'body', required: true, description: 'Operator MongoDB ID (from GET /ext/operators)' },
            { name: 'circleId', in: 'body', required: true, description: 'Circle MongoDB ID (from GET /ext/circles)' },
            { name: 'type', in: 'body', required: true, description: 'MOBILE_PREPAID or MOBILE_POSTPAID' },
          ]}
          responseExample={JSON.stringify({
            success: true,
            message: 'Recharge initiated!',
            data: {
              txnId: 'TXN1234567890',
              status: 'PROCESSING',
              mobileNumber: '9876543210',
              amount: 199,
              operator: 'Jio',
              createdAt: '2026-08-04T10:00:00.000Z',
            },
          }, null, 2)}
          errorExamples={[
            { status: '400', message: 'Validation error — missing or invalid fields' },
            { status: '402', message: 'Insufficient wallet balance' },
            { status: '422', message: 'Invalid operator or circle' },
            { status: '429', message: 'Rate limit exceeded' },
          ]}
        />

        <EndpointRow
          method="GET"
          path="/recharge"
          description="Get your recharge transaction history"
          copyKey="recharge-list"
          onCopy={copy}
          copiedKey={copiedKey}
          params={[
            { name: 'page', in: 'query', required: false, description: 'Page number (default: 1)' },
            { name: 'limit', in: 'query', required: false, description: 'Results per page (default: 10, max: 100)' },
            { name: 'status', in: 'query', required: false, description: 'Filter by status: SUCCESS, FAILED, PENDING, PROCESSING' },
            { name: 'mobileNumber', in: 'query', required: false, description: 'Filter by mobile number' },
            { name: 'startDate', in: 'query', required: false, description: 'ISO date string' },
            { name: 'endDate', in: 'query', required: false, description: 'ISO date string' },
          ]}
          responseExample={JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  txnId: 'TXN1234567890',
                  mobileNumber: '9876543210',
                  amount: 199,
                  status: 'SUCCESS',
                  operator: { name: 'Jio' },
                  createdAt: '2026-08-04T10:00:00.000Z',
                },
              ],
              pagination: { page: 1, limit: 10, total: 42, totalPages: 5 },
            },
          }, null, 2)}
          errorExamples={[{ status: '401', message: 'Authentication required' }]}
        />

        <EndpointRow
          method="GET"
          path="/recharge/:txnId"
          description="Get status of a specific transaction"
          copyKey="recharge-status"
          onCopy={copy}
          copiedKey={copiedKey}
          params={[
            { name: 'txnId', in: 'path', required: true, description: 'Transaction ID returned from POST /recharge' },
          ]}
          responseExample={JSON.stringify({
            success: true,
            data: {
              txnId: 'TXN1234567890',
              status: 'SUCCESS',
              mobileNumber: '9876543210',
              amount: 199,
              providerTxnId: 'MR98765',
              operatorRef: 'JIO123456',
              createdAt: '2026-08-04T10:00:00.000Z',
            },
          }, null, 2)}
          errorExamples={[
            { status: '404', message: 'Transaction not found' },
            { status: '403', message: 'Access denied — not your transaction' },
          ]}
        />

        <div>
          <p className="text-xs font-semibold text-[#0F172A] mb-2">cURL Example</p>
          <CodeBlock
            code={curlBase('POST', '/recharge', JSON.stringify({ mobileNumber: '9876543210', amount: 199, operatorId: 'OPERATOR_ID', circleId: 'CIRCLE_ID', type: 'MOBILE_PREPAID' }))}
            copyKey="curl-recharge"
            onCopy={copy}
            copiedKey={copiedKey}
          />
        </div>
      </Section>

      <Section title="Wallet" icon={Wallet}>
        <EndpointRow
          method="GET"
          path="/wallet"
          description="Get your wallet balance and status"
          copyKey="wallet"
          onCopy={copy}
          copiedKey={copiedKey}
          responseExample={JSON.stringify({
            success: true,
            data: {
              wallet: {
                balance: 1500.00,
                status: 'ACTIVE',
                walletLimit: 100000,
                currency: 'INR',
              },
            },
          }, null, 2)}
          errorExamples={[{ status: '401', message: 'Authentication required' }]}
        />
      </Section>

      <Section title="Operators & Plans" icon={LayoutGrid}>
        <EndpointRow
          method="GET"
          path="/operators"
          description="Get all active operators (Jio, Airtel, Vi, BSNL etc.)"
          copyKey="operators"
          onCopy={copy}
          copiedKey={copiedKey}
          params={[
            { name: 'type', in: 'query', required: false, description: 'MOBILE_PREPAID or MOBILE_POSTPAID' },
          ]}
          responseExample={JSON.stringify({
            success: true,
            data: {
              operators: [
                { _id: '6a6f8d11d8fcb29986f98350', name: 'Jio', code: 'JIO', type: 'MOBILE_PREPAID' },
                { _id: '6a6f8d11d8fcb29986f98351', name: 'Airtel', code: 'AIRTEL', type: 'MOBILE_PREPAID' },
              ],
            },
          }, null, 2)}
          errorExamples={[{ status: '401', message: 'Authentication required' }]}
        />

        <EndpointRow
          method="GET"
          path="/circles"
          description="Get all active circles / states"
          copyKey="circles"
          onCopy={copy}
          copiedKey={copiedKey}
          responseExample={JSON.stringify({
            success: true,
            data: {
              circles: [
                { _id: '6a6f8d11d8fcb29986f98344', name: 'UP West & Uttarakhand', code: 'UW' },
                { _id: '6a6f8d11d8fcb29986f98345', name: 'Delhi', code: 'DL' },
              ],
            },
          }, null, 2)}
          errorExamples={[{ status: '401', message: 'Authentication required' }]}
        />

        <EndpointRow
          method="GET"
          path="/plans"
          description="Get recharge plans for a specific operator and circle"
          copyKey="plans"
          onCopy={copy}
          copiedKey={copiedKey}
          params={[
            { name: 'operatorId', in: 'query', required: true, description: 'Operator MongoDB ID' },
            { name: 'circleId', in: 'query', required: true, description: 'Circle MongoDB ID' },
          ]}
          responseExample={JSON.stringify({
            success: true,
            data: {
              popularPlans: [
                { amount: 199, validity: '28 Days', dataAmount: '1.5GB/day', description: '1.5GB/day, Unlimited Calling', isPopular: true },
              ],
              allPlans: [
                { amount: 19, validity: '1 Day', dataAmount: '200MB', description: '200MB Data' },
                { amount: 199, validity: '28 Days', dataAmount: '1.5GB/day', isPopular: true },
              ],
              total: 27,
            },
          }, null, 2)}
          errorExamples={[
            { status: '400', message: 'operatorId and circleId are required' },
            { status: '404', message: 'Operator or circle not found' },
          ]}
        />
      </Section>

      <Section title="Transaction Status Codes" icon={Globe}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['INITIATED', 'default', 'Transaction created, not yet processed'],
            ['PROCESSING', 'warning', 'Recharge request sent to provider'],
            ['PENDING', 'warning', 'Awaiting confirmation from provider'],
            ['SUCCESS', 'success', 'Recharge completed successfully'],
            ['FAILED', 'danger', 'Recharge failed — wallet refunded'],
            ['REFUNDED', 'default', 'Amount refunded to wallet'],
            ['TIMEOUT', 'danger', 'Provider did not respond in time'],
          ].map(([status, variant, desc]) => (
            <div key={status} className="flex items-start gap-2 p-2.5 border border-[#E2E8F0] rounded-lg">
              <Badge variant={variant}>{status}</Badge>
              <span className="text-xs text-[#475569] leading-snug">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Card>
        <CardHeader title="Complete Flow Example" />
        <div className="space-y-3">
          {[
            ['Step 1', 'Get operators', curlBase('GET', '/operators?type=MOBILE_PREPAID', null)],
            ['Step 2', 'Get circles', curlBase('GET', '/circles', null)],
            ['Step 3', 'Get plans', curlBase('GET', '/plans?operatorId=OPERATOR_ID&circleId=CIRCLE_ID', null)],
            ['Step 4', 'Initiate recharge', curlBase('POST', '/recharge', '{"mobileNumber":"9876543210","amount":199,"operatorId":"OPERATOR_ID","circleId":"CIRCLE_ID","type":"MOBILE_PREPAID"}')],
            ['Step 5', 'Check status', curlBase('GET', '/recharge/TXN_ID', null)],
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
