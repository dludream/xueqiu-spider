import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'
import type { SearchUserRes, UserTimelineRes } from './api.types'
import accounts from '../dev-accounts.json' with { type: 'json' }

const getProxy = () => {
  if (!process.env.HTTP_PROXY) {
    return null
  }

  const url = new URL(process.env.HTTP_PROXY)
  return {
    http_proxy: url.protocol + '//' + url.host,
    username: url.username,
    password: url.password,
  }
}

export default class XueqiuApi {
  private browser!: Browser
  private page!: Page

  async init() {
    const proxy = getProxy()
    this.browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        ...(proxy
          ? [`--proxy-server=${proxy.http_proxy}`]
          : []),
      ],
    })
    this.page = await this.browser.newPage()
    if (proxy) {
      await this.page.authenticate({
        username: proxy.username,
        password: proxy.password,
      })
    }
    await this.page.setViewport({ width: 1080, height: 1024 })
    await this.ignoreImages()

    // 先访问一次首页，激活cookie
    await this.page.goto('https://xueqiu.com/')
  }

  async dispose() {
    await this.browser.close()
  }

  async screenshot(path: string) {
    await this.page.screenshot({ path })
  }

  async ignoreImages() {
    await this.page.setRequestInterception(true)

    this.page.on('request', (request) => {
      if (request.isInterceptResolutionHandled()) {
        return
      }
      const resourceType = request.resourceType()
      if (resourceType === 'image') {
        request.abort()
      } else {
        request.continue()
      }
    })
  }

  async fetchJson<T>(url: string) {
    const res = await this.page.goto(url)
    if (!res) {
      throw new Error(`Failed to fetch json from ${url}`)
    }
    return JSON.parse(await res.text()) as T
  }

  async searchUser(query: string) {
    const json = await this.fetchJson<SearchUserRes>(`https://xueqiu.com/query/v1/search/user.json?q=${encodeURIComponent(query)}`)
    return json
  }

  async fetchUserTimeline(userId: number, timestamp: string, md5: string) {
    const json = await this.fetchJson<UserTimelineRes>(`https://xueqiu.com/v4/statuses/user_timeline.json?page=1&user_id=${userId}&_=${timestamp}&md5__1038=${md5}`)
    return json
  }
}
