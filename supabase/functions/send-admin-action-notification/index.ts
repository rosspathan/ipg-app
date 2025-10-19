import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  actionType: "kyc_approved" | "kyc_rejected" | "withdrawal_approved" | "withdrawal_rejected" | "deposit_confirmed" | "loan_approved" | "loan_rejected" | "insurance_claim_approved" | "insurance_claim_rejected";
  details: {
    amount?: string;
    asset?: string;
    reason?: string;
    status?: string;
    transactionHash?: string;
    loanTerms?: string;
    claimId?: string;
    [key: string]: any;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, actionType, details }: NotificationRequest = await req.json();

    // Get user email and notification preferences
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Check if user wants this type of notification
    const shouldSendEmail = checkNotificationPreference(actionType, prefs);
    if (!shouldSendEmail) {
      console.log(`User ${userId} has disabled notifications for ${actionType}`);
      return new Response(
        JSON.stringify({ message: "Notification disabled by user preference" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email content
    const emailContent = generateEmailContent(actionType, details);
    
    // Send email
    const { data, error } = await resend.emails.send({
      from: "I-SMART <notifications@i-smart.app>",
      to: [profile.email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error("Error sending email:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", data);
    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-admin-action-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

function checkNotificationPreference(actionType: string, prefs: any): boolean {
  if (!prefs) return true; // Default to sending if no preferences set

  switch (actionType) {
    case "kyc_approved":
    case "kyc_rejected":
      return prefs.email_on_kyc_decision ?? true;
    case "withdrawal_approved":
    case "withdrawal_rejected":
      return prefs.email_on_withdrawal_decision ?? true;
    case "deposit_confirmed":
      return prefs.email_on_deposit_confirmation ?? true;
    case "loan_approved":
    case "loan_rejected":
      return prefs.email_on_loan_decision ?? true;
    case "insurance_claim_approved":
    case "insurance_claim_rejected":
      return prefs.email_on_insurance_claim ?? true;
    default:
      return true;
  }
}

function generateEmailContent(actionType: string, details: any): { subject: string; html: string } {
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
      .container { max-width: 600px; margin: 0 auto; background-color: white; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
      .logo { color: white; font-size: 28px; font-weight: bold; margin: 0; }
      .content { padding: 40px 20px; }
      .title { color: #333; font-size: 24px; font-weight: bold; margin: 0 0 20px 0; }
      .message { color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
      .detail-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
      .detail-label { color: #666; font-size: 14px; margin-bottom: 5px; }
      .detail-value { color: #333; font-size: 16px; font-weight: 600; }
      .success { color: #10b981; }
      .error { color: #ef4444; }
      .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    </style>
  `;

  let subject = "";
  let title = "";
  let message = "";
  let statusClass = "";

  switch (actionType) {
    case "kyc_approved":
      subject = "KYC Verification Approved ✓";
      title = "Your KYC Verification has been Approved!";
      message = "Congratulations! Your identity verification has been successfully approved. You now have full access to all platform features.";
      statusClass = "success";
      break;
    case "kyc_rejected":
      subject = "KYC Verification Requires Attention";
      title = "Additional Information Required for KYC";
      message = `Your KYC submission needs attention. ${details.reason || "Please review the requirements and resubmit your documents."}`;
      statusClass = "error";
      break;
    case "withdrawal_approved":
      subject = "Withdrawal Approved ✓";
      title = "Your Withdrawal has been Approved!";
      message = "Your withdrawal request has been approved and is being processed.";
      statusClass = "success";
      break;
    case "withdrawal_rejected":
      subject = "Withdrawal Requires Attention";
      title = "Withdrawal Could Not be Processed";
      message = `Your withdrawal request could not be processed. ${details.reason || "Please contact support for assistance."}`;
      statusClass = "error";
      break;
    case "deposit_confirmed":
      subject = "Deposit Confirmed ✓";
      title = "Your Deposit has been Confirmed!";
      message = "Your deposit has been successfully confirmed and credited to your account.";
      statusClass = "success";
      break;
    case "loan_approved":
      subject = "Loan Application Approved ✓";
      title = "Your Loan has been Approved!";
      message = "Great news! Your loan application has been approved. Review the terms below.";
      statusClass = "success";
      break;
    case "loan_rejected":
      subject = "Loan Application Update";
      title = "Loan Application Decision";
      message = `Your loan application has been reviewed. ${details.reason || "Unfortunately, we cannot approve your request at this time."}`;
      statusClass = "error";
      break;
    case "insurance_claim_approved":
      subject = "Insurance Claim Approved ✓";
      title = "Your Insurance Claim has been Approved!";
      message = "Your insurance claim has been approved and will be processed shortly.";
      statusClass = "success";
      break;
    case "insurance_claim_rejected":
      subject = "Insurance Claim Decision";
      title = "Insurance Claim Update";
      message = `Your insurance claim has been reviewed. ${details.reason || "Please review the claim details and requirements."}`;
      statusClass = "error";
      break;
  }

  const detailsHtml = Object.entries(details)
    .filter(([key]) => key !== "reason")
    .map(([key, value]) => `
      <div style="margin-bottom: 15px;">
        <div class="detail-label">${formatLabel(key)}:</div>
        <div class="detail-value">${value}</div>
      </div>
    `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">I-SMART</h1>
        </div>
        <div class="content">
          <h2 class="title ${statusClass}">${title}</h2>
          <p class="message">${message}</p>
          
          ${detailsHtml ? `<div class="detail-box">${detailsHtml}</div>` : ""}
          
          <p class="message">
            If you have any questions, please don't hesitate to contact our support team.
          </p>
          
          <center>
            <a href="https://i-smart.app/dashboard" class="button">Go to Dashboard</a>
          </center>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} I-SMART. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

function formatLabel(key: string): string {
  return key
    .split(/(?=[A-Z])/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

serve(handler);
