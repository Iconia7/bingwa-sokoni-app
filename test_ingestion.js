// Mocking the ingestion check
const mockPlanArray = [
    { id: '1', planName: 'Test Plan', amount: 10, ussdCodeTemplate: '*100#' }
];

const stringifiedPayload = JSON.stringify(mockPlanArray);

function processIngestedData(data) {
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        console.log("✅ Parsed successfully:", Array.isArray(parsed));
        return parsed;
    } catch (err) {
        console.error("❌ Failed:", err.message);
        return null;
    }
}

console.log("--- Testing with raw array ---");
processIngestedData(mockPlanArray);

console.log("\n--- Testing with stringified JSON ---");
processIngestedData(stringifiedPayload);
