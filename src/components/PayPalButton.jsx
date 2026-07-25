import { useEffect } from 'react';

export default function PayPalButton({ bookingId }) {
  useEffect(() => {
    if (window.paypal) {
      window.paypal.Buttons({
        createOrder: (data, actions) => actions.order.create({
          purchase_units: [{ reference_id: bookingId, amount: { value: '20.00' } }],
        }),
        onApprove: (data, actions) => actions.order.capture().then(() => alert('Paid for booking ' + bookingId)),
      }).render('#paypal-button-container');
    }
  }, [bookingId]);

  return (
    <div>
      <script src={`https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID}&currency=USD`} />
      <div id="paypal-button-container" />
    </div>
  );
}
