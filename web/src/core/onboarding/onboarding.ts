// Onboarding vu ou non, retenu sur l'appareil. localStorage peut être indisponible (navigation
// privée, données bloquées) : on considère alors l'onboarding comme non vu.
export type OnboardingKey = 'home' | 'game'

const PREFIX = 'checkup:onboarding:'

export function isOnboardingDone(key: OnboardingKey): boolean {
  try {
    return localStorage.getItem(PREFIX + key) === 'done'
  } catch {
    return false
  }
}

export function markOnboardingDone(key: OnboardingKey) {
  try {
    localStorage.setItem(PREFIX + key, 'done')
  } catch {
    // Tant pis : il réapparaîtra.
  }
}
