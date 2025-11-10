import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Listen to admin_notifications table for new BSK purchase requests
    const { data: payload } = await req.json()
    
    if (!payload || payload.type !== 'INSERT') {
      console.log('[BSK Purchase Notification] Not an INSERT event, skipping')
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const notification = payload.record
    
    if (notification.type !== 'bsk_purchase_request') {
      console.log('[BSK Purchase Notification] Not a purchase request, skipping')
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[BSK Purchase Notification] Processing purchase request:', notification.id)

    // Get all admin emails
    const { data: adminRoles, error: adminError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    if (adminError) {
      console.error('[BSK Purchase Notification] Error fetching admins:', adminError)
      throw adminError
    }

    const adminUserIds = adminRoles.map(r => r.user_id)

    // Get admin emails from auth.users
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers()
    
    if (usersError) {
      console.error('[BSK Purchase Notification] Error fetching users:', usersError)
      throw usersError
    }

    const adminEmails = users
      .filter(u => adminUserIds.includes(u.id))
      .map(u => u.email)
      .filter(Boolean)

    console.log('[BSK Purchase Notification] Sending emails to admins:', adminEmails)

    const metadata = notification.metadata || {}
    const reviewUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/admin/bsk-purchases`

    // Send email to each admin (if email service is configured)
    // For now, we'll just log it. In production, integrate with Resend, SendGrid, etc.
    for (const email of adminEmails) {
      console.log(`[BSK Purchase Notification] Would send email to ${email}:`)
      console.log(`  Subject: New BSK Purchase Request - ${metadata.amount} BSK`)
      console.log(`  Payment Method: ${metadata.payment_method}`)
      console.log(`  User: ${notification.message}`)
      console.log(`  Review URL: ${reviewUrl}`)
      
      // TODO: Integrate with actual email service
      // await sendEmail({
      //   to: email,
      //   subject: `New BSK Purchase Request - ${metadata.amount} BSK`,
      //   html: `
      //     <h2>New BSK Purchase Request</h2>
      //     <p>${notification.message}</p>
      //     <p><strong>Amount:</strong> ${metadata.amount} BSK</p>
      //     <p><strong>Payment Method:</strong> ${metadata.payment_method}</p>
      //     ${metadata.transaction_hash ? `<p><strong>TX Hash:</strong> ${metadata.transaction_hash}</p>` : ''}
      //     ${metadata.utr_number ? `<p><strong>UTR:</strong> ${metadata.utr_number}</p>` : ''}
      //     <p><a href="${reviewUrl}">Review Purchase Request</a></p>
      //   `
      // })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin notifications processed',
        admins_notified: adminEmails.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[BSK Purchase Notification] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
