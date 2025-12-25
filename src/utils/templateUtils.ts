/**
 * Template parsing utilities for Prompt Manager
 * Handles {{keyword}} parsing and replacement
 */

/**
 * Parse all {{keywords}} from template text
 * @param text - Template text containing {{keywords}}
 * @returns Array of unique keyword names (without braces)
 */
export function parseTemplateKeywords(text: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const keywords = new Set<string>();
    let match;

    while ((match = regex.exec(text)) !== null) {
        keywords.add(match[1]);
    }

    return Array.from(keywords);
}

/**
 * Apply template values to text, replacing {{keywords}} with their values
 * Keywords without values remain as {{keyword}} in the output
 * @param text - Template text containing {{keywords}}
 * @param values - Map of keyword names to their values
 * @returns Text with present values replaced, missing ones left as {{keyword}}
 */
export function applyTemplateValues(
    text: string,
    values: Record<string, string>
): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, keyword) => {
        const value = values[keyword];
        // Only replace if value exists and is non-empty
        return value !== undefined && value !== '' ? value : match;
    });
}

/**
 * Check if text contains any template keywords
 * @param text - Text to check
 * @returns True if text contains at least one {{keyword}}
 */
export function hasTemplateKeywords(text: string): boolean {
    return /\{\{\w+\}\}/.test(text);
}
