import { useMemo } from 'react'
import { useFeedback } from '../components/feedback.ts'
import { useT } from '../i18n/useT.ts'
import { drawKhqr, isIOS } from '../lib/khqrImage.ts'
import { formatMoney } from '../lib/money.ts'
import type { ShopOrder, ShopStore } from '../lib/types.ts'

/** The KHQR as the picture customers save (the standard card, pick 24A),
 * drawn the first time it's needed, and saving it: the order page's card
 * and the pay popup. `onSaved` stands in for the "QR code saved" toast,
 * which the popup would cover. */
export function useKhqrPicture(shop: ShopStore, order: ShopOrder, code: string, name: string) {
  const { toast } = useFeedback()
  const t = useT()
  const total = formatMoney(order.payment.amount, order.currency)
  const caption = `${t.shop.orderNumber(order.number)} · ${shop.name}`
  const picture = useMemo(() => {
    let image: ReturnType<typeof drawKhqr> | undefined
    return () => (image ??= drawKhqr({ code, name, amount: total, caption }))
  }, [code, name, total, caption])
  const fileName = `order-${order.number}-khqr.png`

  async function save(onSaved?: () => void) {
    const image = picture()
    const blob = await new Promise<Blob | null>((resolve) => image.canvas.toBlob(resolve, 'image/png'))
    const file = blob && new File([blob], fileName, { type: 'image/png' })
    // iPhones save to Photos (where bank apps look) only from the share
    // sheet; a download would land in Files.
    if (file && isIOS() && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
      } catch {
        // Closed the share sheet: nothing to do.
      }
      return
    }
    const link = document.createElement('a')
    link.href = image.url
    link.download = fileName
    link.click()
    if (onSaved) onSaved()
    else toast(t.order.pay.qrSaved)
  }
  return { picture, save }
}
