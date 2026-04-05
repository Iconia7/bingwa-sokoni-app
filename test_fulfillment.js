// Mocking the scenario of a successful storefront payment confirmation
const mockPendingPayment = {
    userId: '254115332870', // Seller
    packageId: '1',
    amount: 80, // Discounted from 99
    targetPhoneNumber: '254712345678', // Customer
    status: 'pending'
};

const mockUser = {
    userId: '254115332870',
    selectedOffers: [
        { id: '1', planName: '1GB, 24hrs', amount: 99, ussdCodeTemplate: '*544*1*1#', isMultiSession: false, sessionSteps: [] }
    ],
    remoteCommands: []
};

// Simulation of handleMpesaCallback logic for storefront
function fulfillPayment(pendingPayment, user) {
    // 1. Find the original plan from the seller's catalog
    const originalPlan = (user.selectedOffers || []).find(p => p.id === pendingPayment.packageId);

    if (originalPlan) {
        console.log(`🚀 SIMULATED Storefront Automation: Queuing PURCHASE_OFFER for [${originalPlan.planName}] to ${pendingPayment.targetPhoneNumber}`);
        
        user.remoteCommands.push({
            type: 'PURCHASE_OFFER',
            payload: {
                offerId: originalPlan.id,
                planName: originalPlan.planName,
                amount: originalPlan.amount,
                ussdCode: originalPlan.ussdCodeTemplate,
                targetPhoneNumber: pendingPayment.targetPhoneNumber,
                isMultiSession: originalPlan.isMultiSession,
                sessionSteps: originalPlan.sessionSteps,
                source: 'automated_storefront_purchase'
            },
            status: 'PENDING'
        });
        return true;
    }
    return false;
}

if (fulfillPayment(mockPendingPayment, mockUser)) {
    console.log("✅ Verification Successful: Remote command queued correctly.");
    console.log("Payload Check:", JSON.stringify(mockUser.remoteCommands[0].payload, null, 2));
} else {
    console.log("❌ Verification Failed.");
}
