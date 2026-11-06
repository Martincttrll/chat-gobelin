import type { MessageMetadata } from '@/types/api'
import { clamp01, typingIntensity } from '@/message-style/messageStyle'

// Positions en coordonnées relatives (0 → 1 sur chaque axe de l'écran),
// vitesses et distances en pixels pour que la physique soit la même sur les deux axes.
export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Player extends Point {
  id: string
  name: string
  target: Point | null
}

export interface Ball extends Point {
  id: number
  vx: number
  vy: number
  throwerId: string
  // Faux tant que la boule n'a pas quitté le lanceur, pour qu'il ne la rattrape pas au départ.
  armed: boolean
  onGround: boolean
  text: string
  metadata: MessageMetadata
}

// Valeurs provisoires.
export const PLAYER_RADIUS = 24 // px
const MIN_BALL_RADIUS = 8 // px, message d'un caractère
const MAX_BALL_RADIUS = 20 // px
const LONG_MESSAGE = 100 // caractères : au-delà, la boule ne grossit plus
export const MAX_PULL = 120 // px, tension max de la fronde
export const PLAYER_SPEED = 220 // px/s
const MIN_LAUNCH_SPEED = 400 // px/s, frappe lente et tension max
const MAX_LAUNCH_SPEED = 1400 // px/s, frappe rapide et tension max
const FRICTION = 1.2 // plus c'est grand, plus la boule ralentit vite
const BOUNCE = 0.8 // vitesse conservée après un rebond
const STOP_SPEED = 30 // px/s, en dessous la boule tombe au sol

export function distance(a: Point, b: Point, size: Size): number {
  return Math.hypot((a.x - b.x) * size.width, (a.y - b.y) * size.height)
}

export function clampToMap(point: Point, radius: number, size: Size): Point {
  const marginX = radius / size.width
  const marginY = radius / size.height
  return {
    x: Math.min(Math.max(point.x, marginX), 1 - marginX),
    y: Math.min(Math.max(point.y, marginY), 1 - marginY),
  }
}

export function movePlayer(player: Player, dt: number, size: Size, speed = PLAYER_SPEED) {
  if (!player.target) return

  const remaining = distance(player, player.target, size)
  const step = speed * dt

  if (remaining <= step) {
    player.x = player.target.x
    player.y = player.target.y
    player.target = null
    return
  }

  player.x += ((player.target.x - player.x) * step) / remaining
  player.y += ((player.target.y - player.y) * step) / remaining
}

// direction : vecteur en px (pas besoin d'être normalisé). tension : 0 → 1.
export function launchVelocity(direction: Point, tension: number, typingSpeed: number) {
  const length = Math.hypot(direction.x, direction.y) || 1
  const maxSpeed =
    MIN_LAUNCH_SPEED + (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED) * typingIntensity(typingSpeed)
  const speed = maxSpeed * tension

  return {
    vx: (direction.x / length) * speed,
    vy: (direction.y / length) * speed,
  }
}

export function ballRadius(text: string): number {
  return MIN_BALL_RADIUS + (MAX_BALL_RADIUS - MIN_BALL_RADIUS) * clamp01(text.length / LONG_MESSAGE)
}

export function stepBall(ball: Ball, dt: number, size: Size) {
  if (ball.onGround) return

  ball.x += (ball.vx * dt) / size.width
  ball.y += (ball.vy * dt) / size.height

  const radius = ballRadius(ball.text)
  const minX = radius / size.width
  const minY = radius / size.height

  if (ball.x < minX) {
    ball.x = minX
    ball.vx = Math.abs(ball.vx) * BOUNCE
  } else if (ball.x > 1 - minX) {
    ball.x = 1 - minX
    ball.vx = -Math.abs(ball.vx) * BOUNCE
  }

  if (ball.y < minY) {
    ball.y = minY
    ball.vy = Math.abs(ball.vy) * BOUNCE
  } else if (ball.y > 1 - minY) {
    ball.y = 1 - minY
    ball.vy = -Math.abs(ball.vy) * BOUNCE
  }

  // Exponentielle plutôt que vx *= 0.98 : le ralentissement ne dépend pas du nombre d'images par seconde.
  const decay = Math.exp(-FRICTION * dt)
  ball.vx *= decay
  ball.vy *= decay

  if (Math.hypot(ball.vx, ball.vy) < STOP_SPEED) {
    ball.vx = 0
    ball.vy = 0
    ball.onGround = true
  }
}

export function touches(ball: Ball, player: Player, size: Size): boolean {
  return distance(ball, player, size) < PLAYER_RADIUS + ballRadius(ball.text)
}
