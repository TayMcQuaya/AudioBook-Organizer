// Contact Page - Main JavaScript File
// Follows PAGE_LIFECYCLE_GUIDE.md patterns

// Handle navigation clicks
function handleNavigationClick(event) {
    const target = event.target.closest('[data-action="navigate"]');
    if (!target) return;
    
    event.preventDefault();
    const route = target.dataset.route;
    
    if (window.router) {
        window.router.navigate(route);
    } else {
        // Fallback to direct navigation if router not available
        window.location.href = route;
    }
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('#submitButton');
    const btnText = submitButton.querySelector('.btn-text');
    const btnLoading = submitButton.querySelector('.btn-loading');
    const formMessage = document.getElementById('formMessage');
    
    // Get form data
    const formData = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        subject: form.subject.value,
        message: form.message.value.trim()
    };
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
        showFormMessage('Please fill in all fields.', 'error');
        return;
    }
    
    // Show loading state
    submitButton.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    
    try {
        // Note: This is a placeholder. In production, you would:
        // 1. Create a backend endpoint at /api/contact
        // 2. Send the form data to that endpoint
        // 3. The backend would send the email
        
        // For now, simulate a submission
        await simulateFormSubmission(formData);
        
        // Show success message
        showFormMessage('Thank you for your message! We\'ll get back to you soon.', 'success');
        
        // Reset form
        form.reset();
        
    } catch (error) {
        console.error('Form submission error:', error);
        showFormMessage('Sorry, there was an error sending your message. Please try again later.', 'error');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// Simulate form submission (placeholder for actual backend call)
function simulateFormSubmission(formData) {
    return new Promise((resolve, reject) => {
        // Log form data for development
        console.log('Contact form submission:', formData);
        
        // Simulate network delay
        setTimeout(() => {
            // For demonstration, always resolve
            // In production, this would be an actual API call
            resolve();
            
            // Example of what the actual API call would look like:
            /*
            fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to send message');
                return response.json();
            })
            .then(resolve)
            .catch(reject);
            */
        }, 1000);
    });
}

// Show form message
function showFormMessage(message, type) {
    const formMessage = document.getElementById('formMessage');
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
}

// 1. INIT FUNCTION
function init() {
    console.log('🚀 Initializing Contact page');
    
    // Check authentication state from multiple sources
    const isAuth = checkMultipleAuthSources();
    updateAuthUI(isAuth);
    
    // Add event listeners
    document.addEventListener('click', handleNavigationClick);
    
    // Add form submit listener
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Initialize theme if available
    if (window.themeManager) {
        window.themeManager.init();
    }
}

// 2. CLEANUP FUNCTION
function cleanup() {
    console.log('🧹 Cleaning up Contact page');
    
    // Remove event listeners
    document.removeEventListener('click', handleNavigationClick);
    
    // Remove form listener
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.removeEventListener('submit', handleFormSubmit);
    }
}

// 3. AUTH HELPER FUNCTIONS
function checkMultipleAuthSources() {
    return window.sessionManager?.isAuthenticated || 
           window.authModule?.isAuthenticated ||
           localStorage.getItem('supabase.auth.token') ||
           sessionStorage.getItem('access_token');
}

function updateAuthUI(isAuthenticated) {
    // Update navigation based on auth state
    const authButton = document.querySelector('.nav-links .btn-primary');
    if (authButton && isAuthenticated) {
        authButton.textContent = 'Open App';
        authButton.dataset.route = '/app';
    }
}

// 4. EXPORT
export { init as initContactPage, cleanup as cleanupContactPage };