import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { extractError } from '@/utils/format'

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Must include uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string(),
    businessName: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export default function Register() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    try {
      await authApi.register({ ...values, role: 'retailer' })
      toast.success('Account created! Please log in.')
      navigate('/login')
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
          <p className="text-sm text-[#94A3B8] mt-1">Create your retailer account</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-5">Register</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="Rahul Sharma"
                error={errors.name?.message}
                required
                {...register('name')}
              />
              <Input
                label="Business Name"
                placeholder="Sharma Telecom"
                error={errors.businessName?.message}
                {...register('businessName')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="rahul@example.com"
                error={errors.email?.message}
                required
                {...register('email')}
              />
              <Input
                label="Phone"
                placeholder="9876543210"
                error={errors.phone?.message}
                required
                {...register('phone')}
              />
            </div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 chars with upper, lower, number, special"
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
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              error={errors.confirmPassword?.message}
              required
              {...register('confirmPassword')}
            />

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Create Account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[#94A3B8]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2563EB] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
