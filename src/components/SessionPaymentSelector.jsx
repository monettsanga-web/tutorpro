import { useState } from 'react';
import PayPalButton from './PayPalButton';

export default function SessionPaymentSelector() {
  const [sessions, setSessions] = useState(3);
  const rate = sessions <= 3 ? 10 : 8;
  const total = sessions * rate;

  return (
    <div>
      <h3>Choose weekly sessions (1-6)</h3>
      <input type="range" min="1" max="6" value={sessions} onChange={e => setSessions(Number(e.target.value))} />
      <p>Sessions: {sessions} | Rate: ${rate}/session | Total: ${total}</p>
      <PayPalButton bookingId={`weekly-${sessions}`} amount={total.toFixed(2)} />
    </div>
  );
}
