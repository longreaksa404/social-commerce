import { Navigate, useParams } from 'react-router'

/** /dashboard/admin/...: the admin page moved to /admin (2026-10-28); its
 * earlier Telegram alerts link here, with or without a shop logged in. */
export function OldAdminLink() {
  const shop = useParams()['*']
  return <Navigate to={shop ? `/admin/shops/${shop}` : '/admin'} replace />
}
