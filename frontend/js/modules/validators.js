/**
 * Input Validation and Strength Checking Module
 */

/**
 * Validates password complexity.
 * @param {string} password - The password to validate.
 * @returns {boolean} - True if the password is valid, false otherwise.
 */
export function validatePassword(password) {
    if (!password || password.length < 8) return false;
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
    return hasNumber && hasUpper && hasLower && hasSpecial;
}

/**
 * Checks password strength on a scale of 0 to 1.
 * @param {string} password - The password to check.
 * @returns {number} - A score from 0 (weak) to 1 (strong).
 */
export function checkPasswordStrength(password) {
    let score = 0;
    if (!password) return 0;

    // Award points for different criteria
    if (password.length >= 8) score += 0.25;
    if (password.length >= 12) score += 0.25;
    if (/[A-Z]/.test(password)) score += 0.15;
    if (/[a-z]/.test(password)) score += 0.15;
    if (/\d/.test(password)) score += 0.1;
    if (/[^A-Za-z0-9]/.test(password)) score += 0.1;
    
    return Math.min(score, 1);
}

/**
 * Validates email format.
 * @param {string} email - The email to validate.
 * @returns {boolean} - True if the email format is valid.
 */
export function validateEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(email).toLowerCase());
} 