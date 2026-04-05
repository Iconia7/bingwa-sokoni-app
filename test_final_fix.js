// Verification of the new Schema structure and Array enforcement
const mockSingleObject = { id: '1', planName: 'Single Offer', amount: 10, ussdCode: '*100#' };
const mockStringifiedArray = '[{"id":"2","planName":"Array Offer","amount":20,"ussdCode":"*200#"}]';

function processInput(input) {
    try {
        let parsed = typeof input === 'string' ? JSON.parse(input) : input;
        if (parsed && !Array.isArray(parsed)) {
            parsed = [parsed];
        }
        console.log("✅ Result is Array:", Array.isArray(parsed));
        console.log("✅ First element Name:", parsed[0].planName);
        return parsed;
    } catch (err) {
        console.error("❌ Failed:", err.message);
    }
}

console.log("--- Testing Single Object Conversion ---");
processInput(mockSingleObject);

console.log("\n--- Testing Stringified Array Parsing ---");
processInput(mockStringifiedArray);
