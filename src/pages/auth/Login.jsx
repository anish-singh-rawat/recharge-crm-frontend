import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { extractError } from '@/utils/format'

const schema = z.object({
  identifier: z.string().min(1, 'Email or phone required'),
  password: z.string().min(1, 'Password required'),
})

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [lockoutMsg, setLockoutMsg] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    setLockoutMsg('')
    try {
      const res = await authApi.login({
        ...values,
        deviceId: 'web-browser',
        deviceName: navigator.userAgent.slice(0, 100),
        deviceType: 'desktop',
      })
      login(res.data.data)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err?.response?.data?.message || ''
      if (
        msg.toLowerCase().includes('locked') ||
        msg.toLowerCase().includes('lock')
      ) {
        setLockoutMsg(msg)
      } else {
        toast.error(extractError(err))
      }
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
          <p className="text-sm text-[#94A3B8] mt-1">Fast. Reliable. Profitable.</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-5">Sign in to your account</h2>

          {lockoutMsg && (
            <div className="mb-4 flex items-start gap-2.5 p-3 bg-[#FEE2E2] border border-[#DC2626] rounded-lg">
              <Lock size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
              <p className="text-sm text-[#DC2626]">{lockoutMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email or Phone"
              placeholder="9876543210 or email@example.com"
              error={errors.identifier?.message}
              required
              {...register('identifier')}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              error={errors.password?.message}
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-[#94A3B8] hover:text-[#475569]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-[#2563EB] hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting} disabled={!!lockoutMsg}>
              Sign In
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[#94A3B8]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#2563EB] font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
