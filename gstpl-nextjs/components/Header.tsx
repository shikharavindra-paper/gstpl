'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { LOGO_KEY } from '@/lib/constants'

export default function Header() {
  const [logoSrc, setLogoSrc] = useState<string>('/GSTPL_logo.jpg')

  useEffect(() => {
    const savedLogo = localStorage.getItem(LOGO_KEY)
    if (savedLogo) {
      setLogoSrc(savedLogo)
    }
  }, [])

  return (
    <div className="company-header">
      <img 
        id="logoImg"
        src={logoSrc}
        alt="Logo"
        className="logo"
        crossOrigin="anonymous"
      />
      <div className="title">
        <h2>GAYATRISHAKTI TISSUE</h2>
        <div className="sub">
          Plot no.808/D, 3rd Phase, GIDC<br />
          Vapi-396195, Gujarat INDIA
        </div>
      </div>
      <div className="rightbox" aria-hidden="true"></div>
    </div>
  )
}