export const REWARD_LEVELS = [
  { level: 1, title: 'New Explorer', minXp: 0, emoji: '🌱' },
  { level: 2, title: 'Word Collector', minXp: 100, emoji: '📚' },
  { level: 3, title: 'Sentence Builder', minXp: 250, emoji: '✍️' },
  { level: 4, title: 'Speaking Star', minXp: 500, emoji: '⭐' },
  { level: 5, title: 'Grammar Hero', minXp: 900, emoji: '🦸' },
  { level: 6, title: 'English Champion', minXp: 1500, emoji: '🏆' },
]

export const BADGE_CATALOG = [
  { id: 'first-homework', title: 'Homework Hero', emoji: '✅', description: 'Complete your first homework.' },
  { id: 'three-day-streak', title: '3-Day Streak', emoji: '🔥', description: 'Keep learning for 3 days.' },
  { id: 'five-lessons', title: '5 Lesson Learner', emoji: '🎓', description: 'Complete 5 lessons.' },
  { id: 'game-starter', title: 'Game Starter', emoji: '🎮', description: 'Earn stars from English games.' },
  { id: 'library-reader', title: 'Library Reader', emoji: '📖', description: 'Open and save learning resources.' },
  { id: 'referral-friend', title: 'Friendly Referrer', emoji: '🤝', description: 'Invite a friend to TutorPro.' },
]

export const DAILY_MISSIONS = [
  { id: 'check-in', title: 'Daily English check-in', reward: { xp: 15, coins: 5, stars: 1 } },
  { id: 'read-resource', title: 'Open one library resource', reward: { xp: 20, coins: 8, stars: 1 } },
  { id: 'practice-sentence', title: 'Practise 3 complete sentences', reward: { xp: 25, coins: 10, stars: 2 } },
]

export function getRewardProfile(learner = {}) {
  const profile = learner.rewardProfile || {}
  const xp = Number(profile.xp || 0)
  const coins = Number(profile.coins || 0)
  const stars = Number(profile.stars ?? learner.gameStars ?? 0)
  const badges = Array.isArray(profile.badges) ? profile.badges : []
  const claimedMissions = profile.claimedMissions && typeof profile.claimedMissions === 'object' ? profile.claimedMissions : {}
  const transactions = Array.isArray(profile.transactions) ? profile.transactions : []
  return { xp, coins, stars, badges, claimedMissions, transactions }
}

export function getRewardLevel(xp = 0) {
  return [...REWARD_LEVELS].reverse().find((level) => xp >= level.minXp) || REWARD_LEVELS[0]
}

export function getNextRewardLevel(xp = 0) {
  return REWARD_LEVELS.find((level) => level.minXp > xp) || null
}

export function rewardProgress(xp = 0) {
  const current = getRewardLevel(xp)
  const next = getNextRewardLevel(xp)
  if (!next) return { current, next: null, percent: 100, remaining: 0 }
  const previous = current.minXp
  const range = next.minXp - previous
  return { current, next, percent: Math.round(((xp - previous) / range) * 100), remaining: next.minXp - xp }
}

export function addReward(profile, reward, reason) {
  const current = getRewardProfile({ rewardProfile: profile })
  const transaction = {
    id: crypto.randomUUID(),
    reason,
    xp: Number(reward.xp || 0),
    coins: Number(reward.coins || 0),
    stars: Number(reward.stars || 0),
    createdAt: new Date().toISOString(),
  }
  return {
    ...current,
    xp: current.xp + transaction.xp,
    coins: current.coins + transaction.coins,
    stars: current.stars + transaction.stars,
    transactions: [transaction, ...current.transactions].slice(0, 100),
  }
}

export function addBadge(profile, badgeId) {
  const current = getRewardProfile({ rewardProfile: profile })
  if (current.badges.includes(badgeId)) return current
  return { ...current, badges: [...current.badges, badgeId] }
}

export function todaysMissionKey(missionId) {
  return `${new Date().toISOString().slice(0, 10)}:${missionId}`
}

export function canClaimMission(profile, missionId) {
  const current = getRewardProfile({ rewardProfile: profile })
  return !current.claimedMissions[todaysMissionKey(missionId)]
}

export function claimMission(profile, mission) {
  const current = getRewardProfile({ rewardProfile: profile })
  const key = todaysMissionKey(mission.id)
  if (current.claimedMissions[key]) return current
  const rewarded = addReward(current, mission.reward, mission.title)
  return { ...rewarded, claimedMissions: { ...current.claimedMissions, [key]: new Date().toISOString() } }
}

export function deriveAutomaticBadges(learner = {}) {
  const profile = getRewardProfile(learner)
  let next = profile
  if ((learner.lessonsCompleted || 0) >= 5) next = addBadge(next, 'five-lessons')
  if ((learner.streak || 0) >= 3) next = addBadge(next, 'three-day-streak')
  if ((learner.gameStars || profile.stars || 0) > 0) next = addBadge(next, 'game-starter')
  if ((learner.achievements || []).includes('Homework hero')) next = addBadge(next, 'first-homework')
  return next
}
