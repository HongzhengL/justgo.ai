/**
 * Form Auto-Fill Utility for Booking Sites
 * This creates a script that can automatically fill booking forms
 */

export const createBookingAutoFillScript = (guestInfo, bookingDetails) => {
    const autoFillScript = `
    (function() {
        console.log('🤖 AI Travel Assistant: Auto-filling booking form...');

        const guestInfo = ${JSON.stringify(guestInfo)};
        const bookingDetails = ${JSON.stringify(bookingDetails)};

        // Function to fill input by various selectors
        function fillInput(selectors, value) {
            if (!value) return false;

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && (element.type !== 'hidden') && !element.value) {
                        element.value = value;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        element.dispatchEvent(new Event('blur', { bubbles: true }));
                        console.log('✅ Filled:', selector, 'with:', value);
                        return true;
                    }
                }
            }
            return false;
        }

        // Function to select option in dropdown
        function selectOption(selectors, value) {
            if (!value) return false;

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && element.tagName === 'SELECT') {
                        for (let option of element.options) {
                            if (option.text.toLowerCase().includes(value.toLowerCase()) ||
                                option.value.toLowerCase().includes(value.toLowerCase())) {
                                element.value = option.value;
                                element.dispatchEvent(new Event('change', { bubbles: true }));
                                console.log('✅ Selected:', selector, 'with:', option.text);
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
        }

        // Wait for page to be ready
        function waitForElements(callback) {
            if (document.readyState === 'complete') {
                setTimeout(callback, 1000); // Give forms time to load
            } else {
                window.addEventListener('load', () => {
                    setTimeout(callback, 1000);
                });
            }
        }

        // Main auto-fill function
        function performAutoFill() {
            console.log('🚀 Starting form auto-fill process...');

            let fieldsProcessed = 0;

            // Fill first name
            if (fillInput([
                'input[name*="first"]', 'input[name*="First"]', 'input[name*="fname"]',
                'input[id*="first"]', 'input[id*="First"]', 'input[id*="fname"]',
                'input[placeholder*="First"]', 'input[placeholder*="first"]',
                '.firstname input', '.first-name input', '.guest-first-name input'
            ], guestInfo.firstName)) {
                fieldsProcessed++;
            }

            // Fill last name
            if (fillInput([
                'input[name*="last"]', 'input[name*="Last"]', 'input[name*="lname"]',
                'input[id*="last"]', 'input[id*="Last"]', 'input[id*="lname"]',
                'input[placeholder*="Last"]', 'input[placeholder*="last"]',
                '.lastname input', '.last-name input', '.guest-last-name input'
            ], guestInfo.lastName)) {
                fieldsProcessed++;
            }

            // Fill email
            if (fillInput([
                'input[type="email"]', 'input[name*="email"]', 'input[name*="Email"]',
                'input[id*="email"]', 'input[id*="Email"]',
                'input[placeholder*="email"]', 'input[placeholder*="Email"]',
                '.email input', '.guest-email input'
            ], guestInfo.email)) {
                fieldsProcessed++;
            }

            // Fill phone
            if (fillInput([
                'input[type="tel"]', 'input[name*="phone"]', 'input[name*="Phone"]',
                'input[name*="mobile"]', 'input[name*="tel"]',
                'input[id*="phone"]', 'input[id*="Phone"]', 'input[id*="mobile"]',
                'input[placeholder*="phone"]', 'input[placeholder*="Phone"]',
                '.phone input', '.guest-phone input', '.mobile input'
            ], guestInfo.phone)) {
                fieldsProcessed++;
            }

            // Fill address if available
            if (guestInfo.address && fillInput([
                'input[name*="address"]', 'input[name*="Address"]', 'input[name*="street"]',
                'input[id*="address"]', 'input[id*="Address"]', 'input[id*="street"]',
                'textarea[name*="address"]', 'textarea[id*="address"]',
                '.address input', '.street input'
            ], guestInfo.address)) {
                fieldsProcessed++;
            }

            // Fill special requests if available
            if (guestInfo.specialRequests && fillInput([
                'textarea[name*="comment"]', 'textarea[name*="request"]', 'textarea[name*="special"]',
                'textarea[id*="comment"]', 'textarea[id*="request"]', 'textarea[id*="special"]',
                'textarea[placeholder*="request"]', 'textarea[placeholder*="comment"]',
                '.special-requests textarea', '.comments textarea'
            ], guestInfo.specialRequests)) {
                fieldsProcessed++;
            }

            // Show completion message
            if (fieldsProcessed > 0) {
                // Create success notification
                const notification = document.createElement('div');
                notification.innerHTML = \`
                    <div style="
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #28a745;
                        color: white;
                        padding: 15px 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                        z-index: 10000;
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        max-width: 300px;
                    ">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">🎉</span>
                            <div>
                                <strong>Auto-Fill Complete!</strong><br>
                                <small>Filled \${fieldsProcessed} field(s) successfully</small>
                            </div>
                        </div>
                    </div>
                \`;
                document.body.appendChild(notification);

                // Remove notification after 5 seconds
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 5000);

                console.log(\`🎉 Auto-fill completed! Processed \${fieldsProcessed} fields.\`);
            } else {
                console.log('⚠️ No fillable fields found on this page');
            }
        }

        // Execute auto-fill when page is ready
        waitForElements(performAutoFill);

        // Also try again after additional delay for dynamic content
        setTimeout(performAutoFill, 3000);

    })();
    `;

    return autoFillScript;
};

export const createAutoFillBookmarklet = (guestInfo, bookingDetails) => {
    const script = createBookingAutoFillScript(guestInfo, bookingDetails);
    const minifiedScript = script.replace(/\s+/g, " ").replace(/\/\*.*?\*\//g, "");
    return `javascript:${encodeURIComponent(minifiedScript)}`;
};

export const generateAutoFillInstructions = (guestInfo, bookingDetails) => {
    const bookmarklet = createAutoFillBookmarklet(guestInfo, bookingDetails);

    return {
        bookmarklet,
        instructions: [
            "1. Copy the bookmarklet code below",
            "2. Create a new bookmark in your browser",
            "3. Set the name to 'AI Auto-Fill'",
            "4. Paste the code as the URL",
            "5. Go to the booking page",
            "6. Click the 'AI Auto-Fill' bookmark to fill the form automatically",
        ],
        quickMethod: {
            description:
                "Quick Method: Click the button below to automatically open booking.com with the auto-fill script ready",
            action: "open_with_script",
        },
    };
};
