/**
 * NFTPER API Module
 * Handles all communication with the backend
 */

const API = (function() {
    // ============================================================
    // CONFIGURATION
    // ============================================================

    // Production: Cloudflare Worker URL (hides your backend IP)
    const PRODUCTION_URL = 'https://blue-moon-d620.alporat.workers.dev';

    const API_URL = PRODUCTION_URL;

    /**
     * Submit a wallet for profit checking
     * @param {string} wallet - The wallet address
     * @param {string} timeframe - The timeframe (1w, 1m, 3m, 6m, 1y, all)
     * @param {string[]} chains - The chains to analyze
     * @returns {Promise<{queueId: string, position: number}>}
     */
    async function checkWallet(wallet, timeframe, chains = null) {
        const body = { wallet, timeframe };
        if (chains && chains.length > 0) {
            body.chains = chains;
        }

        const response = await fetch(`${API_URL}/api/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Failed to submit wallet');
        }

        return response.json();
    }

    /**
     * Get the status of a queued request
     * @param {string} queueId - The queue ID from checkWallet
     * @returns {Promise<{status: string, position?: number, data?: object}>}
     */
    async function getStatus(queueId) {
        const response = await fetch(`${API_URL}/api/status/${queueId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Failed to get status');
        }

        return response.json();
    }

    /**
     * Remove a request from the queue
     * @param {string} queueId - The queue ID to remove
     * @returns {Promise<{success: boolean}>}
     */
    async function removeFromQueue(queueId) {
        const response = await fetch(`${API_URL}/api/queue/${queueId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Failed to remove from queue');
        }

        return response.json();
    }

    /**
     * Remove from queue using Beacon API (for tab close)
     * This is fire-and-forget, no response handling
     * @param {string} queueId - The queue ID to remove
     */
    function removeFromQueueBeacon(queueId) {
        const url = `${API_URL}/api/queue/${queueId}`;
        const data = JSON.stringify({ action: 'remove' });

        // Use sendBeacon for reliable delivery during page unload
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url, data);
        } else {
            // Fallback for older browsers
            const xhr = new XMLHttpRequest();
            xhr.open('DELETE', url, false); // Synchronous for unload
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(data);
        }
    }

    // Public API
    return {
        checkWallet,
        getStatus,
        removeFromQueue,
        removeFromQueueBeacon,
    };
})();
