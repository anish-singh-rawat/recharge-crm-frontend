import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Shield, Monitor, Clock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'
import Card, { CardHeader } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDateTime, getInitials, extractError } from '@/utils/format'

const profileSchema = z.object({
  name: z.string().min(2, 'Name required'),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }).optional(),
})

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Must include upper, lower, number, special'),
  confirmNewPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmNewPassword, {
  message: 'Passwords do not match', path: ['confirmNewPassword'],
})

export default function Profile() {
  const queryClient = useQueryClient()
  const { user, updateUser } = useAuthStore()
  const fileRef = useRef()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile(),
    select: (r) => r.data.data,
  })

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => authApi.getSessions(),
    select: (r) => r.data.data || [],
  })

  const { data: loginHistory } = useQuery({
    queryKey: ['login-history'],
    queryFn: () => authApi.getLoginHistory(),
    select: (r) => r.data.data || [],
  })

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    values: profile ? {
      name: profile.name || '',
      businessName: profile.businessName || '',
      gstNumber: profile.gstNumber || '',
      panNumber: profile.panNumber || '',
      address: profile.address || {},
    } : {},
  })

  const pwForm = useForm({ resolver: zodResolver(pwSchema) })

  const updateProfileMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: (res) => {
      toast.success('Profile updated')
      updateUser(res.data.data)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const changePwMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully')
      pwForm.reset()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const avatarMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('avatar', file)
      return authApi.uploadAvatar(fd)
    },
    onSuccess: (res) => {
      toast.success('Avatar updated')
      updateUser({ avatar: res.data.data?.avatar })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Profile</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Manage your account details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-2xl font-bold">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    getInitials(profile?.name)
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white hover:bg-[#1D4ED8] transition-colors"
                >
                  <Camera size={13} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) avatarMutation.mutate(file)
                  }}
                />
              </div>
              <div>
                <p className="text-base font-semibold text-[#0F172A]">{profile?.name}</p>
                <p className="text-sm text-[#94A3B8]">{profile?.email}</p>
                <Badge variant="primary" className="mt-1 capitalize">
                  {profile?.role?.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-2 text-sm">
              {[
                ['Phone', profile?.phone],
                ['Business', profile?.businessName || '—'],
                ['Member since', formatDateTime(profile?.createdAt)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-[#94A3B8]">{l}</span>
                  <span className="font-medium text-[#0F172A] text-right">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Edit Profile" />
            <form onSubmit={profileForm.handleSubmit((d) => updateProfileMutation.mutate(d))} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Full Name"
                  error={profileForm.formState.errors.name?.message}
                  required
                  {...profileForm.register('name')}
                />
                <Input label="Business Name" {...profileForm.register('businessName')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="GST Number" placeholder="27AAPFU0939F1ZV" {...profileForm.register('gstNumber')} />
                <Input label="PAN Number" placeholder="AAPFU0939F" {...profileForm.register('panNumber')} />
              </div>
              <p className="text-xs font-medium text-[#94A3B8] pt-1">Address</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Street" placeholder="123 Main St" {...profileForm.register('address.street')} />
                <Input label="City" placeholder="Mumbai" {...profileForm.register('address.city')} />
                <Input label="State" placeholder="Maharashtra" {...profileForm.register('address.state')} />
                <Input label="Pincode" placeholder="400001" {...profileForm.register('address.pincode')} />
              </div>
              <Button type="submit" loading={updateProfileMutation.isPending}>
                Save Changes
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Change Password" />
            <form onSubmit={pwForm.handleSubmit((d) => changePwMutation.mutate(d))} className="space-y-3">
              <Input
                label="Current Password"
                type={showCurrent ? 'text' : 'password'}
                error={pwForm.formState.errors.currentPassword?.message}
                required
                rightElement={
                  <button type="button" onClick={() => setShowCurrent((s) => !s)} className="text-[#94A3B8]">
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                {...pwForm.register('currentPassword')}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="New Password"
                  type={showNew ? 'text' : 'password'}
                  error={pwForm.formState.errors.newPassword?.message}
                  required
                  rightElement={
                    <button type="button" onClick={() => setShowNew((s) => !s)} className="text-[#94A3B8]">
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  {...pwForm.register('newPassword')}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  error={pwForm.formState.errors.confirmNewPassword?.message}
                  required
                  {...pwForm.register('confirmNewPassword')}
                />
              </div>
              <Button type="submit" variant="secondary" loading={changePwMutation.isPending}>
                Change Password
              </Button>
            </form>
          </Card>

          {sessions?.length > 0 && (
            <Card>
              <CardHeader title="Active Sessions" icon={<Monitor size={16} />} />
              <div className="space-y-2">
                {sessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0 text-sm">
                    <div className="flex items-center gap-2">
                      <Monitor size={14} className="text-[#94A3B8]" />
                      <span className="text-[#475569]">{s.deviceName || 'Unknown device'}</span>
                    </div>
                    <span className="text-xs text-[#94A3B8]">{formatDateTime(s.createdAt)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
