const { cloud } = require('../../utils/cloud')

Page({
  data: {
    diaries: [],
    loading: true
  },

  onShow() {
    this.loadDiaries()
  },

  async loadDiaries() {
    this.setData({ loading: true })
    try {
      const { data: session, error: sessionError } = await cloud.auth.getSession()
      if (sessionError || !session) {
        this.setData({ diaries: [], loading: false })
        return
      }

      const { data, error } = await cloud.database
        .from('diaries')
        .select('*')
        .order('diary_date', { ascending: false, nullsFirst: false })
        .limit(500)

      if (error) throw error

      const list = (data || []).map((d) => {
        // 展示日期优先用 diary_date，兼容旧数据（无该字段时回退 created_at）
        const dateSource = d.diary_date || d.created_at
        return {
          ...d,
          dateText: this.formatDate(dateSource),
          timeText: this.formatTime(d.created_at)
        }
      })

      this.setData({ diaries: list, loading: false })
    } catch (err) {
      console.error('[diary] load failed', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onWrite() {
    wx.navigateTo({ url: '/pages/diary/write' })
  },

  onDiaryTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/diary/write?id=${id}` })
  },

  formatDate(ts) {
    if (!ts) return ''
    const pad = (n) => (n < 10 ? '0' + n : n)
    // ts 可能是 'YYYY-MM-DD'（diary_date）或时间戳（created_at）
    let date
    if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}/.test(ts)) {
      // 纯日期字符串，直接拆分，避免时区偏移
      const parts = ts.split('-')
      date = `${parts[0]}-${parts[1]}-${parts[2]}`
    } else {
      const d = new Date(ts)
      date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    const now = new Date()
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    if (date === today) return '今天'
    const yesterday = new Date(now.getTime() - 86400000)
    const yDate = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`
    if (date === yDate) return '昨天'
    // 显示为 M月D日
    return `${Number(date.split('-')[1])}月${Number(date.split('-')[2])}日`
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const pad = (n) => (n < 10 ? '0' + n : n)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
})
