import { Wrench } from 'lucide-react'

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-[#FEF3C7] flex items-center justify-center mx-auto mb-4">
          <Wrench size={28} className="text-[#D97706]" />
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Under Maintenance</h1>
        <p className="mt-2 text-sm text-[#475569]">
          We're performing scheduled maintenance. We'll be back shortly.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-[#2563EB] text-white text-sm rounded-md hover:bg-[#1D4ED8] transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
