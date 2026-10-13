const { cloud } = require('../../utils/cloud')

Page({
  data: {
    id: null,
    isEdit: false,
    content: '',
    mood: '',
    moods: ['😀 开心', '🙂 平静', '😔 难过', '😤 生气', '😴 疲惫', '🤩 兴奋'],
    moodIndex: -1,
    dateText: '',
    dateValue: '',
    dateOptions: [],
    dateIndex: 0,
    saving: false
  },

  onLoad(options) {
    this.buildDateOptions()
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑日记' })
      this.loadDiary(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '写日记' })
      // 默认选中今天
      this.setData({
        dateValue: this.data.dateOptions[0].value,
        dateText: this.data.dateOptions[0].label,
        dateIndex: 0
      })
    }
  },

  // 生成最近 7 天的日期选项
  buildDateOptions() {
    const week = ['日', '一', '二', '三', '四', '五', '六']
    const pad = (n) => (n < 10 ? '0' + n : n)
    const options = []
    const today = new Date()

    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() - i * 86400000)
      const value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const label = `${d.getMonth() + 1}月${d.getDate()}日 星期${week[d.getDay()]}`
      // 标记今天/昨天
      let prefix = ''
      if (i === 0) prefix = '今天 · '
      else if (i === 1) prefix = '昨天 · '
      options.push({ value, label, display: prefix + label })
    }
    this.setData({ dateOptions: options })
  },

  async loadDiary(id) {
    try {
      const { data, error } = await cloud.database
        .from('diaries')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error

      const moodIndex = this.data.moods.indexOf(data.mood)

      // 确定日记日期：优先用 diary_date，其次用 created_at
      let dateValue = data.diary_date
      let dateIndex = 0
      if (!dateValue && data.created_at) {
        const d = new Date(data.created_at)
        const pad = (n) => (n < 10 ? '0' + n : n)
        dateValue = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      }
      const idx = this.data.dateOptions.findIndex((o) => o.value === dateValue)
      if (idx >= 0) dateIndex = idx

      this.setData({
        content: data.content,
        mood: data.mood || '',
        moodIndex: moodIndex >= 0 ? moodIndex : -1,
        dateValue: dateValue || '',
        dateIndex: dateIndex,
        dateText: this.data.dateOptions[dateIndex]
          ? this.data.dateOptions[dateIndex].display
          : this.formatDateText(dateValue)
      })
    } catch (err) {
      console.error('[diary] load one failed', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onMoodChange(e) {
    const index = Number(e.detail.value)
    this.setData({
      moodIndex: index,
      mood: this.data.moods[index]
    })
  },

  onDateChange(e) {
    const index = Number(e.detail.value)
    const opt = this.data.dateOptions[index]
    this.setData({
      dateIndex: index,
      dateValue: opt.value,
      dateText: opt.display
    })
  },

  async onSave() {
    if (this.data.saving) return

    const content = this.data.content.trim()
    if (!content) {
      wx.showToast({ title: '写点什么吧', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    try {
      const diaryDate = this.data.dateValue

      if (this.data.isEdit) {
        const { data, error } = await cloud.database
          .from('diaries')
          .update({
            content,
            mood: this.data.mood || null,
            diary_date: diaryDate
          })
          .eq('id', this.data.id)
          .select()
        if (error) throw error
        if (!data || data.length === 0) {
          wx.showToast({ title: '无权修改', icon: 'none' })
          this.setData({ saving: false })
          return
        }
      } else {
        const { data, error } = await cloud.database
          .from('diaries')
          .insert({
            content,
            mood: this.data.mood || null,
            diary_date: diaryDate
          })
          .select()
        if (error) throw error
      }

      wx.showToast({ title: '已保存', icon: 'success' })
      this.setData({ saving: false })
      setTimeout(() => {
        wx.navigateBack()
      }, 600)
    } catch (err) {
      console.error('[diary] save failed', err)
      this.setData({ saving: false })
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  },

  async onDelete() {
    if (!this.data.isEdit) return
    wx.showModal({
      title: '删除日记',
      content: '删除后不可恢复，确定删除吗？',
      confirmColor: '#ff6b6b',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const { data, error } = await cloud.database
            .from('diaries')
            .delete()
            .eq('id', this.data.id)
            .select()
          if (error) throw error
          if (!data || data.length === 0) {
            wx.showToast({ title: '无权删除', icon: 'none' })
            return
          }
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            wx.navigateBack()
          }, 600)
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  },

  formatDateText(value) {
    if (!value) return ''
    const d = new Date(value)
    const week = ['日', '一', '二', '三', '四', '五', '六']
    return `${d.getMonth() + 1}月${d.getDate()}日 星期${week[d.getDay()]}`
  }
})
