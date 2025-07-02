/**
 * Compliance Report Generator
 * Generates detailed validation reports comparing actual vs expected StandardizedCard structure
 */

import { validateStandardizedCard, STANDARDIZED_CARD_SCHEMA } from "./cardValidator.js";
import { runAllCardTypeTests } from "./cardTypeTests.js";

/**
 * Generate Comprehensive Compliance Report
 */
export function generateComplianceReport() {
    console.log("\n📋 GENERATING STANDARDIZED CARD COMPLIANCE REPORT");
    console.log("==================================================");

    const report = {
        timestamp: new Date().toISOString(),
        schemaReference: STANDARDIZED_CARD_SCHEMA,
        cardTypeTests: null,
        overallCompliance: null,
        recommendations: [],
        summary: null,
    };

    try {
        // Run all card type tests
        const cardTypeResults = runAllCardTypeTests();
        report.cardTypeTests = cardTypeResults;

        // Calculate overall compliance
        const compliance = calculateOverallCompliance(cardTypeResults);
        report.overallCompliance = compliance;

        // Generate recommendations
        const recommendations = generateRecommendations(cardTypeResults, compliance);
        report.recommendations = recommendations;

        // Create summary
        const summary = createSummary(cardTypeResults, compliance);
        report.summary = summary;

        // Log results
        console.log("\n📊 COMPLIANCE REPORT SUMMARY");
        console.log("==============================");
        console.log("Overall Compliance Rate:", `${compliance.overallRate}%`);
        console.log("Card Types Passed:", `${compliance.passedTypes}/${compliance.totalTypes}`);
        console.log("Total Cards Tested:", compliance.totalCards);
        console.log("Valid Cards:", compliance.validCards);
        console.log("Critical Errors:", compliance.criticalErrors);
        console.log("Status:", compliance.status);

        console.log("\n🎯 RECOMMENDATIONS");
        console.log("====================");
        recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });

        return report;
    } catch (error) {
        console.error("❌ Compliance report generation failed:", error);
        report.error = error.message;
        return report;
    }
}

/**
 * Calculate Overall Compliance Metrics
 */
function calculateOverallCompliance(cardTypeResults) {
    const { results, overallSummary } = cardTypeResults;

    const compliance = {
        totalTypes: Object.keys(results).length,
        passedTypes: Object.values(results).filter((r) => r.summary.passed).length,
        totalCards: overallSummary.totalCards,
        validCards: overallSummary.validCards,
        criticalErrors: overallSummary.criticalErrors,
        warnings: overallSummary.warnings,
        overallRate:
            overallSummary.totalCards > 0
                ? Math.round((overallSummary.validCards / overallSummary.totalCards) * 100)
                : 0,
        typeCompliance: {},
    };

    // Calculate per-type compliance
    Object.entries(results).forEach(([type, result]) => {
        compliance.typeCompliance[type] = {
            passed: result.summary.passed,
            complianceRate: result.summary.complianceRate,
            issues: result.summary.criticalErrors + result.summary.warnings,
        };
    });

    // Determine overall status
    if (compliance.overallRate === 100 && compliance.criticalErrors === 0) {
        compliance.status = "✅ FULLY_COMPLIANT";
    } else if (compliance.overallRate >= 80 && compliance.criticalErrors === 0) {
        compliance.status = "⚠️  MOSTLY_COMPLIANT";
    } else if (compliance.criticalErrors > 0) {
        compliance.status = "❌ NON_COMPLIANT_CRITICAL";
    } else {
        compliance.status = "⚠️  NON_COMPLIANT_WARNINGS";
    }

    return compliance;
}

/**
 * Generate Specific Recommendations
 */
function generateRecommendations(cardTypeResults, compliance) {
    const recommendations = [];

    // Overall recommendations
    if (compliance.criticalErrors > 0) {
        recommendations.push(
            "🚨 CRITICAL: Fix missing required fields and invalid data types before production",
        );
    }

    if (compliance.warnings > 0) {
        recommendations.push(
            "⚠️  WARNING: Address validation warnings to improve schema compliance",
        );
    }

    if (compliance.overallRate < 100) {
        recommendations.push(
            `📊 COMPLIANCE: Current rate is ${compliance.overallRate}% - target 100% for production readiness`,
        );
    }

    // Type-specific recommendations
    Object.entries(cardTypeResults.results).forEach(([type, result]) => {
        if (!result.summary.passed) {
            recommendations.push(
                `🔧 ${type.toUpperCase()}: ${result.getRecommendations().join("; ")}`,
            );
        }
    });

    // Schema-specific recommendations
    if (compliance.overallRate === 100 && compliance.criticalErrors === 0) {
        recommendations.push(
            "🎉 EXCELLENT: All card types are fully compliant with TODO.md specifications",
        );
        recommendations.push(
            "✅ READY: API module is production-ready for EPIC 2 AI Agent integration",
        );
    }

    return recommendations;
}

