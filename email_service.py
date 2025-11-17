import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
from dotenv import load_dotenv
import logging

# Set up logging
logger = logging.getLogger("EmailService")
if not logger.handlers:
    h = logging.StreamHandler()
    h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(h)
logger.setLevel(logging.INFO)

# Load environment variables
load_dotenv()

# Email configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "noreply@eventhub.com")

def send_booking_confirmation(user_email: str, user_name: str, event: dict, booking_details: dict) -> bool:
    """
    Send booking confirmation email with ticket details
    
    Args:
        user_email: Email address of the user
        user_name: Full name of the user
        event: Dictionary containing event details
        booking_details: Dictionary containing booking details
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Create message container
        msg = MIMEMultipart()
        msg['From'] = f"Event Hub <{SENDER_EMAIL}>"
        msg['To'] = user_email
        msg['Subject'] = f"🎟️ Your Tickets for {event['name']} | Event Hub"

        # Format event date
        event_date = datetime.strptime(event['date'], "%Y-%m-%d").strftime("%B %d, %Y")
        
        # Create HTML email content
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4a6baf; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }}
                .ticket {{ border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; background-color: #f9f9f9; }}
                .footer {{ margin-top: 20px; font-size: 12px; color: #777; text-align: center; }}
                .button {{ display: inline-block; padding: 10px 20px; background-color: #4a6baf; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Booking Confirmed!</h1>
                </div>
                <div class="content">
                    <p>Hello {user_name},</p>
                    <p>Thank you for booking with Event Hub! Your tickets for <strong>{event['name']}</strong> are confirmed.</p>
                    
                    <div class="ticket">
                        <h2>🎟️ {event['name']}</h2>
                        <p><strong>📅 Date:</strong> {event_date} at {event['time']}</p>
                        <p><strong>📍 Venue:</strong> {event['venue']}</p>
                        <p><strong>🎫 Tickets:</strong> {booking_details['ticket_count']} x {booking_details['ticket_type']}</p>
                        <p><strong>💰 Total Paid:</strong> ₹{booking_details['total_amount']}</p>
                        <p><strong>🔖 Booking ID:</strong> {booking_details['booking_id']}</p>
                    </div>
                    
                    <p>Your tickets are attached to this email. You can also download them from your account.</p>
                    
                    <p>We look forward to seeing you at the event!</p>
                    
                    <p>Best regards,<br>The Event Hub Team</p>
                    
                    <div class="footer">
                        <p>© {datetime.now().year} Event Hub. All rights reserved.</p>
                        <p>This is an automated message, please do not reply directly to this email.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        # Attach HTML content
        msg.attach(MIMEText(html, 'html'))

        # Connect to SMTP server and send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            
        logger.info(f"Booking confirmation email sent to {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send booking confirmation email: {str(e)}")
        return False
