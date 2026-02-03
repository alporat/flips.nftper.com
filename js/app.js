/**
 * NFTPER App - Main Controller
 * Initializes the app and handles user interactions
 */

const App = (function() {
    // State
    let currentWallet = null;
    let currentTimeframe = null;
    let currentData = null;
    let selectedChains = ['ethereum'];

    /**
     * Initialize the application
     */
    function init() {
        // Initialize UI
        UI.init();

        // Get element references
        const elements = UI.getElements();

        // Setup event listeners
        setupEventListeners(elements);

        // Check URL for wallet address
        const urlWallet = getWalletFromUrl();
        if (urlWallet && isValidWalletAddress(urlWallet)) {
            // Pre-fill wallet input and auto-search
            elements.walletInput.value = urlWallet;
            // Small delay to ensure UI is ready
            setTimeout(() => {
                submitWalletCheck(urlWallet, elements.timeframeSelect.value);
            }, 100);
        } else {
            // Show input section
            UI.showInputSection();
        }
    }

    /**
     * Get wallet address from URL
     * Supports: /flips/0x... or ?wallet=0x...
     */
    function getWalletFromUrl() {
        // Check path: /0x... (direct wallet in URL)
        const pathMatch = window.location.pathname.match(/^\/(0x[a-fA-F0-9]{40})/i);
        if (pathMatch) {
            return pathMatch[1].toLowerCase();
        }

        // Check query params: ?wallet=0x...
        const params = new URLSearchParams(window.location.search);
        const walletParam = params.get('wallet');
        if (walletParam && /^0x[a-fA-F0-9]{40}$/i.test(walletParam)) {
            return walletParam.toLowerCase();
        }

        return null;
    }

    /**
     * Update URL with wallet address (without page reload)
     */
    function updateUrlWithWallet(wallet) {
        if (!wallet) return;

        // Use path-based URL: /0x...
        const newPath = `/${wallet.toLowerCase()}`;
        const newUrl = `${window.location.origin}${newPath}`;

        // Update URL without reload using History API
        if (window.history.pushState) {
            window.history.pushState({ wallet: wallet }, '', newUrl);
        }
    }

    /**
     * Clear wallet from URL
     */
    function clearUrlWallet() {
        const basePath = '/';
        if (window.history.pushState) {
            window.history.pushState({}, '', basePath);
        }
    }

    /**
     * Handle browser back/forward navigation
     */
    function handlePopState() {
        const wallet = getWalletFromUrl();

        if (wallet && isValidWalletAddress(wallet)) {
            // Navigate to wallet results
            const elements = UI.getElements();
            elements.walletInput.value = wallet;
            submitWalletCheck(wallet, currentTimeframe || '1m');
        } else {
            // Go back to input section
            Queue.cancel();
            UI.showInputSection();
        }
    }

    /**
     * Setup all event listeners
     */
    function setupEventListeners(elements) {
        // Main form submit
        elements.checkForm.addEventListener('submit', handleFormSubmit);

        // Results form submit
        const resultsForm = document.getElementById('results-check-form');
        if (resultsForm) {
            resultsForm.addEventListener('submit', handleResultsFormSubmit);
        }

        // Cancel button
        elements.cancelBtn.addEventListener('click', handleCancel);

        // Share button
        elements.shareBtn.addEventListener('click', handleShareClick);

        // Modal close
        elements.modalClose.addEventListener('click', () => UI.hideShareModal());
        elements.shareModal.querySelector('.modal-backdrop').addEventListener('click', () => UI.hideShareModal());

        // Share action buttons
        elements.copyImageBtn.addEventListener('click', Share.copyToClipboard);
        elements.downloadBtn.addEventListener('click', Share.downloadImage);
        elements.shareXBtn.addEventListener('click', Share.shareToX);

        // Close modal on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                UI.hideShareModal();
            }
        });

        // Handle browser back/forward navigation
        window.addEventListener('popstate', handlePopState);

        // Chains dropdown
        setupChainsDropdown();
    }

    /**
     * Setup chains dropdown functionality for both initial and results pages
     */
    function setupChainsDropdown() {
        // Setup initial page dropdown
        setupDropdown('initial-chains-btn', 'initial-chains-menu');

        // Setup results page dropdown
        setupDropdown('chains-dropdown-btn', 'chains-dropdown-menu');
    }

    /**
     * Setup a single dropdown
     */
    function setupDropdown(btnId, menuId) {
        const dropdownBtn = document.getElementById(btnId);
        const dropdownMenu = document.getElementById(menuId);

        if (!dropdownBtn || !dropdownMenu) return;

        // Toggle dropdown
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other dropdowns
            document.querySelectorAll('.chains-dropdown-menu').forEach(menu => {
                if (menu.id !== menuId) menu.classList.add('hidden');
            });
            dropdownMenu.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdownMenu.classList.add('hidden');
        });

        // Prevent closing when clicking inside menu
        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Handle checkbox changes
        const checkboxes = dropdownMenu.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateSelectedChains(menuId);
                // Sync with other dropdown
                syncChainsDropdowns(menuId);
            });
        });
    }

    /**
     * Update selected chains from a specific dropdown
     */
    function updateSelectedChains(menuId) {
        const checkboxes = document.querySelectorAll(`#${menuId} input[type="checkbox"]`);
        selectedChains = [];
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedChains.push(checkbox.value);
            }
        });

        // Update count displays
        updateChainCounts();
    }

    /**
     * Sync chain selections between dropdowns
     */
    function syncChainsDropdowns(sourceMenuId) {
        const targetMenuId = sourceMenuId === 'initial-chains-menu' ? 'chains-dropdown-menu' : 'initial-chains-menu';
        const targetMenu = document.getElementById(targetMenuId);

        if (!targetMenu) return;

        targetMenu.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = selectedChains.includes(checkbox.value);
        });
    }

    /**
     * Update all chain count displays
     */
    function updateChainCounts() {
        document.querySelectorAll('.chains-count').forEach(el => {
            el.textContent = `(${selectedChains.length})`;
        });
    }

    /**
     * Handle main form submission
     */
    async function handleFormSubmit(e) {
        e.preventDefault();

        const elements = UI.getElements();
        const wallet = elements.walletInput.value.trim();
        const timeframe = elements.timeframeSelect.value;

        await submitWalletCheck(wallet, timeframe);
    }

    /**
     * Handle results page form submission
     */
    async function handleResultsFormSubmit(e) {
        e.preventDefault();

        const walletInput = document.getElementById('results-wallet-input');
        const timeframeSelect = document.getElementById('results-timeframe-select');

        const wallet = walletInput.value.trim();
        const timeframe = timeframeSelect.value;

        await submitWalletCheck(wallet, timeframe);
    }

    /**
     * Submit wallet for checking (shared by both forms)
     */
    async function submitWalletCheck(wallet, timeframe) {
        // Validate wallet address
        if (!isValidWalletAddress(wallet)) {
            UI.showError('Please enter a valid wallet address (0x...)');
            return;
        }

        // Validate at least one chain is selected
        if (selectedChains.length === 0) {
            UI.showError('Please select at least one chain');
            return;
        }

        // Store current values
        currentWallet = wallet;
        currentTimeframe = timeframe;

        // Set loading state
        UI.setLoading(true);

        try {
            // Submit to API with selected chains
            const response = await API.checkWallet(wallet, timeframe, selectedChains);

            // Show queue section
            UI.showQueueSection(response.position);

            // Start polling
            Queue.startPolling(response.queueId, {
                onStatusChange: handleQueueStatusChange,
                onComplete: handleQueueComplete,
                onError: handleQueueError,
            });

        } catch (error) {
            console.error('Submit error:', error);
            UI.showError(error.message || 'Failed to submit request');
            UI.setLoading(false);
        }
    }

    /**
     * Handle queue status change
     */
    function handleQueueStatusChange(status) {
        UI.updateQueueStatus(status);
    }

    /**
     * Handle queue completion
     */
    function handleQueueComplete(data) {
        currentData = data;
        UI.showResultsSection(data, currentWallet, currentTimeframe);

        // Update URL with wallet address for easy sharing
        updateUrlWithWallet(currentWallet);
    }

    /**
     * Handle queue error
     */
    function handleQueueError(error) {
        console.error('Queue error:', error);
        UI.showError(error.message || 'An error occurred while processing');
    }

    /**
     * Handle cancel button click
     */
    async function handleCancel() {
        await Queue.cancel();
        UI.showInputSection();
        UI.setLoading(false);
        clearUrlWallet();
    }

    /**
     * Handle share button click
     */
    function handleShareClick() {
        if (!currentData || !currentWallet || !currentTimeframe) {
            UI.showError('No data to share');
            return;
        }

        // Generate the share card
        Share.generateCard(currentData, currentWallet, currentTimeframe);

        // Show modal
        UI.showShareModal();
    }

    /**
     * Validate wallet address format
     */
    function isValidWalletAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    // Public API
    return {
        init,
    };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
