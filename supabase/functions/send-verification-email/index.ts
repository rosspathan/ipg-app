import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

// Use Resend HTTP API (Edge Functions cannot open raw SMTP connections)
const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  confirmationUrl?: string;
  verificationCode?: string;
  userName?: string;
  isOnboarding?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, confirmationUrl, verificationCode, userName = 'User', isOnboarding = false }: EmailRequest = await req.json();

    console.log('Sending verification email to:', email);

    // Choose template based on whether it's onboarding flow or regular verification
    const emailContent = isOnboarding && verificationCode ? 
      getOnboardingEmailTemplate(userName, verificationCode) : 
      getRegularEmailTemplate(confirmationUrl || '');

    // Debug: Log what secrets we're using
    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
    const fromName = Deno.env.get("SMTP_NAME") || "IPG iSmart Exchange";
    
    console.log("DEBUG - Using fromEmail:", fromEmail);
    console.log("DEBUG - Using fromName:", fromName);
    
    // Try sending directly with the verified domain
    let responseId: string | undefined;
    
    const emailData = {
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: isOnboarding ? "Welcome to IPG iSmart Exchange - Verify Your Email" : "Verify Your Email - IPG iSmart",
      html: emailContent,
    };
    
    console.log("DEBUG - Email data:", JSON.stringify(emailData, null, 2));
    
    try {
      const result = await resend.emails.send(emailData);
      console.log("DEBUG - Full Resend result:", JSON.stringify(result, null, 2));
      
      if ((result as any)?.error) {
        console.error("DEBUG - Resend returned error:", (result as any).error);
        throw new Error((result as any).error?.message || "Email send failed");
      }
      
      responseId = (result as any)?.data?.id ?? (result as any)?.id;
      console.log("Email sent successfully with ID:", responseId);
    } catch (err: any) {
      console.error("DEBUG - Send failed with error:", err);
      console.error("DEBUG - Error type:", typeof err);
      console.error("DEBUG - Error message:", err?.message);
      console.error("DEBUG - Full error object:", JSON.stringify(err, null, 2));
      throw err;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Verification email sent successfully",
      id: responseId
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to send verification email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Email templates
function getOnboardingEmailTemplate(userName: string, verificationCode: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - IPG iSmart Exchange</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .content {
            padding: 40px;
            text-align: center;
          }
          .verification-code {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 32px;
            font-weight: bold;
            padding: 20px 40px;
            border-radius: 12px;
            display: inline-block;
            letter-spacing: 8px;
            margin: 20px 0;
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
          }
          .instructions {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #667eea;
          }
          .footer {
            background: #f8fafc;
            padding: 20px 40px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #e2e8f0;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏦</div>
            <h1>IPG iSmart Exchange</h1>
            <p>Welcome to the Future of Trading</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Welcome to IPG iSmart Exchange! Please verify your email address to complete your registration.</p>
            
            <div class="verification-code">
              ${verificationCode}
            </div>
            
            <div class="instructions">
              <h3>📱 How to verify:</h3>
              <p>1. Return to the IPG iSmart Exchange app</p>
              <p>2. Enter the verification code above</p>
              <p>3. Complete your security setup</p>
            </div>
            
            <p><strong>This code will expire in 10 minutes</strong></p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <h3>🎯 What's Next?</h3>
            <ul style="text-align: left; display: inline-block;">
              <li>🔐 Set up your security PIN & biometrics</li>
              <li>💎 Earn BSK tokens through our programs</li>
              <li>📈 Access live trading markets</li>
              <li>🎰 Join spin wheels and lucky draws</li>
              <li>🏆 Unlock tier benefits with referrals</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>If you didn't request this verification, please ignore this email.</p>
            <p>© 2024 IPG iSmart Exchange. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getRegularEmailTemplate(confirmationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to IPG iSmart</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your Digital Wallet & Trading Platform</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>
        
        <p style="margin-bottom: 25px; font-size: 16px;">
          Thank you for signing up! Please verify your email address to complete your registration and access all features.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmationUrl}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-size: 16px; 
                    font-weight: bold; 
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
            Verify Email Address
          </a>
        </div>
        
        <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Security Note:</strong> This verification link will expire in 24 hours. 
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 25px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${confirmationUrl}" style="color: #667eea; word-break: break-all;">${confirmationUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        
        <div style="text-align: center;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            Need help? Contact us at 
            <a href="mailto:support@ipg-app.com" style="color: #667eea;">support@ipg-app.com</a>
          </p>
          <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
            © 2024 IPG iSmart. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);