const paths={
 home:'<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 team:'<path d="M8 3h8l2 3 3 1-2 5-3-1v10H8V11l-3 1-2-5 3-1z"/><path d="M9 3c.4 2 1.5 3 3 3s2.6-1 3-3"/>',
 transfer:'<path d="M7 7h11l-3-3M17 17H6l3 3"/>', matches:'<circle cx="12" cy="12" r="9"/><path d="m8 8 4-2 4 2-1 5-3 2-3-2zM3.5 10l4.5-2M16 8l4.5 2M9 13l-2 6M15 13l2 6"/>',
 more:'<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M10 18h4"/>',
 wallet:'<path d="M3 7a3 3 0 0 1 3-3h12v16H6a3 3 0 0 1-3-3z"/><path d="M16 10h5v4h-5a2 2 0 0 1 0-4z"/>',
 rank:'<path d="M5 20V10M12 20V4M19 20v-7"/>', user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>', filter:'<path d="M4 5h16l-6 7v6l-4 2v-8z"/>', x:'<path d="m6 6 12 12M18 6 6 18"/>',
 check:'<path d="m5 12 4 4L19 6"/>', alert:'<path d="M12 3 2.5 20h19z"/><path d="M12 9v4M12 17h.01"/>',
 crown:'<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5z"/>', spark:'<path d="M13 2 4 14h7l-1 8 10-13h-7z"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.5 1A7 7 0 0 0 15 6l-.4-2.6h-4L10 6a7 7 0 0 0-1.5 1L6 6 4 9.5 6 11a7 7 0 0 0 0 2l-2 1.5L6 18l2.5-1a7 7 0 0 0 1.5 1l.5 2.6h4L15 18a7 7 0 0 0 1.5-1l2.5 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1z"/>',
 chevron:'<path d="m9 6 6 6-6 6"/>', plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
 flag:'<path d="M5 22V3M5 4h11l-2 4 2 4H5"/>', star:'<path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6-4.3-4.2 6-.9z"/>',
 swap:'<path d="M7 7h12l-3-3M17 17H5l3 3"/>', medal:'<circle cx="12" cy="14" r="5"/><path d="m9 9-3-6h4l2 4 2-4h4l-3 6"/>', rocket:'<path d="M14 5c3-3 6-2 6-2s1 3-2 6l-5 5-4-4zM9 10l-4 1-2 3 5 1M13 14l-1 5 3 2 2-5"/><circle cx="15.5" cy="7.5" r="1.5"/>',
 ball:'<circle cx="12" cy="12" r="9"/><path d="m9 8 3-2 3 2-1 4-2 1-2-1z"/>', language:'<path d="M4 5h9M8.5 3v2c0 5-2 8-5 10M6 9c2 3 4 5 7 6M14 20l4-10 4 10M16 16h4"/>',
 logout:'<path d="M10 4H4v16h6M14 8l4 4-4 4M18 12H8"/>', shield:'<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/><path d="m9 12 2 2 4-5"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>', chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', bell:'<path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3zM10 21h4"/>', moon:'<path d="M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10"/>', sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 download:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'
};
export function icon(name,size=22,cls=''){return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.ball}</svg>`}
