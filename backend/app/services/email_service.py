import boto3
from botocore.exceptions import ClientError, BotoCoreError
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt, JWTError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """AWS SES email service for sending verification and notification emails"""
    
    def __init__(self):
        """Initialize AWS SES client"""
        try:
            self.ses_client = boto3.client(
                'ses',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        except Exception as e:
            logger.error(f"Failed to initialize SES client: {e}")
            raise Exception(f"Email service initialization failed: {e}")
    
    def generate_verification_token(self, email: str) -> str:
        """Generate JWT token for email verification"""
        try:
            payload = {
                'email': email,
                'purpose': 'email_verification',
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
            }
            
            token = jwt.encode(
                payload,
                settings.JWT_SECRET_KEY,
                algorithm=settings.JWT_ALGORITHM
            )
            
            return token
        except Exception as e:
            logger.error(f"Failed to generate verification token: {e}")
            raise Exception(f"Token generation failed: {e}")
    
    def verify_verification_token(self, token: str) -> Optional[str]:
        """Verify email verification token and return email"""
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # Check if token is for email verification
            if payload.get('purpose') != 'email_verification':
                return None
            
            return payload.get('email')
        
        except JWTError as e:
            logger.warning(f"Invalid verification token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    async def send_verification_email(self, email: str, username: str) -> bool:
        """Send email verification email"""
        try:
            # Generate verification token
            token = self.generate_verification_token(email)
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
            
            # Email content
            subject = "Verify your AIGM account"
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Verify Your Email - AIGM</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .button {{ display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }}
                    .footer {{ margin-top: 30px; font-size: 14px; color: #6b7280; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to AIGM!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi {username},</h2>
                        <p>Thanks for signing up for AIGM! To complete your registration, please verify your email address by clicking the button below:</p>
                        
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="{verification_url}" class="button">Verify Email Address</a>
                        </p>
                        
                        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #2563eb;">{verification_url}</p>
                        
                        <div class="footer">
                            <p>This verification link will expire in 24 hours.</p>
                            <p>If you didn't create an account with AIGM, please ignore this email.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
            Hi {username},
            
            Thanks for signing up for AIGM! To complete your registration, please verify your email address by visiting:
            
            {verification_url}
            
            This verification link will expire in 24 hours.
            
            If you didn't create an account with AIGM, please ignore this email.
            
            Best regards,
            The AIGM Team
            """
            
            # Send email via SES
            response = self.ses_client.send_email(
                Source=settings.SES_FROM_EMAIL,
                Destination={'ToAddresses': [email]},
                Message={
                    'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                    'Body': {
                        'Html': {'Data': html_body, 'Charset': 'UTF-8'},
                        'Text': {'Data': text_body, 'Charset': 'UTF-8'}
                    }
                }
            )
            
            logger.info(f"Verification email sent to {email}, Message ID: {response['MessageId']}")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'MessageRejected':
                logger.error(f"Email rejected by SES: {e}")
            elif error_code == 'MailFromDomainNotVerified':
                logger.error(f"Sender domain not verified: {e}")
            else:
                logger.error(f"SES client error: {e}")
            return False
            
        except BotoCoreError as e:
            logger.error(f"AWS service error: {e}")
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error sending email: {e}")
            return False
    
    async def send_password_reset_email(self, email: str, username: str) -> bool:
        """Send password reset email (for future use)"""
        try:
            # Generate reset token
            token = self.generate_verification_token(email)  # Reuse token generation
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            
            subject = "Reset your AIGM password"
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Reset Password - AIGM</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .button {{ display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }}
                    .footer {{ margin-top: 30px; font-size: 14px; color: #6b7280; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <h2>Hi {username},</h2>
                        <p>We received a request to reset your password for your AIGM account. Click the button below to reset it:</p>
                        
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="{reset_url}" class="button">Reset Password</a>
                        </p>
                        
                        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #dc2626;">{reset_url}</p>
                        
                        <div class="footer">
                            <p>This reset link will expire in 24 hours.</p>
                            <p>If you didn't request a password reset, please ignore this email.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Send email via SES
            response = self.ses_client.send_email(
                Source=settings.SES_FROM_EMAIL,
                Destination={'ToAddresses': [email]},
                Message={
                    'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                    'Body': {'Html': {'Data': html_body, 'Charset': 'UTF-8'}}
                }
            )
            
            logger.info(f"Password reset email sent to {email}, Message ID: {response['MessageId']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            return False
    
    async def verify_ses_configuration(self) -> bool:
        """Verify SES configuration and sender email"""
        try:
            # Check if sending email is verified
            response = self.ses_client.get_account_attributes(
                AttributeNames=['EnablementStatus']
            )
            
            status = response.get('Attributes', {}).get('EnablementStatus')
            if status != 'Enabled':
                logger.error(f"SES account not enabled: {status}")
                return False
            
            # Check verified identities
            identities = self.ses_client.list_verified_email_addresses()
            verified_emails = identities.get('VerifiedEmailAddresses', [])
            
            if settings.SES_FROM_EMAIL not in verified_emails:
                logger.warning(f"Sender email {settings.SES_FROM_EMAIL} not verified")
                # Check if domain is verified instead
                domains = self.ses_client.list_identities(IdentityType='Domain')
                verified_domains = domains.get('Identities', [])
                
                sender_domain = settings.SES_FROM_EMAIL.split('@')[1]
                if sender_domain not in verified_domains:
                    logger.error(f"Neither email nor domain is verified for {settings.SES_FROM_EMAIL}")
                    return False
            
            logger.info("SES configuration verified successfully")
            return True
            
        except Exception as e:
            logger.error(f"SES configuration check failed: {e}")
            return False