const QRCode = require('qrcode');

const COLORS = {
  blue: { dark: '#087CFF', light: '#FFFFFF' },
  black: { dark: '#111827', light: '#FFFFFF' },
  purple: { dark: '#7C3AED', light: '#FFFFFF' },
  green: { dark: '#059669', light: '#FFFFFF' },
  red: { dark: '#DC2626', light: '#FFFFFF' }
};

async function makePng(text, color = 'black') {
  const palette = COLORS[color] || COLORS.black;
  return QRCode.toBuffer(text, {
    type: 'png', errorCorrectionLevel: 'H', width: 900, margin: 3,
    color: { dark: palette.dark, light: palette.light }
  });
}

module.exports = { makePng, COLORS };
