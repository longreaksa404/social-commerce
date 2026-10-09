import { Link } from 'react-router'
import { useT } from '../i18n/useT.ts'

/** Under "Create store": signing up accepts the terms and the privacy
 * policy (Meta and TikTok ask for both to be shown). */
export function AgreeLine() {
  const l = useT().legal
  const link = 'font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900'
  return (
    <p className="text-center text-xs leading-5 text-slate-500">
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
  )
}
