import { Field, Input } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'

/** What a seller logs in with: their phone number (2026-10-09). Accounts
 * from before log in with an email, behind a link, so the phone keypad
 * (which has no @) stays the default. */
export function LoginField({
  value,
  onChange,
  byEmail,
  onByEmailChange,
  enterKeyHint,
}: {
  value: string
  onChange: (value: string) => void
  byEmail: boolean
  onByEmailChange: (byEmail: boolean) => void
  enterKeyHint: 'next' | 'send'
}) {
  const t = useT()
  return (
    <div>
      <Field label={byEmail ? t.auth.email : t.auth.phone}>
        <Input
          type={byEmail ? 'email' : 'tel'}
          inputMode={byEmail ? 'email' : 'tel'}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={enterKeyHint}
          placeholder={byEmail ? undefined : '012 345 678'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
      <button
        type="button"
        onClick={() => {
          onByEmailChange(!byEmail)
          onChange('')
        }}
        className="inline-flex min-h-11 items-center text-sm font-medium text-navy-700 hover:underline"
      >
        {byEmail ? t.auth.usePhone : t.auth.useEmail}
      </button>
    </div>
  )
}
