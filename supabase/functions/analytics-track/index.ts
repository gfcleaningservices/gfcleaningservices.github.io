Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const eventData = await req.json();
        
        // Extract required fields
        const {
            page_url,
            page_title,
            referrer,
            user_agent,
            device_type,
            browser,
            browser_version,
            os,
            session_id,
            visitor_id,
            event_type = 'page_view',
            duration_seconds
        } = eventData;

        // Basic validation
        if (!page_url || !visitor_id || !session_id) {
            return new Response(JSON.stringify({
                error: {
                    code: 'INVALID_DATA',
                    message: 'Missing required fields: page_url, visitor_id, session_id'
                }
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Insert analytics event
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                page_url,
                page_title: page_title || '',
                referrer: referrer || '',
                user_agent: user_agent || '',
                device_type: device_type || '',
                browser: browser || '',
                browser_version: browser_version || '',
                os: os || '',
                country: '',
                city: '',
                session_id,
                visitor_id,
                event_type,
                duration_seconds: duration_seconds || null
            })
        });

        if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            throw new Error(`Database insert failed: ${errorText}`);
        }

        return new Response(JSON.stringify({
            data: { success: true }
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Analytics tracking error:', error);

        return new Response(JSON.stringify({
            error: {
                code: 'TRACKING_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
