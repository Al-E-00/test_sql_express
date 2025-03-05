import Mailgun from 'mailgun.js';
import { Booking } from '../types/booking';
import { prettyFormatDate } from '../utils';

// Send booking confirmation email with mailgun
const sendBookingConfirmationEmail = async (bookingData: Booking) => {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: process.env.MAILGUN_USERNAME || 'api',
    key: process.env.MAILGUN_API || 'API_KEY',
  });

  const mailgunDomain =
    process.env.MAILGUN_DOMAIN ||
    'sandbox3e3b7c05691c447685c33a057e28fff0.mailgun.org';

  try {
    const data = await mg.messages.create(mailgunDomain, {
      from: `Prospero Bookings <postmaster@${mailgunDomain}>`,
      to: [`${bookingData.contact.name} <${bookingData.contact.email}>`],
      subject: `Booking Confirmation - ${bookingData.event.title}`,
      text: `
        Dear ${bookingData.contact.name},

        Your room booking has been confirmed. Here are the details of your reservation:

        Event: ${bookingData.event.title}
        Date: ${prettyFormatDate(
          bookingData.event.start
        )} to ${prettyFormatDate(bookingData.event.end)}
        Details: ${bookingData.event.details}
        ${
          bookingData.requestNote
            ? `\nAdditional Notes: ${bookingData.requestNote}`
            : ''
        }

        If you need to make any changes to your booking or have any questions, please don't hesitate to contact us.

        Thank you for your booking!

        Best regards,
        Prospero`,
    });

    console.log(
      `[info] Mailgun email sent to ${
        bookingData.contact.email
      }, mailgun details: ${JSON.stringify(data)}`
    );
    return true; // Signal that the email has been correctly sent
  } catch (err) {
    console.log(`[error] Mailgun error: ${err}`);
    return false; // Signal that we have an error
  }
};

export default sendBookingConfirmationEmail;
