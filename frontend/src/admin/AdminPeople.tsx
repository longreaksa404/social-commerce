import { ChevronRight, Search } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { cardClass } from '../components/styles.ts'
import { Button, EmptyState, ErrorState, Input, Skeleton } from '../components/ui.tsx'
import type { AdminSeller } from '../lib/types.ts'
import { AdminPageHeader } from './AdminHeader.tsx'
import { AdminPerson } from './AdminPerson.tsx'
import { useListParams } from './listParams.ts'
import { useAdminPeople } from './queries.ts'
import { ago, initials, loginOf } from './shared.ts'

const PROVIDER = { google: 'Google', facebook: 'Facebook' } as const

/** How a login gets in, in a few words: "Phone, password, Telegram". */
function waysIn(person: AdminSeller) {
  return [
    person.phone ? 'Phone' : person.email ? 'Email' : null,
    person.has_password ? 'password' : null,
    person.role === 'owner' && person.phone ? 'Telegram' : null,
    ...person.logins.map((login) => PROVIDER[login.provider]),
  ]
    .filter(Boolean)
    .join(', ')
}

/** /admin/people and /admin/people/:sellerId: everyone who logs in, owners
 * and staff of every shop (part 8), searchable by name, phone or shop.
 * Redesign pick 7A (2026-11-06), as Shops: a table on a laptop with nobody
 * open; a person opens beside a narrow list; the search is in the address
 * (useListParams). On a phone, rows, and a person as its own page. */
export function AdminPeople() {
  const { sellerId } = useParams()
  const people = useAdminPeople()
  const { params, update, listSearch } = useListParams()
  const query = params.get('q') ?? ''

  const words = query.trim().toLowerCase()
  const digits = words.replace(/\D/g, '')
  const shown = (people.data ?? []).filter(
    (person) =>
      !words ||
      person.name.toLowerCase().includes(words) ||
      person.shop.toLowerCase().includes(words) ||
      (person.email ?? '').includes(words) ||
      (digits.length > 2 && (person.phone ?? '').replace(/\D/g, '').includes(digits.replace(/^855/, '0'))),
  )

  const list = (
    <div className="space-y-3">
      <div className={sellerId ? '' : 'lg:max-w-md'}>
        <Input
          type="search"
          leading={<Search aria-hidden className="size-4" />}
          placeholder="Name, phone or shop"
          aria-label="Search people"
          value={query}
          onChange={(e) => update({ q: e.target.value })}
        />
      </div>
      {people.isPending ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : people.error ? (
        <ErrorState error={people.error} onRetry={() => people.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title={words ? `Nobody matches “${query.trim()}”` : 'Nobody here'}
          action={
            words ? (
              <Button variant="secondary" onClick={() => update({ q: null })}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : sellerId ? (
        <ul className={`${cardClass} divide-y divide-slate-100 overflow-hidden`}>
          {shown.map((person) => (
            <li key={person.id}>
              <Row person={person} selected={person.id === sellerId} search={listSearch} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="text-sm text-slate-500 sm:px-1">{shown.length === 1 ? '1 login' : `${shown.length} logins`}</p>
          <Table people={shown} search={listSearch} />
          <ul className={`${cardClass} divide-y divide-slate-100 overflow-hidden lg:hidden`}>
            {shown.map((person) => (
              <li key={person.id}>
                <Row person={person} selected={false} search={listSearch} wide />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )

  return (
    <>
      <title>People · Oak Order admin</title>
      <AdminPageHeader title="People" phone={!sellerId} />
      {sellerId ? (
        <div className="lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="hidden lg:sticky lg:top-5 lg:block lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto lg:pb-2">{list}</div>
          <AdminPerson key={sellerId} sellerId={sellerId} />
        </div>
      ) : (
        list
      )}
    </>
  )
}

/** Laptops, nobody open: one row per login with how they get in. */
function Table({ people, search }: { people: AdminSeller[]; search: string }) {
  return (
    <div className={`${cardClass} hidden overflow-x-auto lg:block`}>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            {['Name', 'Role', 'Shop', 'Login', 'Logs in with', 'Last used'].map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {people.map((person) => (
            <tr key={person.id} className="relative transition-colors hover:bg-slate-50">
              <td className="min-w-48 px-4 py-2.5">
                <Link
                  to={`/admin/people/${person.id}${search}`}
                  className="flex items-center gap-3 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-navy-600"
                >
                  <Initials name={person.name} />
                  <span className="font-medium break-words text-slate-900">{person.name}</span>
                </Link>
              </td>
              <td className="px-4 py-2.5 text-slate-700">{person.role === 'owner' ? 'Owner' : 'Staff'}</td>
              <td className="min-w-48 px-4 py-2.5 text-slate-700">
                <span className="line-clamp-2 break-words">{person.shop}</span>
                {!person.is_open && <span className="text-xs text-slate-500">Closed</span>}
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap text-slate-700 tabular-nums">{loginOf(person)}</td>
              <td className="px-4 py-2.5 text-slate-500">{waysIn(person)}</td>
              <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{person.last_seen ? ago(person.last_seen) : 'Not logged in'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Initials({ name }: { name: string }) {
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-sm font-semibold text-navy-700">
      {initials(name)}
    </span>
  )
}

function Row({ person, selected, search, wide = false }: { person: AdminSeller; selected: boolean; search: string; wide?: boolean }) {
  return (
    <Link
      to={`/admin/people/${person.id}${search}`}
      aria-current={selected ? 'page' : undefined}
      className={`flex items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 ${
        selected ? 'bg-navy-50' : 'hover:bg-slate-50'
      }`}
    >
      <Initials name={person.name} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium break-words text-slate-900">{person.name}</span>
        <span className="line-clamp-2 text-sm break-words text-slate-500 tabular-nums">
          {person.role === 'owner' ? 'Owner' : 'Staff'} · {person.shop}
          {wide && ` · ${loginOf(person)}`}
          {!person.is_open && ' · closed'}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400 lg:hidden" />
    </Link>
  )
}
