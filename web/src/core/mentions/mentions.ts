export interface Member {
  userId: number
  name: string
}

// Ponctuation collée au nom : « @Celine, tu viens ? »
const TRAILING_PUNCTUATION = /[.,;:!?)]+$/

// Mot en cours de saisie s'il commence par @ (le curseur est supposé en fin de texte).
export function mentionQuery(text: string): string | null {
  return text.match(/(?:^|\s)@(\S*)$/)?.[1] ?? null
}

export function suggestMembers(members: Member[], query: string): Member[] {
  const q = query.toLowerCase()
  return members.filter((m) => m.name.toLowerCase().startsWith(q) && m.name.toLowerCase() !== q)
}

export function completeMention(text: string, name: string): string {
  return text.replace(/@\S*$/, `@${name} `)
}

// Texte sans les @nom : un pseudo ne doit pas peser dans la détection d'émotion.
export function stripMentions(text: string): string {
  return text.replace(/(^|\s)@\S+/g, '$1').replace(/\s+/g, ' ').trim()
}

// Première mention qui correspond à un membre : c'est le destinataire.
export function findRecipient(text: string, members: Member[]): Member | undefined {
  for (const [, raw] of text.matchAll(/(?:^|\s)@(\S+)/g)) {
    const name = raw!.replace(TRAILING_PUNCTUATION, '').toLowerCase()
    const member = members.find((m) => m.name.toLowerCase() === name)
    if (member) return member
  }
}
