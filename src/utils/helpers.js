import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx — prevents class conflicts
 * @param {...(string|object|array)} inputs - Class names or conditional objects
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Get initials from a full name
 * @param {string} name - Full name
 * @returns {string} Up to 2 character initials
 */
export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Format a phone number for display: 98765 43210
 * @param {string} phone - 10-digit phone string
 * @returns {string} Formatted phone
 */
export function formatPhone(phone) {
  if (!phone || phone.length !== 10) return phone || ''
  return `${phone.slice(0, 5)} ${phone.slice(5)}`
}
