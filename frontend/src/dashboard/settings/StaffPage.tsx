import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useFeedback } from '../../components/feedback.ts'
import { Button, Card, ErrorMessage, ErrorState, Field, Input, MenuButton, PasswordInput, Section, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import { fieldError, formError } from '../../lib/errors.ts'
import { formatPhone } from '../../lib/orders.ts'
import type { StaffMember } from '../../lib/types.ts'
import { keys, useStaff } from '../queries.ts'

/** Settings → Staff (owner only): helpers who log in with their own phone
 * number and can do everything but Settings (founder's choice 2026-10-08;
 * phone numbers since 2026-10-09). Nothing is sent: the owner gives them
 * their first password. */
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

/** No title of its own: the page is called Staff already (settings
 * check #11, founder 2026-10-19). */
function StaffList({ staff }: { staff: StaffMember[] }) {
  const s = useT().settings
  // The one row with a form open: its edit or its new password.
  const [open, setOpen] = useState<{ id: string; form: RowForm } | null>(null)
  return (
    <Card className="px-4 py-2 sm:px-6">
      {staff.length === 0 ? (
        <p className="py-2 text-sm text-slate-500">{s.noStaff}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {staff.map((member) => (
            <li key={member.id} className="py-3">
              <StaffRow
                member={member}
                form={open?.id === member.id ? open.form : null}
                onForm={(form) => setOpen(form && { id: member.id, form })}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

type RowForm = 'edit' | 'password'

/** A helper: their name and login, and a ⋯ menu with Edit (founder's
 * test list #26, 2026-10-24), New password (asks first, #27) and Remove. */
function StaffRow({
  member,
  form,
  onForm,
}: {
  member: StaffMember
  form: RowForm | null
  onForm: (form: RowForm | null) => void
}) {
  const queryClient = useQueryClient()
  const { toast, confirm } = useFeedback()
  const [password, setPassword] = useState('')
  const [details, setDetails] = useState({ full_name: member.full_name, phone: member.phone ? formatPhone(member.phone) : '' })
  const t = useT()
  const s = t.settings

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
      onForm(null)
      toast(s.staffPasswordSet(member.full_name))
    },
  })
  const edit = useMutation({
    mutationFn: () =>
      api<StaffMember>(`/seller/staff/${member.id}`, {
        method: 'PATCH',
        body: { full_name: details.full_name, ...(details.phone ? { phone: details.phone } : {}) },
      }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: keys.staff })
      onForm(null)
      toast(s.staffSaved(saved.full_name))
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

  function openForm(next: RowForm) {
    reset.reset()
    edit.reset()
    setPassword('')
    setDetails({ full_name: member.full_name, phone: member.phone ? formatPhone(member.phone) : '' })
    onForm(next)
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault()
    // They forgot theirs, so it isn't asked; asking first is (test list #27).
    const ok = await confirm({
      title: s.setPasswordTitle(member.full_name),
      message: s.setPasswordMessage(member.full_name),
      confirmLabel: s.setPasswordConfirm,
    })
    if (ok) reset.mutate()
  }

  function submitEdit(event: FormEvent) {
    event.preventDefault()
    edit.mutate()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">{member.full_name}</p>
          <p className="truncate text-sm text-slate-500 tabular-nums">
            {member.phone ? formatPhone(member.phone) : member.email}
          </p>
        </div>
        <MenuButton
          label={s.staffMore(member.full_name)}
          disabled={remove.isPending}
          items={[
            { label: s.editStaff, icon: Pencil, onSelect: () => openForm('edit') },
            { label: s.newPassword, icon: KeyRound, onSelect: () => openForm('password') },
            { label: s.removeStaff, icon: Trash2, danger: true, onSelect: askRemove },
          ]}
        />
      </div>
      {form === 'edit' && (
        <form onSubmit={submitEdit} className="space-y-3 rounded-xl bg-slate-50 p-3">
          <Field label={s.staffName} error={fieldError(edit.error, 'full_name')}>
            <Input
              required
              maxLength={100}
              autoComplete="off"
              autoCapitalize="words"
              value={details.full_name}
              onChange={(e) => setDetails((d) => ({ ...d, full_name: e.target.value }))}
            />
          </Field>
          <Field label={s.staffPhone} error={fieldError(edit.error, 'phone')}>
            <Input
              required={Boolean(member.phone)}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={details.phone}
              onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
            />
          </Field>
          <ErrorMessage error={formError(edit.error, ['full_name', 'phone'])} />
          <div className="flex gap-2">
            <Button type="submit" loading={edit.isPending} className="flex-1 sm:flex-none">
              {t.common.save}
            </Button>
            <Button variant="secondary" onClick={() => onForm(null)} className="flex-1 sm:flex-none">
              {t.common.cancel}
            </Button>
          </div>
        </form>
      )}
      {form === 'password' && (
        <form onSubmit={submitPassword} className="space-y-3 rounded-xl bg-slate-50 p-3">
          <Field label={s.newPasswordFor(member.full_name)} error={fieldError(reset.error, 'password')} hint={s.firstPasswordHint}>
            <PasswordInput required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <ErrorMessage error={formError(reset.error, ['password'])} />
          <div className="flex gap-2">
            <Button type="submit" loading={reset.isPending} className="flex-1 sm:flex-none">
              {s.saveNewPassword}
            </Button>
            <Button variant="secondary" onClick={() => onForm(null)} className="flex-1 sm:flex-none">
              {t.common.cancel}
            </Button>
          </div>
        </form>
      )}
      <ErrorMessage error={remove.error} />
    </div>
  )
}

const EMPTY = { full_name: '', phone: '', password: '' }

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
    <Section title={s.addStaff}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={s.staffName} error={fieldError(add.error, 'full_name')}>
          <Input required maxLength={100} autoComplete="off" autoCapitalize="words" value={form.full_name} onChange={set('full_name')} />
        </Field>
        <Field label={s.staffPhone} error={fieldError(add.error, 'phone')}>
          <Input required type="tel" inputMode="tel" autoComplete="off" placeholder="012 345 678" value={form.phone} onChange={set('phone')} />
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
