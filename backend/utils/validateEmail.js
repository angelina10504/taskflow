// Pragmatic email format check: local@domain.tld with a 2+ character TLD.
// Allows plus-tagging (user+tag@gmail.com) and long TLDs (.online, .museum).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isValidEmail = (email) => typeof email === 'string' && EMAIL_RE.test(email.trim());

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

module.exports = { isValidEmail, normalizeEmail, EMAIL_RE };
