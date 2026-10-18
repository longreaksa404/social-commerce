import { useCallback, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { PhoneCheck } from '../auth/PhoneCheck.tsx'
import { SocialButtons } from '../auth/SocialButtons.tsx'
import { buttonClass } from '../components/styles.ts'
import { useAuth } from '../auth/useAuth.ts'
import { Button, ErrorMessage, Field, Input, PasswordInput, SlowNotice } from '../components/ui.tsx'
import { ApiError } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import { forgetDraft, useKeepDraft, useSavedDraft } from '../lib/signup.ts'
import { useShopLink } from '../lib/slug.ts'
import type { PhoneCheck as Check } from '../lib/types.ts'
import { useT } from '../i18n/useT.ts'
import { AgreeLine } from './AgreeLine.tsx'
import { AuthLayout } from './AuthLayout.tsx'
import { ShopLinkField } from './ShopLinkField.tsx'

const FIELDS = ['store_name', 'slug', 'phone_check', 'password']
const DRAFT_KEY = 'sc.register'

/** Sign-up with a phone number and password (founder's choice
 * 2026-10-09). The number is the one the seller shares with the Telegram
 * bot, so it's really theirs; that chat also gets the shop's order
 * alerts, and the seller's name is that Telegram account's (2026-10-18;
 * Settings → Your account changes it). What they type (not the password) and the check they opened
 * are kept for 30 minutes, for a page that reloads while they're in
 * Telegram (`lib/signup.ts`). */
export function Register() {
  const { status, register } = useAuth()
  const navigate = useNavigate()
  const draft = useSavedDraft(DRAFT_KEY)
  const [form, setForm] = useState({ store_name: draft?.store_name ?? '', password: '' })
  const { slug, typed, setSlug } = useShopLink(form.store_name, draft?.slug)
  const [phone, setPhone] = useState<Check | null>(null)
  // The check opened in Telegram, kept in the draft.
  const [opened, setOpened] = useState<Check | null>(draft?.check ?? null)
  // A new PhoneCheck when the one handed in turned out to be used up.
  const [phoneKey, setPhoneKey] = useState(0)
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const t = useT()
  useKeepDraft(DRAFT_KEY, { store_name: form.store_name, slug: typed, check: opened })

  const onPhone = useCallback((check: Check | null) => {
    setPhone(check)
    if (!check) setOpened(null)
    setError(null)
  }, [])

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!phone || phone.taken) {
      if (!phone) {
        setError(new ApiError(422, 'PHONE_NOT_VERIFIED', 'Verify your phone number with Telegram first.', 'phone_check'))
      }
      return
    }
    setPending(true)
    setError(null)
    try {
      await register({ ...form, slug: slug || undefined, phone_check: phone.id })
      forgetDraft(DRAFT_KEY)
      navigate('/dashboard/products', { replace: true })
    } catch (err) {
      setError(err)
      if (err instanceof ApiError && err.code === 'PHONE_CHECK_EXPIRED') {
        setPhone(null)
        setOpened(null)
        setPhoneKey((n) => n + 1)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title={t.auth.createYourStore}
      footer={
        <>
          {t.auth.register.haveAccount}{' '}
          <Link to="/login" className="font-semibold text-navy-700 link">
            {t.auth.logIn}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 lg:space-y-3">
        {/* The phone number first: every shop has one, checked in Telegram,
            and it's how the seller logs in (founder's pick 1A, 2026-10-18). */}
        <PhoneCheck
          key={phoneKey}
          label={t.auth.register.phoneLabel}
          error={fieldError(error, 'phone_check')}
          onChange={onPhone}
          resume={opened}
          onOpen={setOpened}
          required
          taken={{
            message: t.auth.phoneCheck.taken,
            action: (
              <Link to="/login" className={buttonClass()}>
                {t.auth.logIn}
              </Link>
            ),
          }}
        />
        <Field label={t.auth.register.storeName} error={fieldError(error, 'store_name')} hint={t.auth.register.storeNameHint}>
          <Input
            required
            maxLength={100}
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder={t.common.example('Sokha Fashion')}
            value={form.store_name}
            onChange={set('store_name')}
          />
        </Field>
        <ShopLinkField slug={slug} storeName={form.store_name} onChange={setSlug} error={error} />
        {/* For password managers: the login this password goes with. */}
        <input type="tel" autoComplete="username" value={phone?.phone ?? ''} hidden readOnly />
        <Field label={t.auth.password} error={fieldError(error, 'password')} hint={t.auth.register.passwordHint}>
          <PasswordInput
            required
            autoComplete="new-password"
            enterKeyHint="go"
            minLength={8}
            value={form.password}
            onChange={set('password')}
          />
        </Field>
        <ErrorMessage error={formError(error, FIELDS)} />
        <Button type="submit" size="lg" loading={pending} disabled={phone?.taken} className="w-full">
          {t.auth.register.submit}
        </Button>
        {pending && <SlowNotice />}
        <AgreeLine />
      </form>
      <SocialButtons label={t.auth.social.orSignUp} />
    </AuthLayout>
  )
}
