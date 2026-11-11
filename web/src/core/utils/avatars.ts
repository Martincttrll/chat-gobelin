// Tous les SVG du dossier : en ajouter un suffit à le proposer (shapeN = Formes, persoN = Personnages).
const files = import.meta.glob<string>('@/assets/img/profile-pic/*.svg', {
  eager: true,
  import: 'default',
})

export interface Avatar {
  id: string
  url: string
}

const AVATARS: Avatar[] = Object.entries(files)
  .map(([path, url]) => ({ id: path.split('/').pop()!.replace('.svg', ''), url }))
  .sort((a, b) => a.id.localeCompare(b.id))

export const SHAPES = AVATARS.filter((avatar) => avatar.id.startsWith('shape'))
export const CHARACTERS = AVATARS.filter((avatar) => avatar.id.startsWith('perso'))

export function avatarUrl(id?: string): string | undefined {
  return AVATARS.find((avatar) => avatar.id === id)?.url
}
