// Email notification service
// Uses Resend (https://resend.com) for transactional emails.
// Set RESEND_API_KEY in environment to enable. Falls back to console.log in dev.

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[Email notification - dev mode]', payload.subject, 'to:', payload.to);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'noreply@coorder.ai',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Email] Failed to send:', err);
    // Don't throw — email failures should be non-fatal
  }
}

export async function notifyOrderReady(params: {
  restaurantEmail: string;
  orderNumber: string;
  tableName: string;
}): Promise<void> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <h2 style="color: #222; margin-bottom: 16px;">Order Ready</h2>
      <p style="color: #555; font-size: 16px; margin-bottom: 12px;">
        Order <strong>#${params.orderNumber}</strong> is ready for table <strong>${params.tableName}</strong>.
      </p>
      <p style="color: #888; font-size: 14px; margin-top: 24px;">
        CoOrder
      </p>
    </div>
  `;

  await sendEmail({
    to: params.restaurantEmail,
    subject: `Order #${params.orderNumber} Ready`,
    html,
  });
}

export async function notifyLowStock(params: {
  restaurantEmail: string;
  restaurantName: string;
  items: Array<{ name: string; currentStock: number; threshold: number; unit: string }>;
}): Promise<void> {
  const rows = params.items
    .map(item => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; color: #333;">${item.name}</td>
        <td style="padding: 12px; color: #dc2626; font-weight: 600;">${item.currentStock} ${item.unit}</td>
        <td style="padding: 12px; color: #666;">${item.threshold} ${item.unit}</td>
      </tr>
    `)
    .join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h2 style="color: #dc2626; margin: 0 0 4px 0;">⚠️ Low Stock Alert</h2>
        <p style="color: #7f1d1d; margin: 0;">${params.restaurantName} — ${params.items.length} item(s) below reorder threshold</p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead style="background-color: #f3f4f6;">
          <tr>
            <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Item</th>
            <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Current Stock</th>
            <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Threshold</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        Visit your Inventory page to update stock levels or create a purchase order.
      </p>
      <p style="color: #888; font-size: 14px; margin-top: 24px;">
        CoOrder
      </p>
    </div>
  `;

  await sendEmail({
    to: params.restaurantEmail,
    subject: `Low Stock Alert — ${params.items.length} item(s) need restocking`,
    html,
  });
}

export async function notifyNewBooking(params: {
  restaurantEmail: string;
  customerName: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
}): Promise<void> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <h2 style="color: #222; margin-bottom: 16px;">New Booking</h2>
      <p style="color: #555; font-size: 16px; margin-bottom: 12px;">
        <strong>${params.customerName}</strong> has made a booking.
      </p>
      <div style="background-color: #fff; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0;">
        <p style="color: #333; margin: 4px 0;"><strong>Date:</strong> ${params.bookingDate}</p>
        <p style="color: #333; margin: 4px 0;"><strong>Time:</strong> ${params.bookingTime}</p>
        <p style="color: #333; margin: 4px 0;"><strong>Party Size:</strong> ${params.partySize} ${params.partySize === 1 ? 'person' : 'people'}</p>
      </div>
      <p style="color: #888; font-size: 14px; margin-top: 24px;">
        CoOrder
      </p>
    </div>
  `;

  await sendEmail({
    to: params.restaurantEmail,
    subject: `New Booking from ${params.customerName}`,
    html,
  });
}

export async function notifyBookingConfirmed(params: {
  customerEmail: string;
  restaurantName: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
}): Promise<void> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <h2 style="color: #222; margin-bottom: 16px;">Booking Confirmed</h2>
      <p style="color: #555; font-size: 16px; margin-bottom: 12px;">
        Your booking at <strong>${params.restaurantName}</strong> is confirmed!
      </p>
      <div style="background-color: #fff; border-left: 4px solid #10b981; padding: 12px; margin: 16px 0;">
        <p style="color: #333; margin: 4px 0;"><strong>Date:</strong> ${params.bookingDate}</p>
        <p style="color: #333; margin: 4px 0;"><strong>Time:</strong> ${params.bookingTime}</p>
        <p style="color: #333; margin: 4px 0;"><strong>Party Size:</strong> ${params.partySize} ${params.partySize === 1 ? 'person' : 'people'}</p>
      </div>
      <p style="color: #555; font-size: 14px; margin-top: 24px;">
        We look forward to seeing you!
      </p>
      <p style="color: #888; font-size: 14px; margin-top: 24px;">
        CoOrder
      </p>
    </div>
  `;

  await sendEmail({
    to: params.customerEmail,
    subject: `Booking Confirmed at ${params.restaurantName}`,
    html,
  });
}
