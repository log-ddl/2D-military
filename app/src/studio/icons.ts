const paths: Record<string,string> = {
 play:'<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
 pause:'<path d="M8 5v14M16 5v14" stroke-width="4"/>',
 start:'<path d="M5 5v14m14-14L8 12l11 7Z"/>',
 back:'<path d="m13 5-7 7 7 7M20 5l-7 7 7 7"/>',
 forward:'<path d="m4 5 7 7-7 7m7-14 7 7-7 7"/>',
 loop:'<path d="m16 3 4 4-4 4M4 11V9a2 2 0 0 1 2-2h14M8 21l-4-4 4-4m12 0v2a2 2 0 0 1-2 2H4"/>',
 previous:'<path d="M5 5v14m14-14L8 12l11 7Z"/>',
 next:'<path d="M19 5v14M5 5l11 7-11 7Z"/>',
 volume:'<path d="M11 4 5 9H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 muted:'<path d="M11 4 5 9H2v6h3l6 5Zm5 5 5 6m0-6-5 6"/>',
 fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m10 2-.5 3-2 .9L5 4.5 2.5 9l2.5 1.7v2.6L2.5 15 5 19.5l2.5-1.4 2 .9.5 3h4l.5-3 2-.9 2.5 1.4 2.5-4.5-2.5-1.7v-2.6L21.5 9 19 4.5l-2.5 1.4-2-.9-.5-3Z"/>',
};
export function icon(name: string) { return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`; }
