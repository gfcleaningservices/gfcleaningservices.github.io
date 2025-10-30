/**
 * GF Cleaning Services Analytics Tracker
 * Privacy-friendly analytics tracking script
 * 
 * Usage: Add this script to your website before closing </body> tag:
 * <script src="analytics-tracker.js"></script>
 */

(function() {
    'use strict';

    // Configuration
    const ANALYTICS_ENDPOINT = 'https://adkoaefjfmpuctnvjdmx.supabase.co/functions/v1/analytics-track';
    const STORAGE_KEY_VISITOR = 'gf_analytics_visitor_id';
    const STORAGE_KEY_SESSION = 'gf_analytics_session_id';
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

    /**
     * Generate a unique identifier
     */
    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Get or create visitor ID (persists across sessions)
     */
    function getVisitorId() {
        let visitorId = localStorage.getItem(STORAGE_KEY_VISITOR);
        if (!visitorId) {
            visitorId = generateId();
            localStorage.setItem(STORAGE_KEY_VISITOR, visitorId);
        }
        return visitorId;
    }

    /**
     * Get or create session ID (expires after 30 minutes of inactivity)
     */
    function getSessionId() {
        const now = Date.now();
        const sessionData = localStorage.getItem(STORAGE_KEY_SESSION);
        
        if (sessionData) {
            try {
                const { id, timestamp } = JSON.parse(sessionData);
                if (now - timestamp < SESSION_TIMEOUT) {
                    // Update timestamp to extend session
                    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ id, timestamp: now }));
                    return id;
                }
            } catch (e) {
                // Invalid session data, create new session
            }
        }
        
        // Create new session
        const newSessionId = generateId();
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ 
            id: newSessionId, 
            timestamp: now 
        }));
        return newSessionId;
    }

    /**
     * Detect device type
     */
    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'tablet';
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    /**
     * Detect browser name and version
     */
    function getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let version = '';

        if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
            browser = 'Chrome';
            version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
            browser = 'Safari';
            version = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('Edg') > -1) {
            browser = 'Edge';
            version = ua.match(/Edg\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) {
            browser = 'Internet Explorer';
            version = ua.match(/(?:MSIE |rv:)([0-9.]+)/)?.[1] || '';
        }

        return { browser, version };
    }

    /**
     * Detect operating system
     */
    function getOS() {
        const ua = navigator.userAgent;
        if (ua.indexOf('Win') > -1) return 'Windows';
        if (ua.indexOf('Mac') > -1) return 'macOS';
        if (ua.indexOf('Linux') > -1) return 'Linux';
        if (ua.indexOf('Android') > -1) return 'Android';
        if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
        return 'Unknown';
    }

    /**
     * Track page view
     */
    function trackPageView() {
        const visitorId = getVisitorId();
        const sessionId = getSessionId();
        const browserInfo = getBrowserInfo();

        const eventData = {
            page_url: window.location.href,
            page_title: document.title,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            device_type: getDeviceType(),
            browser: browserInfo.browser,
            browser_version: browserInfo.version,
            os: getOS(),
            session_id: sessionId,
            visitor_id: visitorId,
            event_type: 'page_view'
        };

        // Send analytics data (fire and forget)
        fetch(ANALYTICS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData),
            keepalive: true // Ensure request completes even if page is closing
        }).catch(function(error) {
            // Silent failure - don't break the website if analytics fails
            console.debug('Analytics tracking failed:', error);
        });
    }

    /**
     * Initialize tracking
     */
    function init() {
        // Track initial page view
        if (document.readyState === 'complete') {
            trackPageView();
        } else {
            window.addEventListener('load', trackPageView);
        }
    }

    // Start tracking
    init();

})();
