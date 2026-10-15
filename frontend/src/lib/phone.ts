import { formatPhone } from './orders.ts'

// The first three digits of Cambodian numbers in use: mobile operators
// (Smart, Cellcard, Metfone, Seatel, Cootel, qb) and the provinces'
// landlines. A number starting otherwise is most likely mistyped; the
// checkout only warns about it, so a real number missing here still goes
// through.
const PREFIXES = new Set(
  (
    '010 011 012 013 014 015 016 017 018 031 038 060 061 066 067 068 069 070 071 076 077 078 079 ' +
    '080 081 083 084 085 086 087 088 089 090 092 093 095 096 097 098 099 ' +
    '023 024 025 026 032 033 034 035 036 042 043 044 052 053 054 055 062 063 064 065 072 073 074 075'
  ).split(' '),
)

export type PhoneLook =
  | { kind: 'ok'; shown: string } // a whole number, as the seller will see it
  | { kind: 'unusual'; shown: string } // whole, but no Cambodian number starts like it
  | null // empty or not a whole number yet

/** How a typed number looks, in the same steps as the API's
 * normalize_phone (app/services/phone.py), which still has the last word. */
export function lookAtPhone(raw: string): PhoneLook {
  let phone = raw.replace(/[\s\-().]/g, '')
  if (phone.startsWith('00')) phone = '+' + phone.slice(2)
  for (const prefix of ['+855', '855']) {
    if (phone.startsWith(prefix)) {
      phone = '0' + phone.slice(prefix.length).replace(/^0+/, '')
      break
    }
  }
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return { kind: 'ok', shown: phone }
  if (!/^0[1-9]\d{7,8}$/.test(phone)) return null
  return { kind: PREFIXES.has(phone.slice(0, 3)) ? 'ok' : 'unusual', shown: formatPhone(phone) }
}
