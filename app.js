const { cloud } = require('./utils/cloud')

App({
  globalData: {
    user: null
  },
  onLaunch() {
    // 启动时静默尝试恢复会话
    cloud.auth.getSession().then(({ data: session }) => {
      if (session && session.user) {
        this.globalData.user = session.user
      }
    }).catch(() => {
      // 未登录，保持匿名浏览
    })
  }
})
