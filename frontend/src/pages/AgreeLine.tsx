import { Link } from 'react-router'
import { useT } from '../i18n/useT.ts'

/** Under "Create store": what Oak Order costs after the free trial
 * (01_PRODUCT.md §33.1), and that signing up accepts the terms and the
 * privacy policy (Meta and TikTok ask for both to be shown). */
export function AgreeLine() {
  const l = useT().legal
  const link = 'font-medium text-slate-700 link hover:text-slate-900'
  return (
    <div className="space-y-1 text-center">
      <p className="text-sm font-medium text-slate-700">{l.trialLine}</p>
      <p className="text-xs leading-5 text-slate-500">
        {l.agreeStart}{' '}
        <Link to="/terms" className={link}>
          {l.terms}
        </Link>{' '}
        {l.agreeAnd}{' '}
        <Link to="/privacy" className={link}>
          {l.privacy}
        </Link>
        {l.agreeEnd}
      </p>
    </div>
  )
}
