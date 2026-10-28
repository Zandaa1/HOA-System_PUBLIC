export interface Branding {
  hoaName: string
  hoaFullName: string
  hoaAddress: string
  hoaLogoUrl: string
  hoaFaviconUrl: string
  hoaWebsite: string
  hoaHelpdeskEmail: string
}

export const DEFAULT_BRANDING: Branding = {
  hoaName: 'HOA System',
  hoaFullName: 'HOA System',
  hoaAddress: 'Demo community address',
  hoaLogoUrl: '/placeholder-logo.svg',
  hoaFaviconUrl: '/icon.svg',
  hoaWebsite: 'https://example.invalid',
  hoaHelpdeskEmail: 'helpdesk@example.invalid',
}

export function getBranding(
  settings: Array<{ setting_key: string; setting_value: string | null }>,
): Branding {
  const get = (key: string, fallback: string) =>
    settings.find((s) => s.setting_key === key)?.setting_value || fallback

  return {
    hoaName: get('hoa_name', DEFAULT_BRANDING.hoaName),
    hoaFullName: get('hoa_full_name', DEFAULT_BRANDING.hoaFullName),
    hoaAddress: get('hoa_address', DEFAULT_BRANDING.hoaAddress),
    hoaLogoUrl: get('hoa_logo_url', DEFAULT_BRANDING.hoaLogoUrl),
    hoaFaviconUrl: get('hoa_favicon_url', DEFAULT_BRANDING.hoaFaviconUrl),
    hoaWebsite: get('hoa_website', DEFAULT_BRANDING.hoaWebsite),
    hoaHelpdeskEmail: get('hoa_helpdesk_email', DEFAULT_BRANDING.hoaHelpdeskEmail),
  }
}
