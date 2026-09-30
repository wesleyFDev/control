import { isoToBR, maskDateInput } from '../dateMask';

describe('maskDateInput', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['05', '05'],
    ['050', '05/0'],
    ['0509', '05/09'],
    ['05092', '05/09/2'],
    ['05092026', '05/09/2026'],
    ['050920261', '05/09/2026'],
    ['05/09/2026', '05/09/2026'],
    ['5-9-26', '59/26'],
  ])('"%s" -> "%s"', (input, expected) => {
    expect(maskDateInput(input)).toBe(expected);
  });

  it('apagar a barra não trava a digitação', () => {
    // "05/09" com o último caractere apagado vira "05/0".
    expect(maskDateInput('05/0')).toBe('05/0');
    expect(maskDateInput('05/')).toBe('05');
  });
});

describe('isoToBR', () => {
  it('converte AAAA-MM-DD em dd/mm/aaaa', () => {
    expect(isoToBR('2026-09-05')).toBe('05/09/2026');
  });
});
