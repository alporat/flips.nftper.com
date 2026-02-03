/**
 * NFTPER UI Module
 * Handles all DOM manipulation and rendering
 */

const UI = (function() {
    // Element references (cached on init)
    let elements = {};

    // Current flips data for sorting
    let currentFlips = [];
    let currentSortKey = 'date';
    let currentSortDir = 'desc';

    // Sell method display names
    const SELL_METHODS = {
        'opensea_listing': 'OpenSea Listing Sale',
        'opensea_offer': 'OpenSea Offer Accept',
        'blur_listing': 'Blur Listing Sale',
        'blur_offer': 'Blur Offer Accept',
        'blur_blend': 'Blur Blend + Listing',
        'private': 'Private Sale',
        'transferred': 'Transferred',
        'multi_sale': 'Multi-Sale (Unknown)',
        'alt_sale': 'Sold from Alt',
        'opensea': 'OpenSea (Alt)',
        'blur': 'Blur (Alt)',
    };

    // Timeframe display names
    const TIMEFRAMES = {
        '1w': '1 Week',
        '1m': '1 Month',
        '3m': '3 Months',
        '6m': '6 Months',
        '1y': '1 Year',
        'all': 'All Time',
    };

    // Chain icon paths (absolute paths for SPA routing)
    const CHAIN_ICONS = {
        'ethereum': '/assets/chains/ethereum.svg',
        'polygon': '/assets/chains/polygon.svg',
        'base': '/assets/chains/base.svg',
        'arbitrum': '/assets/chains/arbitrum.svg',
        'hyperevm': '/assets/chains/hyperevm.svg',
    };

    /**
     * Initialize UI module - cache element references
     */
    function init() {
        elements = {
            // Sections
            inputSection: document.getElementById('input-section'),
            queueSection: document.getElementById('queue-section'),
            resultsSection: document.getElementById('results-section'),

            // Form elements
            checkForm: document.getElementById('check-form'),
            walletInput: document.getElementById('wallet-input'),
            timeframeSelect: document.getElementById('timeframe-select'),
            checkBtn: document.getElementById('check-btn'),

            // Queue elements
            queuePosition: document.getElementById('queue-position'),
            queueStatusText: document.getElementById('queue-status-text'),
            queueMessage: document.getElementById('queue-message'),
            cancelBtn: document.getElementById('cancel-btn'),

            // Results elements
            resultWallet: document.getElementById('result-wallet'),
            totalPnl: document.getElementById('total-pnl'),
            flipCount: document.getElementById('flip-count'),
            winningCount: document.getElementById('winning-count'),
            losingCount: document.getElementById('losing-count'),
            totalSpend: document.getElementById('total-spend'),
            totalSold: document.getElementById('total-sold'),
            overallRoi: document.getElementById('overall-roi'),
            timeframeDisplay: document.getElementById('timeframe-display'),
            flipsCount: document.getElementById('flips-count'),
            flipsList: document.getElementById('flips-list'),
            flipsTable: document.getElementById('flips-table'),
            shareBtn: document.getElementById('share-btn'),

            // Modal elements
            shareModal: document.getElementById('share-modal'),
            modalClose: document.getElementById('modal-close'),
            shareCanvas: document.getElementById('share-canvas'),
            copyImageBtn: document.getElementById('copy-image-btn'),
            downloadBtn: document.getElementById('download-btn'),
            shareXBtn: document.getElementById('share-x-btn'),

            // Toast
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toast-message'),
        };

        // Setup table sorting event listeners
        setupTableSorting();
    }

    /**
     * Setup table header click handlers for sorting
     */
    function setupTableSorting() {
        const table = document.getElementById('flips-table');
        if (!table) return;

        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.dataset.sort;

                // Toggle direction if same column, otherwise default to desc
                if (sortKey === currentSortKey) {
                    currentSortDir = currentSortDir === 'desc' ? 'asc' : 'desc';
                } else {
                    currentSortKey = sortKey;
                    currentSortDir = 'desc';
                }

                // Update header styles
                headers.forEach(h => {
                    h.classList.remove('sorted', 'asc', 'desc');
                });
                header.classList.add('sorted', currentSortDir);

                // Re-render sorted flips
                renderFlipsTable(sortFlips(currentFlips, currentSortKey, currentSortDir));
            });
        });
    }

    /**
     * Sort flips array by key
     */
    function sortFlips(flips, key, dir) {
        return [...flips].sort((a, b) => {
            let valA, valB;

            switch (key) {
                case 'wallet':
                    valA = a.sellWallet || '';
                    valB = b.sellWallet || '';
                    break;
                case 'entry':
                    valA = a.buyPrice || 0;
                    valB = b.buyPrice || 0;
                    break;
                case 'exit':
                    valA = a.sellPrice || 0;
                    valB = b.sellPrice || 0;
                    break;
                case 'profit':
                    valA = a.profitLoss || 0;
                    valB = b.profitLoss || 0;
                    break;
                case 'roi':
                    valA = a.buyPrice > 0 ? (a.profitLoss / a.buyPrice) * 100 : 0;
                    valB = b.buyPrice > 0 ? (b.profitLoss / b.buyPrice) * 100 : 0;
                    break;
                case 'hold':
                    valA = a.holdDuration || 0;
                    valB = b.holdDuration || 0;
                    break;
                case 'date':
                    valA = a.sellDate ? new Date(a.sellDate).getTime() : 0;
                    valB = b.sellDate ? new Date(b.sellDate).getTime() : 0;
                    break;
                default:
                    valA = 0;
                    valB = 0;
            }

            if (typeof valA === 'string') {
                return dir === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }
            return dir === 'asc' ? valA - valB : valB - valA;
        });
    }

    /**
     * Show the input section, hide others
     */
    function showInputSection() {
        elements.inputSection.classList.remove('hidden');
        elements.queueSection.classList.add('hidden');
        elements.resultsSection.classList.add('hidden');
        elements.walletInput.value = '';
        elements.checkBtn.disabled = false;
    }

    /**
     * Show the queue section
     * @param {number} position - Queue position
     */
    function showQueueSection(position) {
        elements.inputSection.classList.add('hidden');
        elements.queueSection.classList.remove('hidden');
        elements.resultsSection.classList.add('hidden');
        updateQueueStatus({ status: 'queued', position, message: `Please wait while we process your request...` });
    }

    /**
     * Update queue status display
     * @param {object} status - Status object
     */
    function updateQueueStatus(status) {
        if (status.status === 'queued') {
            elements.queueStatusText.innerHTML = `You are #<span id="queue-position">${status.position}</span> in queue`;
        } else if (status.status === 'processing') {
            elements.queueStatusText.textContent = 'Processing...';
        }
        elements.queueMessage.textContent = status.message;
    }

    /**
     * Show the results section with data
     * @param {object} data - Results data from API
     * @param {string} wallet - The wallet address
     * @param {string} timeframe - The timeframe used
     */
    function showResultsSection(data, wallet, timeframe) {
        elements.inputSection.classList.add('hidden');
        elements.queueSection.classList.add('hidden');
        elements.resultsSection.classList.remove('hidden');

        // Populate results search bar with current wallet
        const resultsWalletInput = document.getElementById('results-wallet-input');
        const resultsTimeframeSelect = document.getElementById('results-timeframe-select');
        if (resultsWalletInput) {
            resultsWalletInput.value = wallet;
        }
        if (resultsTimeframeSelect) {
            resultsTimeframeSelect.value = timeframe;
        }

        // Render summary
        renderSummary(data.summary, wallet, timeframe);

        // Store flips for sorting and render
        currentFlips = data.flips || [];
        const sortedFlips = sortFlips(currentFlips, currentSortKey, currentSortDir);
        renderFlipsList(sortedFlips);

        // Render holdings list (items still held)
        renderHoldingsList(data.holdings || []);
    }

    /**
     * Render the summary stats
     * @param {object} summary - Summary data
     * @param {string} wallet - Wallet address
     * @param {string} timeframe - Timeframe code
     */
    function renderSummary(summary, wallet, timeframe) {
        // Wallet address (truncated)
        elements.resultWallet.textContent = truncateAddress(wallet);
        elements.resultWallet.title = wallet;

        // Calculate additional stats
        const totalSpend = summary.totalSpend || summary.totalVolume || 0;
        const totalSold = summary.totalSold || (totalSpend + summary.totalProfitLoss) || 0;
        const winningCount = summary.winningCount || Math.round(summary.flipCount * (summary.winRate / 100)) || 0;
        const losingCount = summary.flipCount - winningCount;
        const roi = totalSpend > 0 ? (summary.totalProfitLoss / totalSpend) * 100 : 0;

        // Update stats
        elements.flipCount.textContent = summary.flipCount;
        elements.winningCount.textContent = winningCount;
        elements.losingCount.textContent = losingCount;
        elements.totalSpend.textContent = formatNumber(totalSpend, 2);
        elements.totalSold.textContent = formatNumber(totalSold, 2);

        // Total P/L
        const pnl = summary.totalProfitLoss;
        elements.totalPnl.textContent = formatPnl(pnl);
        elements.totalPnl.className = `stat-box-value large ${pnl >= 0 ? 'profit' : 'loss'}`;

        // ROI
        elements.overallRoi.textContent = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
        elements.overallRoi.className = `stat-box-value ${roi >= 0 ? 'profit' : 'loss'}`;

        // Timeframe
        elements.timeframeDisplay.textContent = TIMEFRAMES[timeframe] || timeframe;
    }

    /**
     * Render the flips list (wrapper that updates count)
     * @param {array} flips - Array of flip objects
     */
    function renderFlipsList(flips) {
        // Update count
        if (elements.flipsCount) {
            elements.flipsCount.textContent = `${flips.length} flip${flips.length !== 1 ? 's' : ''}`;
        }

        renderFlipsTable(flips);
    }

    /**
     * Render the flips table body
     * @param {array} flips - Array of flip objects
     */
    function renderFlipsTable(flips) {
        elements.flipsList.innerHTML = '';

        if (!flips || flips.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="8" class="no-flips">No flips found in this timeframe.</td>';
            elements.flipsList.appendChild(tr);
            return;
        }

        flips.forEach(flip => {
            const row = createFlipRow(flip);
            elements.flipsList.appendChild(row);
        });
    }

    /**
     * Create a flip table row element
     * @param {object} flip - Flip data
     * @returns {HTMLElement}
     */
    function createFlipRow(flip) {
        const tr = document.createElement('tr');
        const isTransferred = flip.status === 'transferred' || flip.status === 'status_unknown';
        const isSoldFromAlt = flip.status === 'sold_from_alt';
        const isBlurLoan = flip.status === 'blur_loan';
        const hasBlurLoan = flip.blurLoan && flip.blurLoan.amount > 0;
        const hasSelfSaleWarning = flip.selfSaleWarning;

        if (isTransferred) tr.classList.add('transferred-row');
        if (isSoldFromAlt) tr.classList.add('sold-from-alt');
        if (isBlurLoan) tr.classList.add('blur-loan');
        if (hasSelfSaleWarning) tr.classList.add('self-sale-warning');

        const chainIcon = CHAIN_ICONS[flip.chain] || CHAIN_ICONS['ethereum'];
        const sellMethodDisplay = SELL_METHODS[flip.sellMethod] || flip.sellMethod || 'Unknown';

        // Calculate ROI
        const roi = flip.buyPrice > 0 ? (flip.profitLoss / flip.buyPrice) * 100 : 0;
        const roiFormatted = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
        const roiClass = roi >= 0 ? 'profit' : 'loss';

        // Format profit/loss
        const pnlClass = flip.profitLoss >= 0 ? 'profit' : 'loss';
        const pnlFormatted = formatPnl(flip.profitLoss);

        // Format hold duration
        const holdDisplay = formatHoldDuration(flip.holdDuration);

        // Format sale date
        const sellDate = flip.sellDate ? new Date(flip.sellDate) : null;
        const dateDisplay = sellDate ? sellDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit'
        }) : '-';
        const timeDisplay = sellDate ? sellDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        }) : '';

        // Determine wallet display text
        let walletDisplay, walletTitle;
        if (isTransferred) {
            walletDisplay = `To: ${truncateAddress(flip.sellWallet)}`;
            walletTitle = `Transferred to: ${flip.sellWallet}\n(Not sold yet)`;
        } else if (isSoldFromAlt) {
            const altLabel = flip.altWallet?.label || 'Alt';
            walletDisplay = `${altLabel.replace('Alt Account #', 'Alt #').replace('Unknown Wallet', 'Unknown')}`;
            walletTitle = `${sellMethodDisplay}\n${altLabel}: ${flip.sellWallet}`;
        } else if (isBlurLoan) {
            walletDisplay = truncateAddress(flip.sellWallet);
            walletTitle = `Blur Blend Loan (pending sale)\nLoan: ${formatNumber(flip.blurLoan?.amount || 0, 4)} ETH\nWallet: ${flip.sellWallet}`;
        } else if (hasBlurLoan) {
            walletDisplay = truncateAddress(flip.sellWallet);
            walletTitle = `${sellMethodDisplay}\nLoan: ${formatNumber(flip.blurLoan.amount, 4)} ETH\nSale: +${formatNumber(flip.sellPrice, 4)} ETH\nWallet: ${flip.sellWallet}`;
        } else {
            // Direct sale - show the searched wallet (sellWallet from backend)
            walletDisplay = truncateAddress(flip.sellWallet);
            walletTitle = `${sellMethodDisplay}\nSold from: ${flip.sellWallet}`;
        }

        // Add self-sale warning to title if applicable
        if (hasSelfSaleWarning) {
            const buyerAddr = flip.selfSaleWarning.buyerAddress || '';
            const truncatedBuyer = buyerAddr ? `${buyerAddr.slice(0, 6)}...${buyerAddr.slice(-4)}` : 'unknown';
            walletTitle += `\n⚠️ Possible self-sale: ${flip.selfSaleWarning.count} profitable NFTs sold to ${truncatedBuyer}`;
        }

        // Entry price (always negative/red - cost)
        const entryDisplay = `-${formatNumber(flip.buyPrice, 4)}`;

        // Exit price - use totalReceived from backend (already includes Blur loan if applicable)
        let exitDisplay, exitTooltip;
        if (isTransferred) {
            exitDisplay = '-';
            exitTooltip = '';
        } else if (isBlurLoan) {
            // Pending blur loan - only got loan so far
            exitDisplay = `+${formatNumber(flip.totalReceived || flip.blurLoan?.amount || 0, 4)} (loan)`;
            exitTooltip = '';
        } else {
            // Use totalReceived which includes blur loan amount for blur blend sales
            const sellPrice = flip.totalReceived || flip.sellPrice;
            exitDisplay = `+${formatNumber(sellPrice, 4)}`;

            // Build tooltip for exit price showing fee breakdown
            if (flip.tooltipData && flip.tooltipData.grossSalePrice && flip.tooltipData.grossSalePrice > 0) {
                const gross = flip.tooltipData.grossSalePrice;
                const fees = flip.tooltipData.feesPaid || 0;
                const net = flip.tooltipData.netReceived || sellPrice;
                exitTooltip = `Gross Sale: ${formatNumber(gross, 4)} ETH\nFees: -${formatNumber(fees, 4)} ETH\nNet Received: ${formatNumber(net, 4)} ETH`;
                if (flip.tooltipData.blurLoan) {
                    exitTooltip += `\nBlur Loan: +${formatNumber(flip.tooltipData.blurLoan, 4)} ETH`;
                }
            } else {
                // Show what we know - net received and profit
                exitTooltip = `Net Received: ${formatNumber(sellPrice, 4)} ETH`;
                if (flip.profitLoss !== undefined) {
                    const pnlSign = flip.profitLoss >= 0 ? '+' : '';
                    exitTooltip += `\nProfit: ${pnlSign}${formatNumber(flip.profitLoss, 4)} ETH`;
                }
            }
        }

        // Self-sale warning icon
        const selfSaleIcon = hasSelfSaleWarning ? '<span class="self-sale-icon" title="Possible self-sale detected">⚠️</span>' : '';

        tr.innerHTML = `
            <td>
                <a href="${flip.openseaUrl}" target="_blank" class="nft-cell-link" onclick="event.stopPropagation()">
                    <div class="nft-cell">
                        <div class="nft-chain-icon">
                            <img src="${chainIcon}" alt="${flip.chain}" title="${flip.chain}">
                        </div>
                        <img
                            class="nft-image"
                            src="${flip.imageUrl || '/assets/placeholder-nft.svg'}"
                            alt="${flip.collection}"
                            onerror="this.src='/assets/placeholder-nft.svg'"
                        >
                        <div class="nft-info">
                            <div class="nft-name" title="${escapeHtml(flip.nftName || flip.collection + ' #' + flip.tokenId)}">
                                ${escapeHtml(flip.nftName || flip.collection + ' #' + flip.tokenId)}
                                <svg class="external-link-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                    <polyline points="15 3 21 3 21 9"/>
                                    <line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </a>
            </td>
            <td>
                <div class="wallet-cell hoverable" title="${walletTitle}">${selfSaleIcon}${walletDisplay}</div>
            </td>
            <td>
                <div class="price-cell">${entryDisplay}</div>
            </td>
            <td>
                <div class="price-cell hoverable" ${exitTooltip ? `title="${exitTooltip}"` : ''}>${exitDisplay}</div>
            </td>
            <td>
                <div class="profit-cell ${isTransferred ? 'transferred' : pnlClass}">${isTransferred ? '-' : pnlFormatted}</div>
            </td>
            <td>
                <div class="roi-cell ${isTransferred ? 'transferred' : roiClass}">${isTransferred ? '-' : roiFormatted}</div>
            </td>
            <td>
                <div class="hold-cell ${isTransferred ? 'transferred' : ''}">${isTransferred ? 'Transferred' : holdDisplay}</div>
            </td>
            <td>
                <div class="date-cell">
                    ${dateDisplay}
                    <span class="date-relative">${timeDisplay}</span>
                </div>
            </td>
        `;

        return tr;
    }

    /**
     * Render the holdings list (NFTs still being held)
     * @param {array} holdings - Array of holding objects
     */
    function renderHoldingsList(holdings) {
        let holdingsSection = document.getElementById('holdings-section');
        let holdingsContainer = document.getElementById('holdings-list');

        if (!holdingsSection || !holdingsContainer) return;

        holdingsContainer.innerHTML = '';

        if (!holdings || holdings.length === 0) {
            holdingsSection.classList.add('hidden');
            return;
        }

        holdingsSection.classList.remove('hidden');

        holdings.forEach(holding => {
            const row = createHoldingRow(holding);
            holdingsContainer.appendChild(row);
        });
    }

    /**
     * Create a holding table row element
     * @param {object} holding - Holding data
     * @returns {HTMLElement}
     */
    function createHoldingRow(holding) {
        const tr = document.createElement('tr');
        tr.className = 'holding-row';

        const chainIcon = CHAIN_ICONS[holding.chain] || CHAIN_ICONS['ethereum'];
        const buyPriceFormatted = `-${formatNumber(holding.buyPrice, 4)}`;
        const holdDuration = Math.floor((Date.now() - new Date(holding.buyDate).getTime()) / 1000);
        const holdDisplay = formatHoldDuration(holdDuration);

        tr.innerHTML = `
            <td>
                <a href="${holding.openseaUrl}" target="_blank" class="nft-cell-link" onclick="event.stopPropagation()">
                    <div class="nft-cell">
                        <div class="nft-chain-icon">
                            <img src="${chainIcon}" alt="${holding.chain}" title="${holding.chain}">
                        </div>
                        <img
                            class="nft-image"
                            src="${holding.imageUrl || '/assets/placeholder-nft.svg'}"
                            alt="${holding.collection}"
                            onerror="this.src='/assets/placeholder-nft.svg'"
                        >
                        <div class="nft-info">
                            <div class="nft-name" title="${escapeHtml(holding.nftName || holding.collection + ' #' + holding.tokenId)}">
                                ${escapeHtml(holding.nftName || holding.collection + ' #' + holding.tokenId)}
                                <svg class="external-link-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                    <polyline points="15 3 21 3 21 9"/>
                                    <line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </a>
            </td>
            <td>
                <div class="price-cell">${buyPriceFormatted}</div>
            </td>
            <td>
                <div class="hold-cell">${holdDisplay}</div>
            </td>
        `;

        return tr;
    }

    /**
     * Show the share modal
     */
    function showShareModal() {
        elements.shareModal.classList.remove('hidden');
    }

    /**
     * Hide the share modal
     */
    function hideShareModal() {
        elements.shareModal.classList.add('hidden');
    }

    /**
     * Show a toast notification
     * @param {string} message - Message to show
     * @param {number} duration - Duration in ms (default 3000)
     */
    function showToast(message, duration = 3000) {
        elements.toastMessage.textContent = message;
        elements.toast.classList.remove('hidden');

        setTimeout(() => {
            elements.toast.classList.add('hidden');
        }, duration);
    }

    /**
     * Show an error message
     * @param {string} message - Error message
     */
    function showError(message) {
        showToast(message, 5000);
        showInputSection();
    }

    /**
     * Set loading state on check button
     * @param {boolean} loading - Is loading
     */
    function setLoading(loading) {
        elements.checkBtn.disabled = loading;
        elements.checkBtn.textContent = loading ? 'Checking...' : 'Check Profit';
    }

    // ===== Helper Functions =====

    /**
     * Truncate wallet address
     * @param {string} address - Full address
     * @returns {string}
     */
    function truncateAddress(address) {
        if (!address || address.length < 10) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    /**
     * Format P/L value
     * @param {number} value - P/L in ETH
     * @returns {string}
     */
    function formatPnl(value) {
        const prefix = value >= 0 ? '+' : '';
        return `${prefix}${formatNumber(value, 4)} ETH`;
    }

    /**
     * Format number with decimals
     * @param {number} value - Number to format
     * @param {number} decimals - Decimal places (default 4)
     * @returns {string}
     */
    function formatNumber(value, decimals = 4) {
        return Number(value).toFixed(decimals);
    }

    /**
     * Format hold duration from seconds
     * @param {number} seconds - Hold duration in seconds
     * @returns {string}
     */
    function formatHoldDuration(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 30) {
            const months = Math.floor(days / 30);
            return `${months}mo`;
        }
        if (days > 0) {
            return `${days}d ${hours}h`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Get element references (for other modules)
     * @returns {object}
     */
    function getElements() {
        return elements;
    }

    /**
     * Get timeframe display name
     * @param {string} code - Timeframe code
     * @returns {string}
     */
    function getTimeframeDisplay(code) {
        return TIMEFRAMES[code] || code;
    }

    // Public API
    return {
        init,
        showInputSection,
        showQueueSection,
        updateQueueStatus,
        showResultsSection,
        showShareModal,
        hideShareModal,
        showToast,
        showError,
        setLoading,
        getElements,
        getTimeframeDisplay,
        truncateAddress,
        formatPnl,
        formatNumber,
    };
})();
