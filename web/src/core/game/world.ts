import type { Message, MessageMetadata } from '@/types/api'
import { DUMMY_SPEED, DUMMY_TENSION, randomDummyMessage, randomPoint } from './dummy'
import {
  launchVelocity,
  movePlayer,
  stepBall,
  touches,
  type Ball,
  type Player,
  type Point,
  type Size,
} from './physics'

export interface World {
  me: Player
  dummy?: Player // joueur de test, seulement en mode debug
  players: Player[]
  balls: Ball[]
  nextBallId: number
}

export interface Catch {
  ball: Ball
  catcher: Player
  thrower: Player | undefined
}

export function createWorld(myName: string, myAvatar?: string, withDummy = false): World {
  const me: Player = { id: 'me', name: myName, avatar: myAvatar, ...randomPoint(), target: null }
  if (!withDummy) return { me, players: [me], balls: [], nextBallId: 0 }

  const dummy: Player = { id: 'dummy', name: 'Dummy', ...randomPoint(), target: null }
  return { me, dummy, players: [me, dummy], balls: [], nextBallId: 0 }
}

// direction : vecteur en px (pas besoin d'être normalisé). tension : 0 → 1.
export function throwBall(
  world: World,
  thrower: Player,
  text: string,
  metadata: MessageMetadata,
  direction: Point,
  tension: number,
): Ball {
  const ball: Ball = {
    id: world.nextBallId++,
    x: thrower.x,
    y: thrower.y,
    ...launchVelocity(direction, tension, metadata.typingSpeed),
    throwerId: thrower.id,
    authorId: thrower.id,
    onGround: false,
    text,
    metadata,
  }
  world.balls.push(ball)
  return ball
}

// Rejoue le lancer d'un autre joueur, reçu avec son message.
export function remoteThrow(
  world: World,
  message: Message,
  throwerId: string,
  authorId: string,
  size: Size,
) {
  const { launch } = message.metadata!
  world.balls.push({
    id: world.nextBallId++,
    x: launch!.x,
    y: launch!.y,
    vx: launch!.vx * size.width,
    vy: launch!.vy * size.height,
    throwerId,
    authorId,
    throwerName: message.user,
    onGround: false,
    text: message.content,
    metadata: message.metadata!,
    messageId: message.id,
  })
}

// Pose au sol la boule d'un message resté non ramassé.
export function dropBall(world: World, message: Message, throwerId: string, authorId: string) {
  const { ground } = message.metadata!
  world.balls.push({
    id: world.nextBallId++,
    x: ground!.x,
    y: ground!.y,
    vx: 0,
    vy: 0,
    throwerId,
    authorId,
    throwerName: message.user,
    onGround: true,
    text: message.content,
    metadata: message.metadata!,
    messageId: message.id,
  })
}

export function dummyThrow(world: World, size: Size) {
  if (!world.dummy) return
  const { text, metadata } = randomDummyMessage()
  const direction = {
    x: (world.me.x - world.dummy.x) * size.width,
    y: (world.me.y - world.dummy.y) * size.height,
  }
  throwBall(world, world.dummy, text, metadata, direction, DUMMY_TENSION)
}

// Avance le monde de dt secondes. Renvoie les boules attrapées pendant ce pas (déjà retirées du monde).
export function stepWorld(world: World, dt: number, size: Size): Catch[] {
  for (const player of world.players) {
    movePlayer(player, dt, size, player === world.dummy ? DUMMY_SPEED : undefined)
  }
  if (world.dummy && !world.dummy.target && Math.random() < dt / 2) {
    world.dummy.target = randomPoint()
  }

  const catches: Catch[] = []

  for (const ball of world.balls) {
    stepBall(ball, dt, size)

    const thrower = world.players.find((p) => p.id === ball.throwerId)
    // On ne ramasse jamais ses propres messages, ni une boule qu'on vient de relancer ou de reposer.
    const catcher = world.players.find(
      (p) =>
        !p.remote && p.id !== ball.throwerId && p.id !== ball.authorId && touches(ball, p, size),
    )
    if (catcher) catches.push({ ball, catcher, thrower })
  }

  if (catches.length) {
    world.balls = world.balls.filter((ball) => !catches.some((c) => c.ball.id === ball.id))
  }

  return catches
}

// Parmi quelques points au hasard, garde le plus éloigné des boules : sinon on peut apparaître
// sur un message au sol et l'ouvrir dès l'arrivée. Distances en coordonnées de map (0–1).
const SPAWN_CANDIDATES = 20

export function placeAwayFromBalls(world: World) {
  if (world.balls.length === 0) return

  let best = world.me as Point
  let bestDistance = -1
  for (let i = 0; i < SPAWN_CANDIDATES; i++) {
    const candidate = randomPoint()
    const closest = Math.min(
      ...world.balls.map((ball) => Math.hypot(ball.x - candidate.x, ball.y - candidate.y)),
    )
    if (closest > bestDistance) {
      best = candidate
      bestDistance = closest
    }
  }
  world.me.x = best.x
  world.me.y = best.y
}
