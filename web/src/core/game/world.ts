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
  dummy: Player
  players: Player[]
  balls: Ball[]
  nextBallId: number
}

export interface Catch {
  ball: Ball
  catcher: Player
  thrower: Player | undefined
}

export function createWorld(myName: string, myAvatar?: string): World {
  const me: Player = { id: 'me', name: myName, avatar: myAvatar, ...randomPoint(), target: null }
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
    armed: false,
    onGround: false,
    text,
    metadata,
  }
  world.balls.push(ball)
  return ball
}

// Pose au sol la boule d'un message resté non ramassé.
export function dropBall(world: World, message: Message, throwerId: string) {
  const { ground } = message.metadata!
  world.balls.push({
    id: world.nextBallId++,
    x: ground!.x,
    y: ground!.y,
    vx: 0,
    vy: 0,
    throwerId,
    throwerName: message.user,
    armed: true,
    onGround: true,
    text: message.content,
    metadata: message.metadata!,
    messageId: message.id,
  })
}

export function dummyThrow(world: World, size: Size) {
  const { text, metadata } = randomDummyMessage()
  const direction = {
    x: (world.me.x - world.dummy.x) * size.width,
    y: (world.me.y - world.dummy.y) * size.height,
  }
  throwBall(world, world.dummy, text, metadata, direction, DUMMY_TENSION)
}

// Avance le monde de dt secondes. Renvoie les boules attrapées pendant ce pas (déjà retirées du monde).
export function stepWorld(world: World, dt: number, size: Size): Catch[] {
  movePlayer(world.me, dt, size)
  movePlayer(world.dummy, dt, size, DUMMY_SPEED)
  if (!world.dummy.target && Math.random() < dt / 2) {
    world.dummy.target = randomPoint()
  }

  const catches: Catch[] = []

  for (const ball of world.balls) {
    stepBall(ball, dt, size)

    const thrower = world.players.find((p) => p.id === ball.throwerId)
    if (!ball.armed && (!thrower || !touches(ball, thrower, size))) {
      ball.armed = true
    }

    const catcher = world.players.find(
      (p) => (p.id !== ball.throwerId || ball.armed) && touches(ball, p, size),
    )
    if (catcher) catches.push({ ball, catcher, thrower })
  }

  if (catches.length) {
    world.balls = world.balls.filter((ball) => !catches.some((c) => c.ball.id === ball.id))
  }

  return catches
}
