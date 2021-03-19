export function generateColor(input: number) {
    const hash = input.toString(16) + input.toString(16).slice(-3);
    let result = 0;

    for (let i = 0; i < hash.length; i++) {
        result += parseInt(hash.charAt(i), 16) / 16;
    }

    result = result * 360;

    return `hsl(${result}, 65%, 68%)`;
}
