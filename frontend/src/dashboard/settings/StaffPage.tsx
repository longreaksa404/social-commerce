import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useFeedback } from '../../components/feedback.ts'
import { Button, ErrorMessage, ErrorState, Field, IconButton, Input, PasswordInput, Section, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import { fieldError, formError } from '../../lib/errors.ts'
import { formatPhone } from '../../lib/orders.ts'
import type { StaffMember } from '../../lib/types.ts'
import { keys, useStaff } from '../queries.ts'

/** Settings → Staff (owner only): helpers who log in with their own email
 * and can do everything but Settings (founder's choice 2026-10-08). No
 * email is sent: the owner gives them their email and first password. */
export function StaffPage() {
  const staff = useStaff()
  return (
    <div className="space-y-4">
      {staff.isPending ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : staff.error ? (
        <ErrorState error={staff.error} onRetry={() => staff.refetch()} />
      ) : (
        <StaffList staff={staff.data} />
      )}
      <AddStaff />
    </div>
  )
}

function StaffList({ staff }: { staff: StaffMember[] }) {
  const s = useT().settings
  const [resetting, setResetting] = useState<string | null>(null)
  return (
    <Section title={s.staff}>
      {staff.length === 0 ? (
        <p className="text-sm text-slate-500">{s.noStaff}</p>
      ) : (
        <ul className="-my-2 divide-y divide-slate-100">
          {staff.map((member) => (
            <li key={member.id} className="py-3">
              <StaffRow member={member} resetting={resetting === member.id} onReset={setResetting} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function StaffRow({
  member,
  resetting,
  onReset,
}: {
  member: StaffMember
  resetting: boolean
  onReset: (id: string | null) => void
}) {
  const queryClient = useQueryClient()
  const { toast, confirm } = useFeedback()
  const [password, setPassword] = useState('')
  const s = useT().settings

  const remove = useMutation({
    mutationFn: () => api(`/seller/staff/${member.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.staff })
      toast(s.staffRemoved(member.full_name))
    },
  })
  const reset = useMutation({
    mutationFn: () => api(`/seller/staff/${member.id}/password`, { method: 'POST', body: { password } }),
    onSuccess: () => {
      setPassword('')
      onReset(null)
      toast(s.staffPasswordSet(member.full_name))
    },
  })

  async function askRemove() {
    const ok = await confirm({
      title: s.removeStaffTitle(member.full_name),
      message: s.removeStaffMessage,
      confirmLabel: s.removeStaff,
      danger: true,
    })
    if (ok) remove.mutate()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    reset.mutate()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* The buttons go under the name when the email wouldn't fit beside them. */}
        <div className="min-w-0 flex-1 basis-56">
          <p className="truncate font-medium text-slate-900">{member.full_name}</p>
          <p className="truncate text-sm text-slate-500">
            {member.email}
            {member.phone && ` · ${formatPhone(member.phone)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={KeyRound} onClick={() => onReset(resetting ? null : member.id)}>
            {s.newPassword}
          </Button>
          <IconButton icon={Trash2} tone="danger" disabled={remove.isPending} onClick={askRemove} label={s.removeStaffTitle(member.full_name)} />
        </div>
      </div>
      {resetting && (
        <form onSubmit={submit} className="space-y-3 rounded-xl bg-slate-50 p-3">
          <Field label={s.newPasswordFor(member.full_name)} error={fieldError(reset.error, 'password')} hint={s.newPasswordForHint}>
            <PasswordInput required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <ErrorMessage error={formError(reset.error, ['password'])} />
          <Button type="submit" loading={reset.isPending} className="w-full sm:w-auto">
            {s.saveNewPassword}
          </Button>
        </form>
      )}
      <ErrorMessage error={remove.error} />
    </div>
  )
}

const EMPTY = { full_name: '', phone: '', email: '', password: '' }

function AddStaff() {
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [form, setForm] = useState(EMPTY)
  const t = useT()
  const s = t.settings
  const set = (field: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const add = useMutation({
    mutationFn: () => api<StaffMember>('/seller/staff', { method: 'POST', body: form }),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: keys.staff })
      toast(s.staffAdded(member.full_name))
      setForm(EMPTY)
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    add.mutate()
  }

  return (
    <Section title={s.addStaff} description={s.addStaffHint}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={s.staffName} error={fieldError(add.error, 'full_name')}>
          <Input required maxLength={100} autoComplete="off" autoCapitalize="words" value={form.full_name} onChange={set('full_name')} />
        </Field>
        <Field label={t.auth.register.phone} error={fieldError(add.error, 'phone')}>
          <Input required type="tel" inputMode="tel" autoComplete="off" placeholder="012 345 678" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label={s.staffEmail} error={fieldError(add.error, 'email')}>
          <Input
            required
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={form.email}
            onChange={set('email')}
          />
        </Field>
        <Field label={s.firstPassword} error={fieldError(add.error, 'password')} hint={s.firstPasswordHint}>
          <PasswordInput required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <ErrorMessage error={formError(add.error, Object.keys(EMPTY))} />
        <Button type="submit" icon={UserPlus} loading={add.isPending} className="w-full sm:w-auto">
          {s.addStaff}
        </Button>
      </form>
    </Section>
  )
}
