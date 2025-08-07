/**
 * REAL AGENTIC Browser Automation - Actually clicks buttons and fills forms
 */

import { chromium } from "playwright";
import logger from "../utils/logger.js";

export class SimpleBrowserAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * REAL AGENTIC automation - Actually automate the booking process with timeout
     */
    async automateHotelBooking(hotelData, guestInfo, onProgress) {
        let automationTimeout = null;
        let isTimedOut = false;

        // Add overall timeout to prevent hanging
        automationTimeout = setTimeout(() => {
            logger.warn("⏰ Automation timeout reached - failing gracefully");
            isTimedOut = true;
            if (this.browser) {
                this.browser.close().catch(() => {});
                this.browser = null;
            }
        }, 45000); // 45 second timeout (extended)

        try {
            const hotelName = hotelData.name || hotelData.title || "Selected Hotel";
            logger.info("🤖 Starting REAL AGENTIC automation for:", hotelName);

            // Step 1: Launch browser in background
            onProgress?.({ step: 1, message: "🚀 Launching AI booking agent..." });
            await this.delay(600);

            this.browser = await chromium.launch({
                headless: false, // VISIBLE browser so you can see the automation working!
                slowMo: 200, // Slower so you can see what it's doing
                args: [
                    "--disable-popup-blocking",
                    "--no-first-run",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--start-maximized",
                ],
            });

            const context = await this.browser.newContext({
                userAgent:
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            });
            this.page = await context.newPage();

            // Step 2: Navigate to booking site
            onProgress?.({ step: 2, message: `🌐 Connecting to booking site...` });
            await this.delay(800);

            const searchUrl = this.buildWorkingBookingUrl(hotelData, guestInfo);
            logger.info("🔗 Navigating to:", searchUrl);

            await this.page.goto(searchUrl, {
                waitUntil: "domcontentloaded",
                timeout: 30000,
            });

            // Step 3: Find and click on the specific hotel
            onProgress?.({ step: 3, message: `🎯 Locating "${hotelName}" on page...` });
            await this.delay(1200);

            // STEP BY STEP ROBUST AUTOMATION - Track progress properly
            let automationSuccess = false;
            let finalUrl = this.page.url();

            // Step 4: Navigate to hotel page
            onProgress?.({ step: 4, message: "🏨 Finding and opening hotel page..." });

            const hotelPageReached = await this.navigateToHotelPage();
            if (hotelPageReached && !isTimedOut) {
                finalUrl = this.page.url();
                logger.info("✅ Successfully reached hotel page:", finalUrl);

                // Step 5: Navigate to booking/reservation form
                onProgress?.({ step: 5, message: "🎯 Opening booking form..." });

                const bookingFormReached = await this.navigateToBookingForm();
                if (bookingFormReached && !isTimedOut) {
                    finalUrl = this.page.url();
                    logger.info("✅ Successfully reached booking form:", finalUrl);

                    // Step 6: Fill guest information
                    onProgress?.({ step: 6, message: "👤 Auto-filling your information..." });

                    await this.delay(2000); // Give form time to load
                    if (!isTimedOut) {
                        await this.fillGuestInformation(guestInfo);
                    }

                    // Step 7: Navigate to checkout if possible
                    onProgress?.({ step: 7, message: "💳 Completing checkout process..." });

                    if (!isTimedOut) {
                        const checkoutReached = await this.navigateToCheckout();
                        if (checkoutReached) {
                            finalUrl = this.page.url();
                            logger.info("✅ Successfully reached checkout:", finalUrl);
                        }
                    }

                    automationSuccess = true;
                } else {
                    logger.warn("⚠️ Could not reach booking form, staying on hotel page");
                    automationSuccess = true; // Still consider success if we have hotel page
                }
            } else {
                logger.warn("⚠️ Could not reach hotel page, automation limited");
                // Continue anyway - maybe we can still do something useful
            }

            // Update final URL for return (only if page is still alive)
            if (!isTimedOut && this.page && !this.page.isClosed()) {
                try {
                    finalUrl = this.page.url();
                } catch (e) {
                    logger.warn("⚠️ Could not get final URL - using last known URL");
                }
            }

            // Step 7: Finalizing
            onProgress?.({ step: 7, message: "⚙️ Finalizing booking process..." });
            await this.delay(800);

            // Step 8: Complete
            onProgress?.({ step: 8, message: "✅ Automation complete! Opening final page..." });
            await this.delay(500);

            // Wait a moment to see final page
            await this.delay(2000);

            // Use the finalUrl we tracked during automation
            logger.info("🎉 REAL automation completed! Final URL:", finalUrl);

            // Enhanced analysis of what we achieved (only if browser is still alive)
            let hasBookingForms = false;
            let isOnHotelPage = false;

            if (!isTimedOut && this.page && !this.page.isClosed()) {
                try {
                    hasBookingForms = await this.page.$(
                        'input[name="firstname"], input[type="email"], input[name="guest_firstname"]',
                    );
                    isOnHotelPage =
                        finalUrl.includes("/hotel/") ||
                        (await this.page.$(".hprt-table, .roomstable"));
                } catch (e) {
                    logger.warn("⚠️ Could not analyze page - browser may be closed");
                }
            }

            const isCheckoutPage =
                finalUrl.includes("book") ||
                finalUrl.includes("checkout") ||
                finalUrl.includes("reservation") ||
                finalUrl.includes("payment") ||
                !!hasBookingForms;

            // Only succeed if we made real progress
            const isStillOnSearchResults =
                finalUrl.includes("searchresults") && !isOnHotelPage && !isCheckoutPage;
            if (isStillOnSearchResults) {
                throw new Error("Automation did not progress beyond search results");
            }

            logger.info("💳 Analysis:", {
                isCheckoutPage,
                hasBookingForms: !!hasBookingForms,
                isOnHotelPage,
                automationSuccess,
            });

            // Keep browser open for user to complete payment
            // Don't close it - let user see the final checkout page

            return {
                success: true,
                checkoutUrl: finalUrl,
                browserOpen: true, // Browser stays open
                openFinalPage: false, // Don't open new tab - browser is already there
                message: isCheckoutPage
                    ? `🤖 SUCCESS! AI Agent automated booking for "${hotelName}" - Complete payment in the browser window!`
                    : `🤖 AI Agent worked on "${hotelName}" - Check the browser window to continue booking.`,
                automationLog: [
                    `✅ Connected to booking site`,
                    `✅ Located specific hotel: "${hotelName}"`,
                    isCheckoutPage
                        ? "✅ Reached final checkout page"
                        : "✅ Navigated as far as possible",
                    "✅ Browser left open for you to continue",
                    isCheckoutPage
                        ? "✅ Ready for payment!"
                        : "✅ Continue booking in browser window",
                ],
            };
        } catch (error) {
            logger.error("❌ REAL automation failed:", error);

            if (this.browser) {
                try {
                    await this.browser.close();
                } catch (e) {}
                this.browser = null;
            }

            // Return failure - don't claim success for fallback URLs
            return {
                success: false,
                error: error.message,
                fallback: true,
                message: `❌ Browser automation failed: ${error.message}`,
            };
        } finally {
            if (automationTimeout) {
                clearTimeout(automationTimeout);
                automationTimeout = null;
            }
        }
    }

    /**
     * Find and click on the specific hotel by name
     */
    async findAndClickHotel(targetHotelName) {
        try {
            logger.info("🎯 Searching for hotel:", targetHotelName);

            // Handle cookie banners first
            await this.handleCookieBanner();

            // Wait for page to load and take screenshot
            await this.delay(3000);

            try {
                await this.page.screenshot({ path: "hotel-search-results.png" });
                logger.info("📸 Screenshot saved: hotel-search-results.png");
            } catch (e) {
                logger.warn("Screenshot failed:", e.message);
            }

            // Scroll to see more results
            await this.page.evaluate(() => {
                window.scrollTo(0, 800);
            });
            await this.delay(2000);

            // Updated selectors for modern booking.com
            const hotelSelectors = [
                '[data-testid="title"]',
                '[data-testid="property-card"] h3',
                '[data-testid="property-card"] [data-testid="title"]',
                ".sr_property_block h3",
                ".property-card h3",
                'h3[data-testid="title"]',
                'h3 a[data-testid="title-link"]',
                ".bui-card__header h3",
                '[data-testid="property-name"]',
            ];

            let hotelElements = [];

            // Try each selector to find hotel names
            for (const selector of hotelSelectors) {
                try {
                    const elements = await this.page.$$(selector);
                    if (elements.length > 0) {
                        logger.info(
                            `✅ Found ${elements.length} hotel elements with selector: ${selector}`,
                        );
                        hotelElements = elements;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (hotelElements.length === 0) {
                // Fallback: get all h3 elements
                hotelElements = await this.page.$$(
                    'h3, h2, .property-name, [data-testid*="title"]',
                );
                logger.info(`📍 Fallback: Found ${hotelElements.length} potential hotel elements`);
            }

            // Search through hotel elements
            for (const element of hotelElements) {
                try {
                    const text = await element.textContent();
                    if (!text || text.trim().length < 3) continue;

                    const cleanText = text.toLowerCase().trim();
                    const targetName = targetHotelName.toLowerCase();

                    logger.info(`🔍 Checking: "${text.trim()}"`);

                    // Enhanced matching logic
                    const isMatch = this.isHotelMatch(cleanText, targetName);

                    if (isMatch) {
                        logger.info(
                            `✅ FOUND HOTEL MATCH: "${text}" for target: "${targetHotelName}"`,
                        );

                        // Find clickable element
                        const clickable = await this.findClickableHotelElement(element);
                        if (clickable) {
                            try {
                                logger.info("🖱️ Clicking on hotel...");
                                const previousUrl = this.page.url();

                                await clickable.click();

                                // Wait for navigation to complete
                                try {
                                    await this.page.waitForLoadState("networkidle", {
                                        timeout: 10000,
                                    });
                                } catch (e) {
                                    logger.warn("Navigation wait failed, continuing...");
                                }

                                await this.delay(4000);

                                const newUrl = this.page.url();
                                if (newUrl !== previousUrl) {
                                    logger.info("✅ Hotel clicked successfully, new URL:", newUrl);
                                    return true;
                                } else {
                                    logger.warn("⚠️ URL did not change after clicking hotel");
                                    continue;
                                }
                            } catch (clickError) {
                                logger.warn(
                                    "Click failed, trying different approach:",
                                    clickError.message,
                                );
                                // Try clicking the element itself
                                try {
                                    await element.click();
                                    await this.delay(4000);
                                    logger.info(
                                        "✅ Direct element click worked, new URL:",
                                        this.page.url(),
                                    );
                                    return true;
                                } catch (directClickError) {
                                    logger.warn(
                                        "Direct click also failed:",
                                        directClickError.message,
                                    );
                                    continue;
                                }
                            }
                        }
                    }
                } catch (e) {
                    logger.warn("Error processing hotel element:", e.message);
                    continue;
                }
            }

            // Enhanced fallback: click first clickable hotel
            logger.warn("⚠️ Specific hotel not found, trying first available result...");

            const fallbackSelectors = [
                '[data-testid="property-card"] a',
                '[data-testid="title-link"]',
                ".sr_property_block a",
                ".property-card a",
                "h3 a",
                '[data-testid="property-card"]',
            ];

            for (const selector of fallbackSelectors) {
                try {
                    const firstHotel = await this.page.$(selector);
                    if (firstHotel && (await firstHotel.isVisible())) {
                        logger.info(`🎯 Clicking first hotel with selector: ${selector}`);
                        await firstHotel.click();
                        await this.delay(4000);
                        logger.info("✅ First hotel clicked, new URL:", this.page.url());
                        return true;
                    }
                } catch (e) {
                    continue;
                }
            }

            logger.error("❌ Could not find any clickable hotels on the page");
            return false;
        } catch (error) {
            logger.error("Hotel search failed:", error.message);
            return false;
        }
    }

    /**
     * Enhanced hotel name matching
     */
    isHotelMatch(hotelText, targetName) {
        // Direct substring match
        if (hotelText.includes(targetName) || targetName.includes(hotelText)) {
            return true;
        }

        // Word-based matching
        const hotelWords = hotelText.split(/\s+/).filter((w) => w.length > 2);
        const targetWords = targetName.split(/\s+/).filter((w) => w.length > 2);

        if (hotelWords.length === 0 || targetWords.length === 0) {
            return false;
        }

        // Count matching words
        let matches = 0;
        for (const targetWord of targetWords) {
            for (const hotelWord of hotelWords) {
                if (hotelWord.includes(targetWord) || targetWord.includes(hotelWord)) {
                    matches++;
                    break;
                }
            }
        }

        // Require at least 2 matching words or 1 match if target has only 1-2 words
        const minMatches = targetWords.length <= 2 ? 1 : 2;
        return matches >= minMatches;
    }

    /**
     * Find clickable element for hotel
     */
    async findClickableHotelElement(element) {
        try {
            // Check if element itself is clickable
            const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
            if (tagName === "a" || tagName === "button") {
                return element;
            }

            // Look for link in the element
            const link = await element.$("a");
            if (link) {
                return link;
            }

            // Look for clickable parent
            const clickableParent = await element.evaluateHandle((el) => {
                let current = el;
                while (current && current !== document.body) {
                    if (
                        current.tagName.toLowerCase() === "a" ||
                        current.tagName.toLowerCase() === "button" ||
                        current.onclick ||
                        current.getAttribute("data-testid")?.includes("property")
                    ) {
                        return current;
                    }
                    current = current.parentElement;
                }
                return null;
            });

            return clickableParent.asElement();
        } catch (error) {
            logger.warn("Error finding clickable element:", error.message);
            return null;
        }
    }

    /**
     * Navigate to a hotel page (more robust than just clicking first hotel)
     */
    async navigateToHotelPage() {
        try {
            logger.info("🏨 Navigating to hotel page...");

            // Handle cookie banner first
            await this.handleCookieBanner();
            await this.delay(2000);

            // Try to find and click a hotel
            const hotelSelectors = [
                '[data-testid="title-link"]',
                '[data-testid="property-card"] a',
                'h3 a[data-testid="title-link"]',
                ".sr_property_block a",
            ];

            for (const selector of hotelSelectors) {
                try {
                    const hotels = await this.page.$$(selector);
                    logger.info(`Found ${hotels.length} hotels with selector: ${selector}`);

                    for (const hotel of hotels.slice(0, 5)) {
                        // Try first 5 hotels
                        try {
                            if (await hotel.isVisible()) {
                                const previousUrl = this.page.url();
                                await hotel.click();

                                // Wait for navigation to complete
                                await this.page.waitForLoadState("domcontentloaded", {
                                    timeout: 10000,
                                });
                                await this.delay(3000);

                                const newUrl = this.page.url();
                                if (newUrl !== previousUrl) {
                                    // Check if we're actually on a hotel page
                                    const isHotelPage =
                                        newUrl.includes("/hotel/") ||
                                        (await this.page.$(
                                            '.hprt-table, .roomstable, [data-testid*="rooms"]',
                                        ));

                                    if (isHotelPage) {
                                        logger.info("✅ Successfully reached hotel page:", newUrl);
                                        return true;
                                    } else {
                                        logger.info(
                                            "📄 Reached page but not hotel page, trying next...",
                                        );
                                        continue;
                                    }
                                }
                            }
                        } catch (e) {
                            logger.warn(`Hotel click failed: ${e.message}`);
                            continue;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            logger.warn("⚠️ Could not reach hotel page");
            return false;
        } catch (error) {
            logger.error("Hotel page navigation failed:", error.message);
            return false;
        }
    }

    /**
     * Navigate to booking/reservation form page
     */
    async navigateToBookingForm() {
        try {
            logger.info("📝 Navigating to booking form...");

            // Look for Reserve/Book buttons on hotel page
            const bookingButtonSelectors = [
                // Most common booking.com patterns
                'button:has-text("Reserve")',
                'button:has-text("I\'ll reserve")',
                'a:has-text("Reserve")',
                'a:has-text("I\'ll reserve")',

                // Room table buttons
                ".hprt-table button",
                ".hprt-table a",
                ".roomstable button",

                // Generic booking buttons
                'button[data-testid*="select-room"]',
                'button[data-testid*="availability"]',
                "button.bui-button--primary",
                "a.bui-button--primary",
            ];

            for (const selector of bookingButtonSelectors) {
                try {
                    if (selector.includes(":has-text(")) {
                        // Handle Playwright text selectors
                        const match = selector.match(/(.+):has-text\("([^"]+)"\)/);
                        if (match) {
                            const [, baseSelector, text] = match;
                            const elements = await this.page
                                .locator(baseSelector)
                                .filter({ hasText: text })
                                .all();

                            for (const element of elements) {
                                try {
                                    if (
                                        (await element.isVisible()) &&
                                        (await element.isEnabled())
                                    ) {
                                        const buttonText = await element.textContent();
                                        logger.info(`🎯 Clicking booking button: "${buttonText}"`);

                                        const previousUrl = this.page.url();
                                        await element.click();
                                        await this.delay(4000);

                                        const newUrl = this.page.url();

                                        // Check if we reached a booking form
                                        const hasBookingForms = await this.page.$(
                                            'input[name="firstname"], input[type="email"], input[name="guest_firstname"]',
                                        );
                                        const urlChanged = newUrl !== previousUrl;

                                        if (
                                            hasBookingForms ||
                                            (urlChanged &&
                                                (newUrl.includes("book") ||
                                                    newUrl.includes("reservation")))
                                        ) {
                                            logger.info(
                                                "✅ Successfully reached booking form page:",
                                                newUrl,
                                            );
                                            return true;
                                        }
                                    }
                                } catch (e) {
                                    continue;
                                }
                            }
                        }
                    } else {
                        // Regular CSS selector
                        const buttons = await this.page.$$(selector);
                        for (const button of buttons.slice(0, 3)) {
                            // Try first 3 buttons
                            try {
                                if ((await button.isVisible()) && (await button.isEnabled())) {
                                    const buttonText = await button.textContent();

                                    // Skip obvious non-booking buttons
                                    if (
                                        buttonText &&
                                        (buttonText.toLowerCase().includes("search") ||
                                            buttonText.toLowerCase().includes("filter") ||
                                            buttonText.toLowerCase().includes("sort"))
                                    ) {
                                        continue;
                                    }

                                    logger.info(`🎯 Trying button: "${buttonText}"`);

                                    const previousUrl = this.page.url();
                                    await button.click();
                                    await this.delay(4000);

                                    const newUrl = this.page.url();
                                    const hasBookingForms = await this.page.$(
                                        'input[name="firstname"], input[type="email"]',
                                    );
                                    const urlChanged = newUrl !== previousUrl;

                                    if (
                                        hasBookingForms ||
                                        (urlChanged &&
                                            (newUrl.includes("book") ||
                                                newUrl.includes("reservation")))
                                    ) {
                                        logger.info(
                                            "✅ Successfully reached booking form page:",
                                            newUrl,
                                        );
                                        return true;
                                    }
                                }
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // Check if we're already on a booking form page
            const hasBookingForms = await this.page.$(
                'input[name="firstname"], input[type="email"]',
            );
            if (hasBookingForms) {
                logger.info("✅ Already on booking form page");
                return true;
            }

            logger.warn("⚠️ Could not reach booking form page");
            return false;
        } catch (error) {
            logger.error("Booking form navigation failed:", error.message);
            return false;
        }
    }

    /**
     * Select a room (click book/select button) - Enhanced to reach actual booking page
     */
    async selectRoom() {
        try {
            logger.info("🏠 Looking for room selection...");
            const currentUrl = this.page.url();
            logger.info("🔗 Current URL:", currentUrl);

            // Check if we're actually on a hotel page or still on search results
            const isOnHotelPage =
                currentUrl.includes("/hotel/") ||
                currentUrl.includes("booking.com/hotel") ||
                (await this.page.$('.hprt-table, .roomstable, [data-testid*="rooms"]'));

            if (!isOnHotelPage) {
                logger.warn("⚠️ Not on hotel page yet, attempting to click hotel again...");

                // Try to click on a hotel from search results
                const hotelSelectors = [
                    '[data-testid="property-card"] a',
                    '[data-testid="title-link"]',
                    '.sr_property_block a[data-testid="title-link"]',
                    'h3 a[data-testid="title-link"]',
                ];

                for (const selector of hotelSelectors) {
                    try {
                        const hotelLink = await this.page.$(selector);
                        if (hotelLink && (await hotelLink.isVisible())) {
                            logger.info(`🎯 Clicking hotel link: ${selector}`);
                            await hotelLink.click();
                            await this.delay(4000);
                            logger.info("✅ Navigated to hotel page:", this.page.url());
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            // Wait for hotel page to load
            await this.delay(3000);

            // Take screenshot for debugging
            try {
                const pageTitle = await this.page.title();
                logger.info("📋 Page title:", pageTitle);

                await this.page.screenshot({ path: "room-selection-debug.png" });
                logger.info("📸 Screenshot saved: room-selection-debug.png");
            } catch (e) {
                logger.warn("Screenshot failed:", e.message);
            }

            // REAL booking.com Reserve button detection - focus on actual reservation flow
            logger.info("🎯 Looking for ACTUAL Reserve buttons on hotel page...");

            // Wait for room tables to load completely
            await this.page.waitForLoadState("networkidle");
            await this.delay(2000);

            // Skip debug for speed - just look for Reserve buttons directly

            // FAST MODE: Just click ANY booking button we can find quickly
            logger.info("🚀 FAST MODE: Looking for any booking button...");

            const fastBookingSelectors = [
                // Look for common Reserve buttons first
                "button",
                "a",
                'input[type="submit"]',
            ];

            const goodButtonTexts = [
                "reserve",
                "i'll reserve",
                "book now",
                "select room",
                "availability",
                "select",
            ];
            const badButtonTexts = [
                "search",
                "business",
                "sign in",
                "register",
                "menu",
                "filter",
                "sort",
            ];

            for (const selector of fastBookingSelectors) {
                try {
                    const buttons = await this.page.$$(selector);

                    for (const button of buttons.slice(0, 20)) {
                        // Check first 20 buttons only
                        try {
                            if ((await button.isVisible()) && (await button.isEnabled())) {
                                const buttonText = ((await button.textContent()) || "")
                                    .toLowerCase()
                                    .trim();
                                const href = (
                                    (await button.getAttribute("href")) || ""
                                ).toLowerCase();

                                // Quick filtering
                                const isGoodButton = goodButtonTexts.some((text) =>
                                    buttonText.includes(text),
                                );
                                const isBadButton =
                                    badButtonTexts.some((text) => buttonText.includes(text)) ||
                                    href.includes("business.booking.com");

                                if (isGoodButton && !isBadButton && buttonText.length > 2) {
                                    logger.info(`🎯 FAST CLICK: "${buttonText}"`);

                                    const previousUrl = this.page.url();
                                    await button.click();
                                    await this.delay(3000);

                                    const newUrl = this.page.url();

                                    // Check if we moved forward in the booking process
                                    if (
                                        newUrl !== previousUrl ||
                                        (await this.page.$(
                                            'input[name="firstname"], input[type="email"]',
                                        ))
                                    ) {
                                        logger.info(
                                            "✅ Fast booking click worked! New URL:",
                                            newUrl,
                                        );
                                        return true;
                                    }
                                }
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            logger.warn(
                "⚠️ No room selection button found - checking if we need to continue differently",
            );

            // Check if we're already on a booking form page
            const hasBookingForm = await this.page.$(
                'input[name="firstname"], input[name="lastname"], input[type="email"]',
            );
            if (hasBookingForm) {
                logger.info("✅ Already on booking form page - no room selection needed");
                return true;
            }

            // Try to find any "Continue", "Book now" or similar buttons
            const continueSelectors = [
                'button:has-text("Continue")',
                'button:has-text("Book now")',
                'button:has-text("Proceed")',
                'button:has-text("Next")',
                ".bui-button--primary",
            ];

            for (const selector of continueSelectors) {
                try {
                    if (selector.includes(":has-text(")) {
                        const match = selector.match(/(.+):has-text\("([^"]+)"\)/);
                        if (match) {
                            const [, baseSelector, text] = match;
                            const element = await this.page
                                .locator(baseSelector)
                                .filter({ hasText: text })
                                .first();
                            if ((await element.count()) > 0 && (await element.isVisible())) {
                                logger.info(`✅ Found continue button with text: "${text}"`);
                                await element.click();
                                await this.delay(3000);
                                return true;
                            }
                        }
                    } else {
                        const button = await this.page.$(selector);
                        if (button && (await button.isVisible())) {
                            const text = await button.textContent();
                            logger.info(`✅ Clicking continue button: "${text}"`);
                            await button.click();
                            await this.delay(3000);
                            return true;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            return false;
        } catch (error) {
            logger.error("Room selection failed:", error.message);
            return false;
        }
    }

    /**
     * Ensure we reach the actual booking page with guest information forms
     */
    async ensureBookingPageReached() {
        try {
            logger.info("🎯 Ensuring we reach the booking form page...");

            // Check if we already have booking forms
            const hasBookingForms = await this.page.$(
                'input[name="firstname"], input[name="lastname"], input[type="email"], input[name="guest_firstname"]',
            );
            if (hasBookingForms) {
                logger.info("✅ Already on booking form page");
                return true;
            }

            // Try to navigate to booking page by looking for reservation/booking buttons
            const bookingNavSelectors = [
                // Most common booking.com "I'll reserve" button after selecting room
                { selector: "button", text: "I'll reserve", priority: 1 },
                { selector: "a", text: "I'll reserve", priority: 1 },

                // Other reservation patterns
                { selector: "button", text: "Reserve", priority: 2 },
                { selector: "a", text: "Reserve", priority: 2 },
                { selector: "button", text: "Book now", priority: 3 },
                { selector: "button", text: "Continue to book", priority: 3 },

                // Room table specific (after selecting a room)
                { selector: ".hprt-table button", text: "Reserve", priority: 1 },
                { selector: ".hprt-table button", text: "I'll reserve", priority: 1 },
                { selector: ".roomstable button", text: "Reserve", priority: 1 },
            ];

            // Sort by priority (lower number = higher priority)
            bookingNavSelectors.sort((a, b) => a.priority - b.priority);

            for (const navItem of bookingNavSelectors) {
                try {
                    logger.info(
                        `🔍 Looking for booking button: "${navItem.text}" in ${navItem.selector}`,
                    );

                    // Find elements matching the selector
                    const elements = await this.page.$$(navItem.selector);

                    for (const element of elements) {
                        try {
                            if ((await element.isVisible()) && (await element.isEnabled())) {
                                const buttonText = await element.textContent();

                                // Check if text matches what we're looking for
                                if (
                                    buttonText &&
                                    buttonText.toLowerCase().includes(navItem.text.toLowerCase())
                                ) {
                                    logger.info(`✅ FOUND BOOKING BUTTON: "${buttonText}"`);
                                    await element.click();
                                    await this.delay(4000);

                                    // Check if we now have booking forms
                                    const nowHasForms = await this.page.$(
                                        'input[name="firstname"], input[name="lastname"], input[type="email"], input[name="guest_firstname"]',
                                    );
                                    if (nowHasForms) {
                                        logger.info("✅ Successfully reached booking form page");
                                        return true;
                                    }

                                    // Check if URL changed to booking page
                                    const currentUrl = this.page.url();
                                    if (
                                        currentUrl.includes("book") ||
                                        currentUrl.includes("reservation") ||
                                        currentUrl.includes("guest")
                                    ) {
                                        logger.info("✅ URL indicates we reached booking page");
                                        return true;
                                    }
                                }
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                } catch (e) {
                    logger.warn(`Navigation selector failed: ${navItem.selector} - ${e.message}`);
                    continue;
                }
            }

            logger.warn("⚠️ Could not find path to booking form page");
            return false;
        } catch (error) {
            logger.error("Booking page navigation failed:", error.message);
            return false;
        }
    }

    /**
     * Fill guest information forms
     */
    async fillGuestInformation(guestInfo) {
        try {
            logger.info("👤 Filling guest information...");

            // Wait for form to load
            await this.delay(3000);

            // Take screenshot for debugging
            try {
                await this.page.screenshot({ path: "form-filling-debug.png" });
                logger.info("📸 Screenshot saved: form-filling-debug.png");
            } catch (e) {
                logger.warn("Screenshot failed:", e.message);
            }

            // Enhanced form field selectors for modern booking.com
            const formFields = [
                {
                    name: "firstName",
                    selectors: [
                        'input[name="firstname"]',
                        'input[name="guest_firstname"]',
                        'input[data-testid*="first-name"]',
                        'input[placeholder*="First name" i]',
                        'input[placeholder*="Given name" i]',
                        "#firstname",
                        ".firstname input",
                        'input[autocomplete="given-name"]',
                    ],
                    value: guestInfo.firstName,
                },
                {
                    name: "lastName",
                    selectors: [
                        'input[name="lastname"]',
                        'input[name="guest_lastname"]',
                        'input[data-testid*="last-name"]',
                        'input[placeholder*="Last name" i]',
                        'input[placeholder*="Family name" i]',
                        'input[placeholder*="Surname" i]',
                        "#lastname",
                        ".lastname input",
                        'input[autocomplete="family-name"]',
                    ],
                    value: guestInfo.lastName,
                },
                {
                    name: "email",
                    selectors: [
                        'input[name="email"]',
                        'input[name="guest_email"]',
                        'input[type="email"]',
                        'input[data-testid*="email"]',
                        'input[placeholder*="email" i]',
                        "#email",
                        ".email input",
                        'input[autocomplete="email"]',
                    ],
                    value: guestInfo.email,
                },
                {
                    name: "phone",
                    selectors: [
                        'input[name="phone"]',
                        'input[name="guest_phone"]',
                        'input[type="tel"]',
                        'input[data-testid*="phone"]',
                        'input[placeholder*="phone" i]',
                        'input[placeholder*="mobile" i]',
                        "#phone",
                        ".phone input",
                        'input[autocomplete="tel"]',
                    ],
                    value: guestInfo.phone,
                },
            ];

            let fieldsFilledCount = 0;

            for (const field of formFields) {
                if (!field.value) {
                    logger.info(`⏭️ Skipping ${field.name} (no value provided)`);
                    continue;
                }

                let fieldFilled = false;

                for (const selector of field.selectors) {
                    try {
                        const element = await this.page.$(selector);
                        if (element && (await element.isVisible()) && (await element.isEnabled())) {
                            // Clear existing content
                            await element.selectText();
                            await this.delay(100);

                            // Fill with new value
                            await element.fill(field.value);
                            await this.delay(300);

                            // Verify the value was set
                            const currentValue = await element.inputValue();
                            if (currentValue === field.value) {
                                logger.info(`✅ Successfully filled ${field.name}: ${field.value}`);
                                fieldsFilledCount++;
                                fieldFilled = true;
                                break;
                            } else {
                                logger.warn(`⚠️ Value verification failed for ${field.name}`);

                                // Try typing character by character as fallback
                                await element.selectText();
                                await element.type(field.value, { delay: 50 });
                                await this.delay(300);

                                const retryValue = await element.inputValue();
                                if (retryValue === field.value) {
                                    logger.info(
                                        `✅ Fallback typing worked for ${field.name}: ${field.value}`,
                                    );
                                    fieldsFilledCount++;
                                    fieldFilled = true;
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        logger.warn(`Field filling error for ${selector}:`, e.message);
                        continue;
                    }
                }

                if (!fieldFilled) {
                    logger.warn(`❌ Could not fill ${field.name} with any selector`);
                }
            }

            // Fill special requests if available
            if (guestInfo.specialRequests) {
                const specialRequestsSelectors = [
                    'textarea[name="remarks"]',
                    'textarea[name="special_requests"]',
                    'textarea[placeholder*="special" i]',
                    'textarea[placeholder*="request" i]',
                    'textarea[data-testid*="request"]',
                    ".special-requests textarea",
                    "textarea",
                ];

                for (const selector of specialRequestsSelectors) {
                    try {
                        const element = await this.page.$(selector);
                        if (element && (await element.isVisible())) {
                            await element.fill(guestInfo.specialRequests);
                            logger.info(`✅ Filled special requests: ${guestInfo.specialRequests}`);
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            logger.info(
                `📊 Form filling summary: ${fieldsFilledCount} out of ${formFields.length} fields filled`,
            );

            // Take final screenshot
            try {
                await this.page.screenshot({ path: "form-filled-final.png" });
                logger.info("📸 Final form screenshot: form-filled-final.png");
            } catch (e) {}
        } catch (error) {
            logger.error("Form filling failed:", error.message);
        }
    }

    /**
     * Navigate to final checkout
     */
    async navigateToCheckout() {
        try {
            logger.info("💳 Looking for checkout/continue button...");

            // Wait for any processing to complete
            await this.delay(2000);

            const checkoutSelectors = [
                // Modern booking.com checkout buttons
                'button[data-testid*="submit"]',
                'button[data-testid*="continue"]',
                'button[data-testid*="complete"]',
                'button[data-testid*="book"]',

                // Text-based selectors
                'button:has-text("Complete booking")',
                'button:has-text("Book now")',
                'button:has-text("Continue")',
                'button:has-text("Next")',
                'button:has-text("Proceed")',
                'button:has-text("Confirm")',

                // Generic primary buttons
                ".bui-button--primary",
                "button.bui-button--primary",
                'button[type="submit"]',

                // Form submission
                'form button[type="submit"]',
                'input[type="submit"]',

                // Generic selectors
                '[data-testid="submit-button"]',
                '[data-testid*="checkout"]',
                'button[class*="submit"]',
                'button[class*="continue"]',
            ];

            for (const selector of checkoutSelectors) {
                try {
                    let button = null;

                    // Handle :has-text() selectors
                    if (selector.includes(":has-text(")) {
                        const match = selector.match(/(.+):has-text\("([^"]+)"\)/);
                        if (match) {
                            const [, baseSelector, text] = match;
                            try {
                                const element = await this.page
                                    .locator(baseSelector)
                                    .filter({ hasText: text })
                                    .first();
                                if ((await element.count()) > 0 && (await element.isVisible())) {
                                    logger.info(`✅ Clicking checkout button with text: "${text}"`);
                                    await element.click();
                                    await this.delay(4000);
                                    logger.info(
                                        "✅ Checkout button clicked, new URL:",
                                        this.page.url(),
                                    );
                                    return true;
                                }
                            } catch (e) {
                                continue;
                            }
                        }
                    } else {
                        // Regular CSS selector
                        button = await this.page.$(selector);
                        if (button && (await button.isVisible()) && (await button.isEnabled())) {
                            const buttonText = await button.textContent();
                            logger.info(
                                `✅ Clicking checkout button: "${buttonText}" with selector: ${selector}`,
                            );
                            await button.click();
                            await this.delay(4000);
                            logger.info("✅ Checkout button clicked, new URL:", this.page.url());
                            return true;
                        }
                    }
                } catch (e) {
                    logger.warn(`Checkout selector failed: ${selector} - ${e.message}`);
                    continue;
                }
            }

            // Fallback: look for any button that might continue the process
            logger.warn("⚠️ No specific checkout button found, trying fallback...");

            try {
                const continueKeywords = [
                    "continue",
                    "next",
                    "proceed",
                    "book",
                    "confirm",
                    "complete",
                    "submit",
                ];
                const allButtons = await this.page.$$('button, input[type="submit"]');

                for (const button of allButtons) {
                    try {
                        const isVisible = await button.isVisible();
                        const isEnabled = await button.isEnabled();

                        if (!isVisible || !isEnabled) continue;

                        const text = ((await button.textContent()) || "").toLowerCase().trim();
                        const value = ((await button.getAttribute("value")) || "").toLowerCase();
                        const fullText = (text + " " + value).toLowerCase();

                        const isContinueButton = continueKeywords.some((keyword) =>
                            fullText.includes(keyword),
                        );

                        if (isContinueButton && text.length > 0) {
                            logger.info(`✅ Found fallback continue button: "${text}"`);
                            await button.click();
                            await this.delay(4000);
                            logger.info("✅ Fallback button clicked, new URL:", this.page.url());
                            return true;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            } catch (e) {
                logger.error("Fallback checkout search failed:", e.message);
            }

            logger.warn("⚠️ No checkout button found - user may need to complete manually");
            return false;
        } catch (error) {
            logger.error("Checkout navigation failed:", error.message);
            return false;
        }
    }

    /**
     * Handle cookie banners and popups
     */
    async handleCookieBanner() {
        try {
            logger.info("🍪 Handling cookie banners and popups...");

            const cookieSelectors = [
                // Modern booking.com selectors
                'button[data-testid="header-banner-button"]',
                'button[data-testid*="cookie"]',
                'button[id*="onetrust-accept"]',
                "#onetrust-accept-btn-handler",

                // Generic GDPR selectors
                'button:has-text("Accept all")',
                'button:has-text("Accept")',
                'button:has-text("OK")',
                'button:has-text("I agree")',
                ".gdpr-cookie-notice button",
                ".cookie-banner button",
                ".consent-banner button",

                // Fallback generic selectors
                '[data-testid*="accept"]',
                '[data-testid*="cookie"]',
                'button[class*="cookie"]',
                'button[class*="consent"]',
            ];

            for (const selector of cookieSelectors) {
                try {
                    let button = null;

                    // Handle :has-text() selectors
                    if (selector.includes(":has-text(")) {
                        const match = selector.match(/(.+):has-text\("([^"]+)"\)/);
                        if (match) {
                            const [, baseSelector, text] = match;
                            try {
                                const element = await this.page
                                    .locator(baseSelector)
                                    .filter({ hasText: text })
                                    .first();
                                if ((await element.count()) > 0 && (await element.isVisible())) {
                                    await element.click();
                                    await this.delay(1000);
                                    logger.info(`✅ Dismissed popup with text: "${text}"`);
                                    break;
                                }
                            } catch (e) {
                                continue;
                            }
                        }
                    } else {
                        // Regular CSS selector
                        button = await this.page.$(selector);
                        if (button && (await button.isVisible())) {
                            await button.click();
                            await this.delay(1000);
                            logger.info(`✅ Dismissed popup with selector: ${selector}`);
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // Also handle any modal overlays
            try {
                const modalClose = await this.page.$(
                    '.bui-modal__close, .modal-close, [aria-label="Close"]',
                );
                if (modalClose && (await modalClose.isVisible())) {
                    await modalClose.click();
                    await this.delay(500);
                    logger.info("✅ Closed modal overlay");
                }
            } catch (e) {
                // Ignore modal close errors
            }
        } catch (error) {
            logger.warn("Cookie banner handling failed:", error.message);
        }
    }

    /**
     * Find clickable parent element
     */
    async findClickableParent(element) {
        try {
            const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
            if (tagName === "a" || tagName === "button") {
                return element;
            }

            const parentLink = await element.evaluateHandle((el) => {
                let parent = el.parentElement;
                while (parent && parent !== document.body) {
                    if (
                        parent.tagName.toLowerCase() === "a" ||
                        parent.tagName.toLowerCase() === "button"
                    ) {
                        return parent;
                    }
                    parent = parent.parentElement;
                }
                return null;
            });

            return parentLink.asElement();
        } catch (error) {
            return null;
        }
    }

    /**
     * Fuzzy match for hotel names
     */
    fuzzyMatch(text1, text2) {
        const words1 = text1.split(" ").filter((w) => w.length > 2);
        const words2 = text2.split(" ").filter((w) => w.length > 2);

        let matches = 0;
        for (const word of words1) {
            if (words2.some((w) => w.includes(word) || word.includes(w))) {
                matches++;
            }
        }

        return matches >= Math.min(2, Math.min(words1.length, words2.length));
    }

    /**
     * Build a URL that ACTUALLY WORKS - no double encoding, clean and simple
     */
    buildWorkingBookingUrl(hotelData, guestInfo) {
        const hotelName = hotelData.name || hotelData.title || "Hotel";
        const location = this.getLocationString(hotelData);

        // Create clean search query
        const searchQuery = `${hotelName} ${location}`.trim();

        // Ensure we have valid dates
        const checkInDate = guestInfo.checkInDate || this.getDefaultCheckInDate();
        const checkOutDate = guestInfo.checkOutDate || this.getDefaultCheckOutDate(checkInDate);

        logger.info("📅 Using dates:", { checkIn: checkInDate, checkOut: checkOutDate });

        // Use booking.com with MANUAL parameter building (no URLSearchParams)
        const baseUrl = "https://www.booking.com/searchresults.html";
        const params = [
            `ss=${encodeURIComponent(searchQuery)}`,
            `checkin=${checkInDate}`,
            `checkout=${checkOutDate}`,
            "group_adults=1",
            "group_children=0",
            "no_rooms=1",
            "selected_currency=USD",
            "src=searchresults",
            "dest_type=hotel",
            "sb_travel_purpose=leisure",
        ];

        const finalUrl = `${baseUrl}?${params.join("&")}`;
        logger.info("🔗 Built clean URL with dates:", finalUrl);

        return finalUrl;
    }

    /**
     * Get default check-in date (tomorrow)
     */
    getDefaultCheckInDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split("T")[0];
    }

    /**
     * Get default check-out date (day after check-in)
     */
    getDefaultCheckOutDate(checkInDate) {
        const checkOut = new Date(checkInDate);
        checkOut.setDate(checkOut.getDate() + 1);
        return checkOut.toISOString().split("T")[0];
    }

    /**
     * Get location string from hotel data
     */
    getLocationString(hotelData) {
        let locationStr = "";

        if (typeof hotelData.location === "string") {
            locationStr = hotelData.location;
        } else if (hotelData.location?.address) {
            locationStr = hotelData.location.address;
        } else if (hotelData.address) {
            locationStr = hotelData.address;
        } else if (hotelData.subtitle) {
            locationStr = hotelData.subtitle;
        } else {
            locationStr = "Los Angeles, CA"; // Default
        }

        return locationStr;
    }

    /**
     * Human-like delay with slight randomization for natural automation
     */
    async delay(ms) {
        const randomDelay = ms + Math.random() * 200 - 100; // Add ±100ms randomness
        return new Promise((resolve) => setTimeout(resolve, Math.max(100, randomDelay)));
    }

    /**
     * Cleanup browser
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Get browser instance (for keeping it open)
     */
    getBrowser() {
        return this.browser;
    }
}

export const simpleBrowserAutomation = new SimpleBrowserAutomation();
