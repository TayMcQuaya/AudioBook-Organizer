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
        // Send form data to backend
        await submitToBackend(formData);
        
        // Show success message
        showFormMessage('Thank you for your message! We\'ll get back to you soon.', 'success');
        
        // Reset form
        form.reset();
        
    } catch (error) {
        console.error('Form submission error:', error);
        // Use the friendly error message from backend if available
        const errorMessage = error.message || 'Our servers are currently busy. Please wait a moment and try again.';
        showFormMessage(errorMessage, 'error');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// Submit form data to backend
async function submitToBackend(formData) {
    // Removed console.log to prevent exposing user contact info
    
    const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send message');
    }
    
    return response.json();
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

// Update character count
function updateCharacterCount() {
    const messageTextarea = document.getElementById('message');
    const charCount = document.getElementById('charCount');
    const counter = document.querySelector('.character-counter');
    
    if (!messageTextarea || !charCount || !counter) return;
    
    const currentLength = messageTextarea.value.length;
    const maxLength = 2000;
    
    charCount.textContent = currentLength;
    
    // Update counter color based on length
    counter.classList.remove('warning', 'danger');
    if (currentLength > maxLength * 0.9) {
        counter.classList.add('danger');
    } else if (currentLength > maxLength * 0.8) {
        counter.classList.add('warning');
    }
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
    
    // Add character counter listener
    const messageTextarea = document.getElementById('message');
    if (messageTextarea) {
        messageTextarea.addEventListener('input', updateCharacterCount);
        // Initialize counter on page load
        updateCharacterCount();
    }
    
    // Initialize theme if available
    if (window.themeManager) {
        window.themeManager.init();
    }
    
    // Handle URL parameters
    handleUrlParameters();
}

// Handle URL parameters to pre-fill form
async function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const subject = urlParams.get('subject');
    
    if (subject) {
        const subjectSelect = document.getElementById('subject');
        if (subjectSelect) {
            // Pre-select the subject dropdown
            subjectSelect.value = subject;
            console.log(`📋 Pre-selected subject: ${subject}`);
            
            // If it's enterprise, optionally pre-fill the message
            if (subject === 'enterprise') {
                const messageTextarea = document.getElementById('message');
                if (messageTextarea && !messageTextarea.value) {
                    messageTextarea.value = 'I am interested in enterprise/custom pricing for AudioBook Organizer. Please provide information about bulk credit packages and volume discounts.';
                    // Update character count after pre-filling
                    updateCharacterCount();
                }
            }
        }
    }
    
    // Pre-fill name and email for authenticated users
    if (checkMultipleAuthSources()) {
        try {
            let userEmail = null;
            let userName = null;
            
            // Get user data from session
            if (window.sessionManager && window.sessionManager.getSession) {
                const session = window.sessionManager.getSession();
                if (session?.user) {
                    userEmail = session.user.email;
                    // Get the profile name (this is updated when user changes it in profile)
                    userName = session.user.full_name || session.user.user_metadata?.full_name;
                }
            }
            
            // If we still need data, check auth module
            if (!userName || !userEmail) {
                if (window.authModule && window.authModule.getCurrentUser) {
                    const currentUser = window.authModule.getCurrentUser();
                    if (currentUser) {
                        userEmail = userEmail || currentUser.email;
                        userName = userName || currentUser.full_name || currentUser.user_metadata?.full_name;
                    }
                }
            }
            
            // Pre-fill the form
            const emailInput = document.getElementById('email');
            if (emailInput && !emailInput.value && userEmail) {
                emailInput.value = userEmail;
            }
            
            const nameInput = document.getElementById('name');
            if (nameInput && !nameInput.value && userName) {
                nameInput.value = userName;
            }
            
        } catch (error) {
            // Silent fail
        }
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
    
    // Remove character counter listener
    const messageTextarea = document.getElementById('message');
    if (messageTextarea) {
        messageTextarea.removeEventListener('input', updateCharacterCount);
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