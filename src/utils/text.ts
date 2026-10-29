/** Minuscules, sans accents ni espaces superflus : pour la recherche et les comparaisons. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr-FR')
    .trim()
    .replace(/\s+/g, ' ');
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}
