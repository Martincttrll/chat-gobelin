// Provisoire : en attendant l'endpoint « message lu » du back, un message est « non lu »
// s'il est arrivé après la dernière visite du channel (mémorisée dans ce navigateur).
function key(channelId: number) {
  return `lastSeen:${channelId}`
}

export function getLastSeen(channelId: number): Date {
  const value = localStorage.getItem(key(channelId))
  return value ? new Date(value) : new Date(0)
}

export function markSeen(channelId: number) {
  localStorage.setItem(key(channelId), new Date().toISOString())
}
