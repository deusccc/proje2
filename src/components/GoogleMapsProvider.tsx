'use client'

import { LoadScript, Libraries } from '@react-google-maps/api'
import { ReactNode } from 'react'

const libraries: Libraries = ['places']

interface GoogleMapsProviderProps {
  children: ReactNode
}

export default function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.error('Google Maps API anahtarı bulunamadı')
    return <div>Google Maps API anahtarı bulunamadı</div>
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={libraries}
      language="tr"
      region="TR"
      loadingElement={<div>Google Maps yükleniyor...</div>}
    >
      {children}
    </LoadScript>
  )
} 