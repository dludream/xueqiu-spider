import fs from 'fs'
import sortKeysRecursive from 'sort-keys-recursive'
import accounts from "../dev-accounts.json" with { type: "json" }
import XueqiuApi from './api'
import type { UserTimelineStatus } from './api.types'

const loadExistingTimeline = async (userId: number): Promise<UserTimelineStatus[]> => {
  const file = `./data/timeline_${userId}.json`
  return (
    fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf-8'))
      : []
  )
}

const saveTimeline = async (userId: number, timeline: UserTimelineStatus[]): Promise<void> => {
  const file = `./data/timeline_${userId}.json`
  fs.writeFileSync(file, JSON.stringify(timeline.map(s => sortKeysRecursive(s)), null, 4))
}

const mergeTimeline = (a: UserTimelineStatus[], b: UserTimelineStatus[]): UserTimelineStatus[] => {
  const map = new Map<number, UserTimelineStatus>()
  for (const status of a) {
    map.set(status.id, status)
  }
  for (const status of b) {
    map.set(status.id, status)
  }
  return Array.from(map.values())
}

// 添加延时函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 生成随机延时时间（3-10秒之间）
const getRandomDelay = () => Math.floor(Math.random() * (10000 - 3000 + 1) + 3000)

try {
  const api = new XueqiuApi()
  await api.init()
  
  for (const account of accounts) {
    // 添加随机延时
    const delay = getRandomDelay()
    console.log(`等待 ${delay/1000} 秒后继续...`)
    await sleep(delay)
    
    const timelineRes = await api.fetchUserTimeline(account.id, Number(account.timestamp), account.md5)
    const oldTimeline = await loadExistingTimeline(account.id)
    const timeline = mergeTimeline(timelineRes.statuses, oldTimeline)
    await saveTimeline(account.id, timeline)
  }
  
  await api.dispose()
} catch (err) {
  console.error(err)
  process.exit(-1)
}
