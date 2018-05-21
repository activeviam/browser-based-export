'use strict';

const {PaperFormats} = require('puppeteer/lib/Page');

// Taken from Puppeteer's Page module not-exported constant.
const unitToPixels = {
  cm: 37.8,
  in: 96,
  mm: 3.78,
  px: 1,
};

const availablePaperDimensionUnits = Object.keys(unitToPixels);

const paperDimensionFormat = `^(\\d+(.\\d+)?)(${availablePaperDimensionUnits.join(
  '|'
)})$`;

// We can disable the following rule as we know the
// `paperDimensionFormat` is safe to use.
// eslint-disable-next-line security/detect-non-literal-regexp
const paperDimensionRegexPattern = new RegExp(paperDimensionFormat);

const formatToDimensionsInPx = ({format, landscape}) => {
  const dimensions = PaperFormats[format];
  const dpi = unitToPixels.in;
  return {
    height: dimensions[landscape ? 'width' : 'height'] * dpi,
    width: dimensions[landscape ? 'height' : 'width'] * dpi,
  };
};

const toPixels = size => {
  const [, value, , unit] = paperDimensionRegexPattern.exec(size);
  return Number(value) * unitToPixels[unit];
};

const getDimensionsInPx = ({format, height, landscape, width} = {}) => {
  if (format) {
    return formatToDimensionsInPx({format, landscape});
  }
  if (height && width) {
    return {height: toPixels(height), width: toPixels(width)};
  }
  return formatToDimensionsInPx({format: 'letter', landscape});
};

const roundDimensions = ({height, width}) => ({
  height: Math.round(height),
  width: Math.round(width),
});

const getRoundedDimensionsInPx = paper =>
  roundDimensions(getDimensionsInPx(paper));

module.exports = {
  availablePaperFormats: Object.keys(PaperFormats),
  getRoundedDimensionsInPx,
  paperDimensionFormat,
};
