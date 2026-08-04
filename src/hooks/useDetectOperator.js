import { useState, useEffect, useRef } from 'react'
import { providerApi } from '@/api/provider'

const MOBILE_TYPES = ['MOBILE_PREPAID', 'MOBILE_POSTPAID']

export function useDetectOperator(mobileValue, rechargeType) {
  const [detecting, setDetecting] = useState(false)
  const [detectedOperator, setDetectedOperator] = useState(null)
  const debounceRef = useRef(null)
  const lastDetectedMobile = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!MOBILE_TYPES.includes(rechargeType)) {
      setDetectedOperator(null)
      return
    }

    if (!mobileValue || !/^[6-9]\d{9}$/.test(mobileValue)) {
      setDetectedOperator(null)
      return
    }

    if (lastDetectedMobile.current === mobileValue) return

    debounceRef.current = setTimeout(async () => {
      setDetecting(true)
      try {
        const res = await providerApi.detectOperator(mobileValue)
        const data = res.data?.data

        if (!data || data.source === 'undetected' || !data.operatorCode) {
          setDetectedOperator(null)
          return
        }

        lastDetectedMobile.current = mobileValue
        setDetectedOperator(data)
      } catch {
        setDetectedOperator(null)
      } finally {
        setDetecting(false)
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [mobileValue, rechargeType])

  const reset = () => {
    setDetectedOperator(null)
    lastDetectedMobile.current = null
  }

  return { detecting, detectedOperator, reset }
}
