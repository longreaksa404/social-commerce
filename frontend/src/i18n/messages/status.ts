import type { Tree } from '../core.ts'

/** Statuses and methods, in the seller's words (02 section 7). The
 * customer's words for them are in order.ts. */
export const status = {
  order: {
    pending: { en: 'New', km: 'ថ្មី' },
    accepted: { en: 'Accepted', km: 'បានទទួល' },
    processing: { en: 'Preparing', km: 'កំពុងរៀបចំ' },
    ready: { en: 'Ready', km: 'រួចរាល់' },
    shipped: { en: 'Shipped', km: 'បានបញ្ចេញ' },
    delivered: { en: 'Delivered', km: 'បានដល់ដៃ' },
    completed: { en: 'Completed', km: 'បានបញ្ចប់' },
    rejected: { en: 'Rejected', km: 'បានបដិសេធ' },
    cancelled: { en: 'Cancelled', km: 'បានលុបចោល' },
  },
  paymentMethod: {
    khqr: { en: 'KHQR', km: 'KHQR' },
    bank_transfer: { en: 'Bank transfer', km: 'ផ្ទេរតាមធនាគារ' },
    cod: { en: 'Cash on delivery', km: 'បង់ប្រាក់ពេលទទួលទំនិញ' },
  },
  // The badge on an order in the seller's lists.
  paymentBadge: {
    paid: { en: 'Paid', km: 'បានបង់' },
    failed: { en: 'Payment failed', km: 'បង់ប្រាក់មិនបាន' },
    refunded: { en: 'Refunded', km: 'បានសងប្រាក់វិញ' },
    unpaid: { en: 'Unpaid', km: 'មិនទាន់បង់' },
    // The customer tapped "I've paid"; the seller still checks (UX check #5).
    saysPaid: { en: 'Says paid', km: 'អតិថិជនថាបានបង់' },
    // Cash on delivery not received yet: a status like Unpaid, not the
    // method's English letters (UX check #24, 2026-10-17).
    cod: { en: 'Cash due', km: 'រង់ចាំសាច់ប្រាក់' },
  },
  // In the seller's words, not the system's (UX check #13, 2026-10-17).
  delivery: {
    not_assigned: { en: 'Not sent yet', km: 'មិនទាន់ផ្ញើចេញ' },
    assigned: { en: 'With the driver', km: 'នៅជាមួយអ្នកដឹក' },
    picked_up: { en: 'Picked up', km: 'អ្នកដឹកបានយក' },
    in_transit: { en: 'On the way', km: 'កំពុងដឹក' },
    delivered: { en: 'Delivered', km: 'បានដល់ដៃ' },
    failed: { en: 'Delivery failed', km: 'ដឹកមិនបានសម្រេច' },
  },
  pickup: {
    not_assigned: { en: 'Not collected', km: 'មិនទាន់មកយក' },
    delivered: { en: 'Collected', km: 'បានមកយកហើយ' },
  },
  // A courier's parcel once handed over.
  sentWith: { en: (courier: string) => `Sent with ${courier}`, km: (courier: string) => `បានផ្ញើតាម ${courier}` },
  // The seller's buttons for moving a delivery on.
  deliveryAction: {
    customerCollected: { en: 'Customer collected', km: 'អតិថិជនបានមកយក' },
    tryAgain: { en: 'Try again', km: 'ដឹកម្ដងទៀត' },
    // Not "Book courier": the app doesn't book anything (UX check #13).
    sendWith: { en: (courier: string) => `Send with ${courier}`, km: (courier: string) => `ផ្ញើតាម ${courier}` },
    assign: { en: 'Assign', km: 'ចាត់អ្នកដឹក' },
    picked_up: { en: 'Picked up', km: 'អ្នកដឹកបានយក' },
    in_transit: { en: 'On the way', km: 'កំពុងដឹក' },
    delivered: { en: 'Delivered', km: 'បានដល់ដៃ' },
    failed: { en: 'Delivery failed', km: 'ដឹកមិនបានសម្រេច' },
  },
} satisfies Tree
