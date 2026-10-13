const { cloud } = require('../../utils/cloud')

Page({
  data: {
    loggedIn: false,
    user: null,
    categories: ['数码', '美妆', '服饰', '食品', '其他'],
    categoryIndex: -1,
    title: '',
    description: '',
    budget: '',
    submitting: false
  },

  onShow() {
    this.checkLogin()
  },

  async checkLogin() {
    try {
      const { data: session, error } = await cloud.auth.getSession()
      if (error || !session) {
        this.setData({ loggedIn: false, user: null })
        return
      }
      this.setData({ loggedIn: true, user: session.user })
    } catch (err) {
      this.setData({ loggedIn: false, user: null })
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
          wx.showToast({ title: '登录成功', icon: 'success' })
        } catch (err) {
          console.error('[wish-list] login failed', JSON.stringify({
            stage: 'wechat-login-handler',
            message: err instanceof Error ? err.message : '微信登录失败，请重试'
          }))
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        }
      },
      fail(err) {
        console.error('[wish-list] wx.login failed', JSON.stringify({
          stage: 'wx.login',
          message: err.errMsg
        }))
        wx.showToast({ title: '微信登录失败', icon: 'none' })
      }
    })
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  onBudgetInput(e) {
    this.setData({ budget: e.detail.value })
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) })
  },

  async onSubmit() {
    if (this.data.submitting) return

    const title = this.data.title.trim()
    if (!title) {
      wx.showToast({ title: '请填写心愿标题', icon: 'none' })
      return
    }

    const category = this.data.categoryIndex >= 0
      ? this.data.categories[this.data.categoryIndex]
      : '其他'

    this.setData({ submitting: true })
    try {
      const { data, error } = await cloud.database
        .from('wishes')
        .insert({
          title,
          description: this.data.description.trim() || null,
          category,
          budget: this.data.budget.trim() || null,
          owner_name: this.data.user && this.data.user.nickname
            ? this.data.user.nickname
            : (this.data.user && this.data.user.email ? this.data.user.email : null)
        })
        .select()

      if (error) throw error

      wx.showToast({ title: '发布成功', icon: 'success' })
      this.setData({
        title: '',
        description: '',
        budget: '',
        categoryIndex: -1,
        submitting: false
      })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1200)
    } catch (err) {
      console.error('[wish-list] publish failed', err)
      this.setData({ submitting: false })
      const msg = err && err.code === '42501'
        ? '请先登录后再发布'
        : '发布失败，请重试'
      wx.showToast({ title: msg, icon: 'none' })
    }
  }
})
