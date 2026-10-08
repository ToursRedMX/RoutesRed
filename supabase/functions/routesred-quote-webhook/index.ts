import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_ROUTESRED') ?? Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'RoutesRed Quote Webhook', version: '1.0.0' },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event): Promise<void> {
  if (event.type !== 'checkout.session.completed') return;

  const session = event.data.object as Stripe.Checkout.Session;

  // Only process routesred quote payments
  if (session.metadata?.platform !== 'routesred') return;

  const paymentId = session.metadata?.payment_id;
  if (!paymentId) {
    console.error('No payment_id in session metadata');
    return;
  }

  if (session.payment_status !== 'paid') {
    console.info('Session not paid yet, skipping');
    return;
  }

  const { error } = await supabase.rpc('confirm_quote_payment_routesred', {
    p_payment_id: paymentId,
    p_stripe_session_id: session.id,
    p_stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  });

  if (error) {
    console.error('Failed to confirm payment:', error);
  } else {
    console.info('Payment confirmed for payment_id:', paymentId);
  }
}
