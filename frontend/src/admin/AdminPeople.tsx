import { ChevronRight, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { cardClass } from '../components/styles.ts'
import { EmptyState, ErrorState, Input, PageHeader, Skeleton } from '../components/ui.tsx'
import type { AdminSeller } from '../lib/types.ts'
import { AdminPerson } from './AdminPerson.tsx'
import { useAdminPeople } from './queries.ts'
import { ago, initials, loginOf } from './shared.ts'

/** /admin/people and /admin/people/:sellerId: everyone who logs in, owners
 * and staff of every shop (part 8), searchable by name, phone or shop.
 * A person opens beside the list on a laptop, like a shop (pick 5D); on a
 * phone, as its own page (pick 8A). */
export function AdminPeople() {
  const { sellerId } = useParams()
  const people = useAdminPeople()
  const [query, setQuery] = useState('')

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
      <Input
        type="search"
        leading={<Search aria-hidden className="size-4" />}
        placeholder="Name, phone or shop"
        aria-label="Search people"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {people.isPending ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : people.error ? (
        <ErrorState error={people.error} onRetry={() => people.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState icon={Search} title="Nobody here" />
      ) : (
        <>
          {!sellerId && <p className="text-sm text-slate-500 sm:px-1">{shown.length === 1 ? '1 login' : `${shown.length} logins`}</p>}
          <ul className={`${cardClass} divide-y divide-slate-100`}>
            {shown.map((person) => (
              <li key={person.id}>
                <Row person={person} selected={person.id === sellerId} wide={!sellerId} />
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
      {sellerId ? (
        <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="hidden lg:sticky lg:top-8 lg:block lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:pb-2">
            <PageHeader title="People" />
            {list}
          </div>
          <AdminPerson key={sellerId} sellerId={sellerId} />
        </div>
      ) : (
        <div className="max-w-3xl">
          <PageHeader title="People" />
          {list}
        </div>
      )}
    </>
  )
}

function Row({ person, selected, wide }: { person: AdminSeller; selected: boolean; wide: boolean }) {
  return (
    <Link
      to={`/admin/people/${person.id}`}
      aria-current={selected ? 'page' : undefined}
      className={`flex items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 sm:[li:first-child>&]:rounded-t-2xl sm:[li:last-child>&]:rounded-b-2xl ${
        selected ? 'bg-navy-50' : 'hover:bg-slate-50'
      }`}
    >
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-sm font-semibold text-navy-700">
        {initials(person.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900">{person.name}</span>
        <span className="block truncate text-sm text-slate-500 tabular-nums">
          {person.role === 'owner' ? 'Owner' : 'Staff'} · {person.shop}
          {wide && ` · ${loginOf(person)}`}
          {!person.is_open && ' · closed'}
        </span>
      </span>
      {wide && <span className="hidden shrink-0 text-xs text-slate-500 sm:block">{person.last_seen ? `Used ${ago(person.last_seen)}` : 'Not logged in'}</span>}
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
    </Link>
  )
}
