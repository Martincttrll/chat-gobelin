// POST /login renvoie le JWT en texte brut (pas de JSON), valable 60 min.

// Les metadata sont rangées par namespace : { "type-swap": { ... }, "autre-app": { ... } }.
// Sur une requête avec ?namespace=, l'API ne renvoie que celles de ce namespace (pas pour /me.channels).
export type NamespacedMetadata = Record<string, unknown>

export interface Channel {
  id: number
  name: string
  creation_date: string
  metadata: NamespacedMetadata | null
}

// Réponse de POST /user et de PUT /user (sans channels).
export interface User {
  id: number
  username: string
  metadata: NamespacedMetadata | null
}

// Nos metadata d'utilisateur (namespace type-swap).
export interface UserMetadata {
  avatar?: string
}

// Réponse de GET /me.
export interface Me extends User {
  channels: Channel[]
}

export type Mood = 'neutral' | 'anger' | 'joy' | 'sadness' | 'stress' | 'surprise'

export interface MessageMetadata {
  mood: Mood
  typingSpeed: number
  pauses: number[]
  // Partagé entre tous les joueurs. Absent sur les messages d'avant la feature : considérés ramassés.
  pickedUp?: boolean
  ground?: { x: number; y: number } // où la boule s'est arrêtée (coordonnées 0–1 de la map)
  launch?: { x: number; y: number; vx: number; vy: number } // départ et vitesse (map 0–1, par seconde)
  // Contournement en attendant que le back relaie les événements des clients : la position d'un
  // joueur passe par un message technique, jamais affiché (toShow: false).
  toShow?: false
  presence?: Presence
  // Mention @nom : seul ce joueur peut ouvrir le message, les autres doivent lui faire une passe.
  to?: { userId: number; name: string }
  heldBy?: number // userId du joueur qui tient la boule (écran « Oups » ouvert)
  passerId?: number // userId du dernier à avoir relancé ou reposé la boule (sinon : l'auteur)
  roster?: { channel: string; members: number[] } // liste des membres d'un channel (message de ws-checkup)
}

export interface Presence {
  channelId: number // channel de jeu où se trouve le joueur (le message, lui, est dans ws-checkup)
  userId: number
  name: string
  avatar?: string
  x: number
  y: number
  left?: boolean // a quitté le jeu (sinon, le départ est détecté par /channel/connected)
  sentAt?: number // Date.now() de l'envoi : l'accueil s'en sert pour savoir si le joueur est encore là
}

// Message tel que renvoyé par l'API.
export interface ApiMessage {
  id: number
  channel_id: number
  content: string
  user_id: number
  user: string
  anonymous: boolean
  creation_date: string
  posted_at: string
  metadata: NamespacedMetadata | null
}

// Message tel qu'utilisé par l'app : nos metadata sorties de leur namespace.
export interface Message extends Omit<ApiMessage, 'metadata'> {
  metadata?: MessageMetadata
}

// GET /channel/message renvoie null (et pas []) quand le channel est vide.
export type ApiMessageList = ApiMessage[] | null

export interface Credentials {
  username: string
  password: string
}

// metadata obligatoire en pratique : sans, l'API refuse le channel (colonne NOT NULL).
export interface CreateChannelPayload {
  name: string
  metadata: object
}

// Rejoint un channel par son nom, pas par son id. Renvoie le Channel rejoint.
export interface EnterChannelPayload {
  channel: string
}

// metadata est obligatoire en pratique : sans, l'API refuse le message (colonne NOT NULL).
export interface CreateMessagePayload {
  content: string
  channel: number
  metadata: MessageMetadata
}

export interface EditMessagePayload {
  id: number
  content: string
  metadata?: MessageMetadata
}
