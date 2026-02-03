/**
 * NFTPER Queue Module
 * Handles queue polling, status updates, and tab close cleanup
 */

const Queue = (function() {
    // State
    let currentQueueId = null;
    let pollInterval = null;
    let onStatusChange = null;
    let onComplete = null;
    let onError = null;

    // Constants
    const POLL_INTERVAL_MS = 2500; // Poll every 2.5 seconds

    /**
     * Start monitoring a queue position
     * @param {string} queueId - The queue ID to monitor
     * @param {object} callbacks - Callback functions
     * @param {function} callbacks.onStatusChange - Called when status changes
     * @param {function} callbacks.onComplete - Called when processing is complete
     * @param {function} callbacks.onError - Called on error
     */
    function startPolling(queueId, callbacks) {
        // Store state
        currentQueueId = queueId;
        onStatusChange = callbacks.onStatusChange || (() => {});
        onComplete = callbacks.onComplete || (() => {});
        onError = callbacks.onError || (() => {});

        // Start polling
        poll();
        pollInterval = setInterval(poll, POLL_INTERVAL_MS);

        // Setup tab close handler
        setupBeforeUnload();
    }

    /**
     * Stop polling and cleanup
     */
    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        currentQueueId = null;
    }

    /**
     * Cancel the current queue request
     */
    async function cancel() {
        if (!currentQueueId) return;

        const queueId = currentQueueId;
        stopPolling();

        try {
            await API.removeFromQueue(queueId);
        } catch (error) {
            console.error('Failed to cancel queue:', error);
        }
    }

    /**
     * Poll for status update
     */
    async function poll() {
        if (!currentQueueId) return;

        try {
            const result = await API.getStatus(currentQueueId);

            switch (result.status) {
                case 'queued':
                    onStatusChange({
                        status: 'queued',
                        position: result.position,
                        message: `You are #${result.position} in queue`,
                    });
                    break;

                case 'processing':
                    onStatusChange({
                        status: 'processing',
                        position: 0,
                        message: 'Processing your request...',
                    });
                    break;

                case 'completed':
                    stopPolling();
                    onComplete(result.data);
                    break;

                case 'error':
                    stopPolling();
                    onError(new Error(result.message || 'Processing failed'));
                    break;

                default:
                    console.warn('Unknown status:', result.status);
            }
        } catch (error) {
            console.error('Polling error:', error);
            // Don't stop polling on network errors, just log them
            // The user can cancel manually if needed
        }
    }

    /**
     * Setup beforeunload handler to remove from queue on tab close
     */
    function setupBeforeUnload() {
        window.addEventListener('beforeunload', handleBeforeUnload);
    }

    /**
     * Handle tab close/navigation
     */
    function handleBeforeUnload() {
        if (currentQueueId) {
            API.removeFromQueueBeacon(currentQueueId);
        }
    }

    /**
     * Check if currently in queue
     * @returns {boolean}
     */
    function isInQueue() {
        return currentQueueId !== null;
    }

    /**
     * Get current queue ID
     * @returns {string|null}
     */
    function getQueueId() {
        return currentQueueId;
    }

    // Public API
    return {
        startPolling,
        stopPolling,
        cancel,
        isInQueue,
        getQueueId,
    };
})();
