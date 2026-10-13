const { cloud } = require('../../utils/cloud')

Page({
  data: {
    wish: null,
    isOwner: false,
    loading: true,
    loadingOwner: false
  },

  onLoad(options) {
    this.wishId = options.id
    this.loadWish()
  },

  async loadWish() {
    this.setData({ loading: true })
    try {
      const { data, error } = await cloud.database
        .from('wishes')
        .select('*')
        .eq('id', this.wishId)
        .single()
      if (error) throw error

      this.setData({ wish: data, loading: false })
      this.checkOwnership(data)
    } catch (err) {
      console.error('[wish-list] load detail failed', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async checkOwnership(wish) {
    this.setData({ loadingOwner: true })
    try {
      const { data: session, error } = await cloud.auth.getSession()
      if (error || !session || !session.user) {
        this.setData({ isOwner: false, loadingOwner: false })
        return
      }
      // session.user 的 id 对应 auth.uid()
      const uid = session.user.id || session.user.uid
      this.setData({ isOwner: uid === wish.owner_id, loadingOwner: false })
    } catch (err) {
      this.setData({ isOwner: false, loadingOwner: false })
    }
  },

  async onMarkDone() {
    const wish = this.data.wish
    if (!wish) return

    wx.showModal({
      title: '确认实现',
      content: '确定将这条心愿标记为「已实现」吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const { data, error } = await cloud.database
            .from('wishes')
            .update({ status: 'done' })
            .eq('id', wish.id)
            .select()
          if (error) throw error

          if (!data || data.length === 0) {
            wx.showToast({ title: '无权操作此心愿', icon: 'none' })
            return
          }
          wx.showToast({ title: '已标记实现', icon: 'success' })
          this.loadWish()
        } catch (err) {
          wx.showToast({ title: '操作失败，请重试', icon: 'none' })
        }
      }
    })
  },

  async onDelete() {
    const wish = this.data.wish
    if (!wish) return

    wx.showModal({
      title: '删除心愿',
      content: '删除后不可恢复，确定删除吗？',
      confirmColor: '#ff6b6b',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const { data, error } = await cloud.database
            .from('wishes')
            .delete()
            .eq('id', wish.id)
            .select()
          if (error) throw error

          if (!data || data.length === 0) {
            wx.showToast({ title: '无权删除此心愿', icon: 'none' })
            return
          }
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            wx.switchTab({ url: '/pages/index/index' })
          }, 800)
        } catch (err) {
          wx.showToast({ title: '删除失败，请重试', icon: 'none' })
        }
      }
    })
  },

  formatDate(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const pad = (n) => (n < 10 ? '0' + n : n)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
})
