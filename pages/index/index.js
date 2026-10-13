const { cloud } = require('../../utils/cloud')

Page({
  data: {
    wishes: [],
    loading: true,
    categories: ['全部', '数码', '美妆', '服饰', '食品', '其他'],
    activeCategory: '全部',
    keyword: ''
  },

  onLoad() {
    this.loadWishes()
  },

  onPullDownRefresh() {
    this.loadWishes(() => {
      wx.stopPullDownRefresh()
    })
  },

  onShow() {
    // 从发布页返回时刷新
    if (this.data.wishes.length > 0) {
      this.loadWishes()
    }
  },

  async loadWishes(done) {
    this.setData({ loading: true })
    try {
      let query = cloud.database
        .from('wishes')
        .select('*')
        .order('created_at', { ascending: false })

      if (this.data.activeCategory !== '全部') {
        query = query.eq('category', this.data.activeCategory)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error

      this.setData({ wishes: data || [], loading: false })
    } catch (err) {
      console.error('[wish-list] load wishes failed', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败，请下拉重试', icon: 'none' })
    }
    if (done) done()
  },

  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ activeCategory: category })
    this.loadWishes()
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    const keyword = this.data.keyword.trim()
    if (!keyword) {
      this.loadWishes()
      return
    }
    this.searchWishes(keyword)
  },

  async searchWishes(keyword) {
    this.setData({ loading: true })
    try {
      const { data, error } = await cloud.database
        .from('wishes')
        .select('*')
        .ilike('title', `%${keyword}%`)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      this.setData({ wishes: data || [], loading: false })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: '搜索失败', icon: 'none' })
    }
  },

  onWishTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})
