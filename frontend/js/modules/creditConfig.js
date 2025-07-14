// Credit cost configuration from backend
let creditCosts = {
    audio_upload: 2,
    txt_upload: 3,
    docx_processing: 5,
    premium_export: 15
};

let initialized = false;

export async function initializeCreditCosts() {
    try {
        console.log('💎 Initializing credit costs from backend...');
        const response = await fetch('/api/auth/config');
        const data = await response.json();
        
        if (data.success && data.config && data.config.credit_costs) {
            creditCosts = data.config.credit_costs;
            initialized = true;
            console.log('💎 Credit costs loaded from backend:', creditCosts);
        } else {
            console.warn('💎 No credit costs in config response, using defaults');
        }
    } catch (error) {
        console.warn('💎 Failed to load credit costs, using defaults:', error);
    }
    
    return creditCosts;
}

export function getCreditCost(action) {
    if (!initialized) {
        console.warn('💎 Credit costs not initialized yet, using default for:', action);
    }
    return creditCosts[action] || 0;
}

export function getAllCreditCosts() {
    return { ...creditCosts };
}

export function isInitialized() {
    return initialized;
}