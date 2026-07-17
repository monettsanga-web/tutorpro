import { useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

let paypalScriptPromise

function loadPayPal(currency) {
  if (window.paypal) return Promise.resolve(window.paypal)
  if (paypalScriptPromise) return paypalScriptPromise
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb'
  paypalScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons`
    script.async = true
    script.dataset.namespace = 'paypal_sdk'
    script.onload = () => resolve(window.paypal)
    script.onerror = () => reject(new Error('PayPal checkout could not be loaded. Please check your connection.'))
    document.head.appendChild(script)
  })
  return paypalScriptPromise
}

export default function PayPalCheckout({ amount, currency = 'USD', description, onSuccess }) {
  const containerRef = useRef(null)
  const successRef = useRef(onSuccess)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    successRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    let active = true
    let buttons

    loadPayPal(currency)
      .then((paypal) => {
        if (!active || !containerRef.current || !paypal) return
        containerRef.current.innerHTML = ''
        buttons = paypal.Buttons({
          style: { shape: 'pill', color: 'blue', layout: 'vertical', label: 'paypal', height: 45 },
          createOrder: (_data, actions) => actions.order.create({
            purchase_units: [{
              description,
              amount: { currency_code: currency, value: Number(amount).toFixed(2) },
            }],
          }),
          onApprove: async (data, actions) => {
            setStatus('processing')
            const details = await actions.order.capture()
            if (active) {
              setStatus('success')
              successRef.current({
                transactionId: details.id || data.orderID,
                payerName: details.payer?.name?.given_name || '',
                status: details.status,
                details,
              })
            }
          },
          onCancel: () => active && setStatus('ready'),
          onError: () => {
            if (active) {
              setError('PayPal could not complete this payment. Please try again.')
              setStatus('error')
            }
          },
        })
        if (buttons.isEligible()) {
          buttons.render(containerRef.current)
          setStatus('ready')
        } else {
          setError('PayPal is not available for this browser or location.')
          setStatus('error')
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message)
          setStatus('error')
        }
      })

    return () => {
      active = false
      if (buttons?.close) buttons.close()
    }
  }, [amount, currency, description])

  return (
    <div className="paypal-checkout">
      {status === 'loading' && <div className="paypal-loading"><i /><span>Loading secure PayPal checkout…</span></div>}
      {status === 'processing' && <div className="paypal-processing"><ShieldCheck size={19} /><span>PayPal is confirming your payment…</span></div>}
      {status === 'success' && <div className="paypal-processing success"><ShieldCheck size={19} /><span>Payment confirmed securely.</span></div>}
      {error && <div className="portal-error" role="alert">{error}</div>}
      <div ref={containerRef} className={status === 'processing' || status === 'success' ? 'paypal-buttons hidden' : 'paypal-buttons'} />
      <p><ShieldCheck size={13} /> Processed securely by PayPal. TutorPro English does not store card details.</p>
    </div>
  )
}
