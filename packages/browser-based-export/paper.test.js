/* eslint-env jest */

'use strict';

const {getRoundedDimensionsInPx} = require('./paper');

const expectHeightAndWidth = (paper, height, width) => {
  expect(getRoundedDimensionsInPx(paper)).toEqual({height, width});
};

test('format takes priority over width or height', () => {
  expectHeightAndWidth({format: 'a4', height: '1px', width: '1px'}, 1123, 794);
});

describe('landscape', () => {
  test('can be given if a format is given', () => {
    expectHeightAndWidth({format: 'a4', landscape: true}, 794, 1123);
  });

  test('ignored when only width and height are given', () => {
    expectHeightAndWidth({height: '1px', landscape: true, width: '2px'}, 1, 2);
  });
});

describe('width and height can be given in several units', () => {
  test('centimeters', () => {
    expectHeightAndWidth({height: '1cm', width: '2cm'}, 38, 76);
  });

  test('inches', () => {
    expectHeightAndWidth({height: '1in', width: '2in'}, 96, 192);
  });

  test('millimeters', () => {
    expectHeightAndWidth({height: '10mm', width: '20mm'}, 38, 76);
  });
});