/**
 * Create Summary Section
 */
function createSummary(cardTypeResults, compliance) {
    const summary = {
        testDate: new Date().toISOString(),
        overallStatus: compliance.status,
        complianceMetrics: {
            overallRate: `${compliance.overallRate}%`,
            cardTypesPassed: `${compliance.passedTypes}/${compliance.totalTypes}`,
            totalCardsValidated: compliance.totalCards,
            validCardsCount: compliance.validCards,
            issuesFound: {
                critical: compliance.criticalErrors,
                warnings: compliance.warnings,
            },
        },
        cardTypeDetails: {},
        nextSteps: getNextSteps(compliance),
    };

    // Add card type details
    Object.entries(cardTypeResults.results).forEach(([type, result]) => {
        summary.cardTypeDetails[type] = {
            status: result.summary.passed ? "✅ PASSED" : "❌ FAILED",
            complianceRate: `${result.summary.complianceRate}%`,
            cardsValidated: result.summary.totalCards,
            issues: {
                critical: result.summary.criticalErrors,
                warnings: result.summary.warnings,
            },
            sourceAPI: result.sourceAPI,
        };
    });

    return summary;
}

/**
 * Get Next Steps Based on Compliance
 */
function getNextSteps(compliance) {
    const steps = [];

    if (compliance.criticalErrors > 0) {
        steps.push("1. Fix all critical validation errors before proceeding");
        steps.push("2. Re-run validation tests to confirm fixes");
        steps.push("3. Address remaining warnings for optimal compliance");
    } else if (compliance.warnings > 0) {
        steps.push("1. Review and address validation warnings");
        steps.push("2. Consider updating translation logic for better compliance");
        steps.push("3. Re-test to achieve 100% compliance rate");
    } else if (compliance.overallRate < 100) {
        steps.push("1. Investigate why some cards are not validating");
        steps.push("2. Update translation functions to ensure full compliance");
        steps.push("3. Verify all edge cases are handled correctly");
    } else {
        steps.push("1. ✅ All validations passed - proceed to error handling tests");
        steps.push("2. ✅ Begin EPIC 1 testing items 7-9 (error scenarios)");
        steps.push("3. ✅ Prepare for production deployment");
    }

    return steps;
}

/**
 * Export Compliance Report to JSON
 */
export function exportComplianceReport(report, filename = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const defaultFilename = `compliance-report-${timestamp}.json`;
    const finalFilename = filename || defaultFilename;

    try {
        const reportJSON = JSON.stringify(report, null, 2);
        console.log(`\n📄 COMPLIANCE REPORT EXPORT`);
        console.log(`Filename: ${finalFilename}`);
        console.log(`Size: ${(reportJSON.length / 1024).toFixed(2)} KB`);
        console.log("Report ready for export");

        return {
            success: true,
            filename: finalFilename,
            content: reportJSON,
            size: reportJSON.length,
        };
    } catch (error) {
        console.error("❌ Failed to export compliance report:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Quick Compliance Check
 */
export function quickComplianceCheck() {
    console.log("\n⚡ QUICK COMPLIANCE CHECK");
    console.log("=========================");

    try {
        const cardTypeResults = runAllCardTypeTests();
        const compliance = calculateOverallCompliance(cardTypeResults);

        const quickSummary = {
            status: compliance.status,
            overallRate: `${compliance.overallRate}%`,
            readyForProduction: compliance.overallRate === 100 && compliance.criticalErrors === 0,
            issues: {
                critical: compliance.criticalErrors,
                warnings: compliance.warnings,
            },
            timestamp: new Date().toISOString(),
        };

        console.log("Quick Summary:", quickSummary);

        return {
            success: quickSummary.readyForProduction,
            summary: quickSummary,
            fullReport: null, // Not generated for quick check
        };
    } catch (error) {
        console.error("❌ Quick compliance check failed:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

export default {
    generateComplianceReport,
    exportComplianceReport,
    quickComplianceCheck,
    calculateOverallCompliance,
    generateRecommendations,
};
