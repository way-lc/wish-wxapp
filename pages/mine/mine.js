const { cloud } = require('../../utils/cloud')

Page({
  data: {
    loggedIn: false,
    user: null,
    myWishes: [],
    loading: false
  },

  onShow() {
    this.checkLogin()
  },

  async checkLogin() {
    try {
      const { data: session, error } = await cloud.auth.getSession()
      if (error || !session || !session.user) {
        this.setData({ loggedIn: false, user: null, myWishes: [] })
        return
      }
      this.setData({ loggedIn: true, user: session.user })
      this.loadMyWishes()
    } catch (err) {
      this.setData({ loggedIn: false, user: null, myWishes: [] })
    }
  },

  onLogin() {
    wx.login({
      success: async ({ code }) => {
        try {
          const appid = wx.getAccountInfoSync().miniProgram.appId
          const { data: session, error } = await cloud.auth.signInWithWechat(code, appid)
          if (error) {
            wx.showToast({ title: '登录失败，请重试', icon: 'none' })
            return
          }
          this.setData({ loggedIn: true, user: session.user })
          this.loadMyWishes()
          wx.showToast({ title: '登录成功', icon: 'success' })
        } catch (err) {
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        }
      },
      fail() {
        wx.showToast({ title: '微信登录失败', icon: 'none' })
      }
    })
  },

  async loadMyWishes() {
    this.setData({ loading: true })
    try {
      const { data, error } = await cloud.database
        .from('wishes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error

      // RLS 已保证只能看到公开数据，这里按 owner_id 过滤自己的
      const uid = this.data.user.id || this.data.user.uid
      const mine = (data || []).filter((w) => w.owner_id === uid)
      this.setData({ myWishes: mine, loading: false })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onWishTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  onGoPublish() {
    wx.switchTab({ url: '/pages/publish/publish' })
  },

  onDiaryTap() {
    wx.navigateTo({ url: '/pages/diary/diary' })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await cloud.auth.signOut()
        } catch (err) {
          // 忽略退出错误
        }
        this.setData({ loggedIn: false, user: null, myWishes: [] })
        wx.showToast({ title: '已退出', icon: 'success' })
      }
    })
  }
})
