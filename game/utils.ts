export const darken = (hex: string, amount: number): string => {
    let color = hex.startsWith('#') ? hex.slice(1) : hex;
    const num = parseInt(color, 16);

    let r = (num >> 16) - amount;
    if (r < 0) r = 0;

    let g = ((num >> 8) & 0x00FF) - amount;
    if (g < 0) g = 0;

    let b = (num & 0x0000FF) - amount;
    if (b < 0) b = 0;

    // Reconstruct the hex string, padding with '0' if necessary
    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
