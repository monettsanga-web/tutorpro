import { awardPaymentCredits, extractOrderDetails, paypalFetch, requireStudent, sendError, sendJson } from '../_paypal.js'
import { emailAdmin } from '../_notifyAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')
  try {
    const { orderId, accountId } = req.body || {}
    if (!orderId) throw new Error('Missing PayPal order ID.')
    const { supabase } = await requireStudent(req, accountId)
    let order
    try {
      order = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', body: '{}' })
    } catch (captureError) {
      order = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: 'GET' })
      if (order.status !== 'COMPLETED') throw captureError
    }
    const details = extractOrderDetails(order)
    if (details.accountId !== accountId) throw new Error('Captured PayPal order does not belong to this student.')
    const result = await awardPaymentCredits(supabase, details)

    /*
     * Tell the owner a parent has paid.
     *
     * Until now a payment was silent: credits appeared in the database and
     * the only way to find out was to go looking in Admin -> Payments. A
     * family that has just paid is usually about to book, and the owner
     * being the last to know is how a first lesson sits unassigned.
     *
     * Deliberately NOT awaited into the response path's failure: if Resend
     * is down the parent's payment is still captured and still credited.
     * The notification reports its own failure to the logs instead.
     */
    if (!result.alreadyCredited) {
      const { data: payer } = await supabase
        .from('profiles')
        .select('parent_name, email, profile_data')
        .eq('id', details.accountId)
        .maybeSingle()
      const learner = payer?.profile_data?.child?.name || payer?.profile_data?.children?.[0]?.name || ''
      const notice = await emailAdmin({
        subject: `Payment received: ${payer?.parent_name || 'a parent'} - ${details.currency || 'USD'} ${details.amount || ''}`.trim(),
        heading: 'A parent has paid',
        body: `${payer?.parent_name || 'A parent'} has completed a PayPal payment. The credits are already on their account.`,
        rows: [
          ['Parent', payer?.parent_name || 'Unknown'],
          ['Email', payer?.email || 'Unknown'],
          ...(learner ? [['Student', learner]] : []),
          ['Amount', `${details.currency || 'USD'} ${details.amount || ''}`.trim()],
          ['Credits added', String(result.creditsAdded ?? '')],
          ['Credits now', String(result.paidLessonsBalance ?? '')],
          ['PayPal order', orderId],
        ],
        replyTo: payer?.email || undefined,
      })
      if (!notice.sent) console.warn('Admin payment notification not sent:', notice.reason)
    }

    return sendJson(res, 200, { verified: true, ...result })
  } catch (error) {
    return sendError(res, 400, error.message)
  }
}
