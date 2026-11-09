/** Small native vector signs; the actual scene uses the corresponding venue theme. */
const drawings={
 tram:'<path d="M39 22h82v56H39zM48 32h64v24H48zM80 22V10m-17 0h34M35 88h90M46 78l-8 16m76-16 8 16"/><circle cx="53" cy="69" r="4"/><circle cx="107" cy="69" r="4"/>',
 tower:'<path d="M55 90V39h50v51M48 39l32-28 32 28zM52 56h56M52 79h56M80 11V4M70 90V68h20v22M62 43v9m18-9v9m18-9v9"/>',
 harbor:'<path d="M24 71h112l-21 16H48zM55 71V43h47v28M63 44V25h17v19M96 71V56h18v15M22 96q14-9 28 0t28 0 28 0 28 0M116 48V13m-17 0h34m-9 0v22"/>',
 market:'<path d="M27 39h106L120 16H40zM31 39v51h98V39M44 58h72v32M26 39q10 15 20 0 10 15 21 0 11 15 21 0 11 15 22 0 11 15 24 0M45 16l-9 23m30-23-3 23m22-23 3 23m20-23 10 23"/>',
 ferry:'<path d="M20 68h120l-22 20H41zM40 68V43h79v25M56 43V29h39v14M68 29V15h12v14M49 52h9m9 0h9m9 0h9m9 0h9M20 98q15-10 30 0t30 0 30 0 30 0"/>',
 courtyard:'<path d="M27 91V36q18-33 36 0v55M63 91V36q18-33 36 0v55M99 91V36q18-33 36 0v55M20 91h122M44 70h73M67 70l5-16h17l6 16M80 54V40"/>',
};
export function venueIllustration(theme='tram') {return `<svg viewBox="0 0 160 108" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[theme]||drawings.tram}</svg>`;}
