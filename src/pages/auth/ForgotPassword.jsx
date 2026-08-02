import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { extractError } from '@/utils/format'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email('Invalid email address'),
})

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    try {
      await authApi.forgotPassword(values.email)
      setSent(true)
      toast.success('Reset link sent to your email')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2563EB] mb-3">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">RechargeCRM</h1>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="text-base font-semibold text-[#0F172A]">Check your email</h2>
              <p className="mt-1 text-sm text-[#475569]">
                We've sent a password reset link to your email address.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-flex items-center gap-2 text-sm text-[#2563EB] hover:underline"
              >
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-1">Forgot password?</h2>
              <p className="text-sm text-[#94A3B8] mb-5">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="rahul@example.com"
                  error={errors.email?.message}
                  required
                  {...register('email')}
                />
                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Send Reset Link
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-[#94A3B8]">
                Remember your password?{' '}
                <Link to="/login" className="text-[#2563EB] font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
