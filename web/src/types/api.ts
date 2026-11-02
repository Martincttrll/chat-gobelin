// POST /login renvoie le JWT en texte brut (pas de JSON), valable 60 min.

export interface Channel {
  id: number
  name: string
  creation_date: string
}

// Réponse de POST /user (sans channels, contrairement à ce que dit user.md).
export interface User {
  id: number
  username: string
}

// Réponse de GET /me.
export interface Me extends User {
  channels: Channel[]
}

export interface Message {
  content: string
  user_id: number
  user: string
  creation_date: string
}

// GET /channel/message renvoie null (et pas []) quand le channel est vide.
export type MessageList = Message[] | null

export interface Credentials {
  username: string
  password: string
}

export interface CreateChannelPayload {
  name: string
}

// Rejoint un channel par son nom, pas par son id. Renvoie le Channel rejoint.
export interface EnterChannelPayload {
  channel: string
}

export interface CreateMessagePayload {
  content: string
  channel: number
}
