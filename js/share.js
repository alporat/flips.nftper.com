/**
 * NFTPER Share Module
 * Handles share card image generation and sharing functionality
 */

const Share = (function() {
    // Canvas dimensions
    const CANVAS_WIDTH = 400;
    const CANVAS_HEIGHT = 550;
    const CANVAS_HEIGHT_NO_WALLET = 480; // Shorter when wallet hidden

    // Colors
    const COLORS = {
        bg: '#1a1a1a',
        cardBg: '#242424',
        green: '#2ecc71',
        red: '#e74c3c',
        white: '#ffffff',
        muted: '#888888',
        border: '#333333',
    };

    // Current data (stored when generating)
    let currentData = null;
    let currentWallet = null;
    let currentTimeframe = null;
    let hideWalletAddress = false;

    /**
     * Generate the share card on canvas
     * @param {object} data - Results data
     * @param {string} wallet - Wallet address
     * @param {string} timeframe - Timeframe code
     * @param {object} options - Optional settings
     */
    function generateCard(data, wallet, timeframe, options = {}) {
        currentData = data;
        currentWallet = wallet;
        currentTimeframe = timeframe;

        // Check if we should hide wallet (from options or stored state)
        const hideWallet = options.hideWallet !== undefined ? options.hideWallet : hideWalletAddress;

        const canvas = document.getElementById('share-canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size (shorter when wallet hidden)
        const canvasHeight = hideWallet ? CANVAS_HEIGHT_NO_WALLET : CANVAS_HEIGHT;
        canvas.width = CANVAS_WIDTH;
        canvas.height = canvasHeight;

        // Draw background
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw card background
        const cardMargin = 20;
        const cardRadius = 16;
        drawRoundedRect(ctx, cardMargin, cardMargin,
            CANVAS_WIDTH - cardMargin * 2, canvasHeight - cardMargin * 2,
            cardRadius, COLORS.cardBg);

        // Draw logo area
        drawLogo(ctx);

        // Draw divider
        ctx.fillStyle = COLORS.border;
        ctx.fillRect(50, 100, CANVAS_WIDTH - 100, 1);

        // Draw wallet (unless hidden)
        if (!hideWallet) {
            ctx.fillStyle = COLORS.muted;
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Wallet', CANVAS_WIDTH / 2, 135);

            ctx.fillStyle = COLORS.white;
            ctx.font = '16px Monaco, monospace';
            ctx.fillText(truncateAddress(wallet), CANVAS_WIDTH / 2, 160);
        }

        // Draw main P/L box
        const pnl = data.summary.totalProfitLoss;
        const pnlColor = pnl >= 0 ? COLORS.green : COLORS.red;

        // P/L box background (shifted up if wallet hidden)
        const pnlBoxY = hideWallet ? 125 : 185;
        drawRoundedRect(ctx, 50, pnlBoxY, CANVAS_WIDTH - 100, 100, 12, '#1a1a1a');

        // P/L value
        ctx.fillStyle = pnlColor;
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatPnl(pnl), CANVAS_WIDTH / 2, pnlBoxY + 50);

        // P/L label
        ctx.fillStyle = COLORS.muted;
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Total Profit/Loss', CANVAS_WIDTH / 2, pnlBoxY + 80);

        // Draw stats (shifted up if wallet hidden)
        const statsY = hideWallet ? 260 : 320;
        const lineHeight = 40;

        drawStatLine(ctx, '📅', 'Period', UI.getTimeframeDisplay(timeframe), statsY);
        drawStatLine(ctx, '🔄', 'Flips', data.summary.flipCount.toString(), statsY + lineHeight);
        drawStatLine(ctx, '📈', 'Win Rate', `${Math.round(data.summary.winRate)}%`, statsY + lineHeight * 2);
        drawStatLine(ctx, '🏆', 'Best Flip', formatPnlShort(data.summary.biggestWin) + ' ETH', statsY + lineHeight * 3);

        // Draw bottom divider (position relative to canvas bottom)
        const bottomDividerY = canvasHeight - 85;
        ctx.fillStyle = COLORS.border;
        ctx.fillRect(50, bottomDividerY, CANVAS_WIDTH - 100, 1);

        // Draw CTA (position relative to canvas bottom)
        ctx.fillStyle = COLORS.muted;
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Track your NFT profits at', CANVAS_WIDTH / 2, canvasHeight - 55);

        ctx.fillStyle = COLORS.green;
        ctx.font = '900 18px Inter, sans-serif';
        ctx.fillText('flips.nftper.com', CANVAS_WIDTH / 2, canvasHeight - 30);
    }

    /**
     * Regenerate card with current data (used when options change)
     */
    function regenerateCard() {
        if (currentData && currentWallet && currentTimeframe) {
            generateCard(currentData, currentWallet, currentTimeframe);
        }
    }

    /**
     * Set hide wallet option and regenerate
     * @param {boolean} hide - Whether to hide wallet address
     */
    function setHideWallet(hide) {
        hideWalletAddress = hide;
        regenerateCard();
    }

    /**
     * Initialize share modal event listeners
     */
    function initListeners() {
        const checkbox = document.getElementById('hide-wallet-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                setHideWallet(e.target.checked);
            });
        }
    }

    // Initialize listeners when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initListeners);
    } else {
        initListeners();
    }

    /**
     * Draw the logo at top of card
     * @param {CanvasRenderingContext2D} ctx
     */
    function drawLogo(ctx) {
        // Draw text logo with weight 900
        ctx.font = '900 28px Inter, sans-serif';

        // Measure text widths
        const nftWidth = ctx.measureText('NFT').width;
        const perWidth = ctx.measureText('PER').width;
        const logoIconSize = 28;
        const gap = 10;
        const totalWidth = logoIconSize + gap + nftWidth + perWidth;
        const startX = (CANVAS_WIDTH - totalWidth) / 2;

        // Try to draw logo icon
        const logoImg = document.querySelector('.logo-icon');
        if (logoImg && logoImg.complete) {
            ctx.drawImage(logoImg, startX, 45, logoIconSize, logoIconSize);
        }

        // NFT in green
        ctx.textAlign = 'left';
        ctx.fillStyle = COLORS.green;
        ctx.fillText('NFT', startX + logoIconSize + gap, 68);

        // PER in white
        ctx.fillStyle = COLORS.white;
        ctx.fillText('PER', startX + logoIconSize + gap + nftWidth, 68);
    }

    /**
     * Draw a stat line with emoji, label, and value
     */
    function drawStatLine(ctx, emoji, label, value, y) {
        const leftX = 60;
        const rightX = CANVAS_WIDTH - 60;

        // Emoji and label
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = COLORS.white;
        ctx.fillText(`${emoji}  ${label}`, leftX, y);

        // Value
        ctx.textAlign = 'right';
        ctx.fillStyle = COLORS.white;
        ctx.fillText(value, rightX, y);
    }

    /**
     * Draw rounded rectangle
     */
    function drawRoundedRect(ctx, x, y, width, height, radius, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Copy canvas image to clipboard
     */
    async function copyToClipboard() {
        const canvas = document.getElementById('share-canvas');

        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

            if (navigator.clipboard && navigator.clipboard.write) {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                UI.showToast('Copied to clipboard!');
            } else {
                // Fallback: download instead
                downloadImage();
                UI.showToast('Downloaded (clipboard not supported)');
            }
        } catch (error) {
            console.error('Copy failed:', error);
            UI.showToast('Failed to copy. Try downloading instead.');
        }
    }

    /**
     * Download canvas as image
     */
    function downloadImage() {
        const canvas = document.getElementById('share-canvas');
        const link = document.createElement('a');

        const walletShort = currentWallet ? currentWallet.slice(0, 8) : 'wallet';
        link.download = `nftper-flips-${walletShort}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        UI.showToast('Image downloaded!');
    }

    /**
     * Share to X (Twitter)
     * Note: Twitter/X doesn't support attaching images via URL - user must paste manually
     */
    function shareToX() {
        if (!currentData) return;

        const pnl = currentData.summary.totalProfitLoss;
        const pnlText = pnl >= 0
            ? `+${pnl.toFixed(4)} ETH profit`
            : `${pnl.toFixed(4)} ETH loss`;

        const text = encodeURIComponent(
            `I made ${pnlText} flipping NFTs! 🔥\n\nCheck your wallet profits at flips.nftper.com`
        );

        const url = `https://twitter.com/intent/tweet?text=${text}`;

        // Open in new tab instead of popup
        window.open(url, '_blank');

        // Copy image to clipboard so user can paste it into the tweet
        copyToClipboard();
        UI.showToast('Image copied! Paste it into your tweet.');
    }

    // ===== Helper Functions =====

    function truncateAddress(address) {
        if (!address || address.length < 10) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    function formatPnl(value) {
        const prefix = value >= 0 ? '+' : '';
        return `${prefix}${value.toFixed(4)} ETH`;
    }

    function formatPnlShort(value) {
        const prefix = value >= 0 ? '+' : '';
        return `${prefix}${value.toFixed(4)}`;
    }

    // Public API
    return {
        generateCard,
        copyToClipboard,
        downloadImage,
        shareToX,
        setHideWallet,
        regenerateCard,
    };
})();
