// Shared utilities for hostel color generation

// Extract a stable key from a hostel name. Use the full normalized string
// so that different hostels (e.g., "Legon Hall" vs "Legon Hostel") get distinct colors.
export function extractHostelKey(fullText) {
	if (!fullText || String(fullText).trim() === '' || fullText === 'No hostel') return 'default'
	return String(fullText).toLowerCase().trim().replace(/[\s,.-_]+/g, ' ')
}

// Simple, stable 32-bit hash
function hashString(input) {
	let hash = 0
	for (let i = 0; i < input.length; i++) {
		const char = input.charCodeAt(i)
		hash = ((hash << 5) - hash) + char
		hash |= 0
	}
	return hash >>> 0
}

// Convert HSL to hex for inline styles when needed
function hsl(h, s, l) {
	return `hsl(${h}, ${s}%, ${l}%)`
}

// Generate distinct, deterministic colors per hostel using HSL hues
export function getHostelColors(hostelName) {
	const key = extractHostelKey(hostelName)
	if (key === 'default') {
		return { background: '#f8f9fb', border: '#ddd', text: '#334e68' }
	}

	const h = hashString(key) % 360
	// Soft background, vivid border, readable dark text derived from hue
	const background = hsl(h, 62, 92)
	const border = hsl(h, 70, 40)
	const text = hsl(h, 55, 28)
	return { background, border, text }
}


