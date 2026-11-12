// Tous les SVG du dossier : en ajouter un suffit à le proposer.
const files = import.meta.glob<string>('@/assets/img/profile-pic/*.svg', {
  eager: true,
  import: 'default',
})

export interface Avatar {
  id: string
  url: string
}

export const AVATARS: Avatar[] = Object.entries(files)
  .map(([path, url]) => ({ id: path.split('/').pop()!.replace('.svg', ''), url }))
  // numeric : avatar10 après avatar9, et pas après avatar1.
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))

export function avatarUrl(id?: string): string | undefined {
  return AVATARS.find((avatar) => avatar.id === id)?.url
}
