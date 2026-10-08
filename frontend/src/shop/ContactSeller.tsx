import { Phone } from 'lucide-react'
import { SourceLogo } from '../components/SourceLogo.tsx'
import { buttonClass } from '../components/styles.ts'
import { useT } from '../i18n/useT.ts'
import { formatPhone } from '../lib/orders.ts'
import type { ShopStore } from '../lib/types.ts'
import { contactChannels, useContactLink, type Channel } from './contact.ts'

export function ChannelIcon({ channel, className = 'size-4.5' }: { channel: Channel; className?: string }) {
  if (channel === 'phone') return <Phone aria-hidden className={`shrink-0 text-navy-700 ${className}`} />
  return <SourceLogo source={channel} className={className} />
}

/** Under Add to cart: one button for a shop with one way to reach it, a
 * row of them for more. Nothing when the seller set none. */
export function ContactButtons({ shop, text, className = '' }: { shop: ShopStore; text: string; className?: string }) {
  const t = useT()
  const c = t.shop.contact
  const link = useContactLink(shop, text)
  const channels = contactChannels(shop)
  if (channels.length === 0) return null

  if (channels.length === 1) {
    const [channel] = channels
    const label =
      channel === 'telegram'
        ? t.shop.product.askSeller
        : channel === 'messenger'
          ? c.askOnMessenger
          : c.call(formatPhone(shop.contact_phone!))
    return (
      <a {...link(channel)} rel="noreferrer" className={`${buttonClass('secondary')} w-full ${className}`}>
        <ChannelIcon channel={channel} />
        {label}
      </a>
    )
  }
  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium text-slate-600">{c.askTheSeller}</p>
      {/* Side by side when they fit; on a narrow phone the last one wraps
          to a row of its own rather than cutting "Messenger" short. */}
      <div className="flex flex-wrap gap-2">
        {channels.map((channel) => (
          <a key={channel} {...link(channel)} rel="noreferrer" className={`${buttonClass('secondary')} grow basis-28`}>
            <ChannelIcon channel={channel} />
            {c.short[channel]}
          </a>
        ))}
      </div>
    </div>
  )
}
