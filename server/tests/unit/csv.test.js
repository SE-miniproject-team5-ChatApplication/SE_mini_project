const { csvCell } = require('../../src/services/historyService');

describe('REQ-HIS-5 CSV cells', () => {
  test('quotes are escaped and formulas are neutralised', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');

    expect(csvCell('=HYPERLINK("x")')).toBe(
      '"\'=HYPERLINK(""x"")"'
    );

    expect(csvCell(null)).toBe('""');
  });

  test('commas and newlines remain safely inside quoted cells', () => {
    expect(csvCell('hello, world')).toBe('"hello, world"');

    expect(csvCell('first line\nsecond line')).toBe(
      '"first line\nsecond line"'
    );
  });

  test('formula-like values beginning with special characters are neutralised', () => {
    expect(csvCell('+SUM(A1:A2)')).toBe(
      '"\'+SUM(A1:A2)"'
    );

    expect(csvCell('-1+2')).toBe(
      '"\'-1+2"'
    );

    expect(csvCell('@SUM(A1)')).toBe(
      '"\'@SUM(A1)"'
    );
  });
});