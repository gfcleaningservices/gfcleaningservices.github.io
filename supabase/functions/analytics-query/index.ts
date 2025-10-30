Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const dateRange = url.searchParams.get('range') || '7d'; // today, 7d, 30d
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Calculate date filter based on range
        let dateFilter = '';
        const now = new Date();
        
        if (dateRange === 'today') {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dateFilter = `created_at=gte.${startOfDay.toISOString()}`;
        } else if (dateRange === '7d') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = `created_at=gte.${sevenDaysAgo.toISOString()}`;
        } else if (dateRange === '30d') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = `created_at=gte.${thirtyDaysAgo.toISOString()}`;
        }

        // Fetch all events for the date range
        const eventsResponse = await fetch(
            `${supabaseUrl}/rest/v1/analytics_events?${dateFilter}&order=created_at.desc&limit=10000`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (!eventsResponse.ok) {
            throw new Error('Failed to fetch analytics events');
        }

        const events = await eventsResponse.json();

        // Calculate metrics
        const totalPageViews = events.length;
        const uniqueVisitors = new Set(events.map(e => e.visitor_id)).size;
        const uniqueSessions = new Set(events.map(e => e.session_id)).size;

        // Calculate bounce rate (sessions with only 1 page view)
        const sessionPageCounts = {};
        events.forEach(e => {
            sessionPageCounts[e.session_id] = (sessionPageCounts[e.session_id] || 0) + 1;
        });
        const bouncedSessions = Object.values(sessionPageCounts).filter(count => count === 1).length;
        const bounceRate = uniqueSessions > 0 ? ((bouncedSessions / uniqueSessions) * 100).toFixed(1) : '0';

        // Calculate average session duration (simplified)
        const avgSessionDuration = events.length > 0 ? Math.round(events.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / uniqueSessions) : 0;

        // Top pages
        const pageViewCounts = {};
        events.forEach(e => {
            const key = e.page_url;
            if (!pageViewCounts[key]) {
                pageViewCounts[key] = { url: e.page_url, title: e.page_title || e.page_url, views: 0, visitors: new Set() };
            }
            pageViewCounts[key].views++;
            pageViewCounts[key].visitors.add(e.visitor_id);
        });

        const topPages = Object.values(pageViewCounts)
            .map(p => ({ url: p.url, title: p.title, views: p.views, unique_visitors: p.visitors.size }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        // Traffic sources
        const referrerCounts = {};
        events.forEach(e => {
            const ref = e.referrer || 'Direct';
            let source = 'Direct';
            
            if (ref !== 'Direct') {
                if (ref.includes('google.com')) source = 'Google';
                else if (ref.includes('bing.com')) source = 'Bing';
                else if (ref.includes('facebook.com')) source = 'Facebook';
                else if (ref.includes('twitter.com') || ref.includes('t.co')) source = 'Twitter';
                else if (ref.includes('linkedin.com')) source = 'LinkedIn';
                else source = 'Referral';
            }
            
            referrerCounts[source] = (referrerCounts[source] || 0) + 1;
        });

        const trafficSources = Object.entries(referrerCounts)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count);

        // Device breakdown
        const deviceCounts = {};
        events.forEach(e => {
            const device = e.device_type || 'Unknown';
            deviceCounts[device] = (deviceCounts[device] || 0) + 1;
        });

        const deviceBreakdown = Object.entries(deviceCounts)
            .map(([device, count]) => ({ device, count }))
            .sort((a, b) => b.count - a.count);

        // Browser breakdown
        const browserCounts = {};
        events.forEach(e => {
            const browser = e.browser || 'Unknown';
            browserCounts[browser] = (browserCounts[browser] || 0) + 1;
        });

        const browserBreakdown = Object.entries(browserCounts)
            .map(([browser, count]) => ({ browser, count }))
            .sort((a, b) => b.count - a.count);

        // Traffic over time (daily aggregation)
        const dailyViews = {};
        events.forEach(e => {
            const date = new Date(e.created_at).toISOString().split('T')[0];
            if (!dailyViews[date]) {
                dailyViews[date] = { date, views: 0, visitors: new Set() };
            }
            dailyViews[date].views++;
            dailyViews[date].visitors.add(e.visitor_id);
        });

        const trafficOverTime = Object.values(dailyViews)
            .map(d => ({ date: d.date, views: d.views, unique_visitors: d.visitors.size }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Recent activity (last 20 events)
        const recentActivity = events
            .slice(0, 20)
            .map(e => ({
                timestamp: e.created_at,
                page_url: e.page_url,
                page_title: e.page_title || e.page_url,
                device_type: e.device_type
            }));

        // Return aggregated data
        return new Response(JSON.stringify({
            data: {
                metrics: {
                    totalPageViews,
                    uniqueVisitors,
                    avgSessionDuration,
                    bounceRate: parseFloat(bounceRate)
                },
                topPages,
                trafficSources,
                deviceBreakdown,
                browserBreakdown,
                trafficOverTime,
                recentActivity
            }
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Analytics query error:', error);

        return new Response(JSON.stringify({
            error: {
                code: 'QUERY_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
