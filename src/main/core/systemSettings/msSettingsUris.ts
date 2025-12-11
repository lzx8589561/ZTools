import type { SystemSetting } from './windowsSettings'

/**
 * 完整的 ms-settings URI 列表
 * 来源：
 * - https://learn.microsoft.com/en-us/windows/apps/develop/launch/launch-settings
 * - https://ss64.com/nt/syntax-settings.html
 */
export const MS_SETTINGS_URIS: Omit<SystemSetting, 'icon'>[] = [
  // === 主页 ===
  {
    name: '设置主页',
    uri: 'ms-settings:',
    category: '系统'
  },

  // === 系统（System）===
  {
    name: '屏幕显示',
    uri: 'ms-settings:display',
    category: '系统'
  },
  {
    name: '高级屏幕设置',
    uri: 'ms-settings:display-advanced',
    category: '系统'
  },
  {
    name: '显卡性能偏好',
    uri: 'ms-settings:display-advancedgraphics',
    category: '系统'
  },
  {
    name: '默认显卡设置',
    uri: 'ms-settings:display-advancedgraphics-default',
    category: '系统'
  },
  {
    name: '屏幕旋转方向',
    uri: 'ms-settings:screenrotation',
    category: '系统'
  },
  {
    name: '夜间护眼模式',
    uri: 'ms-settings:nightlight',
    category: '系统'
  },
  {
    name: '音频声音',
    uri: 'ms-settings:sound',
    category: '系统'
  },
  {
    name: '音频设备管理',
    uri: 'ms-settings:sound-devices',
    category: '系统'
  },
  {
    name: '麦克风输入属性',
    uri: 'ms-settings:sound-defaultinputproperties',
    category: '系统'
  },
  {
    name: '扬声器输出属性',
    uri: 'ms-settings:sound-defaultoutputproperties',
    category: '系统'
  },
  {
    name: '应用音量控制',
    uri: 'ms-settings:apps-volume',
    category: '系统'
  },
  {
    name: '系统通知',
    uri: 'ms-settings:notifications',
    category: '系统'
  },
  {
    name: '勿扰模式',
    uri: 'ms-settings:quiethours',
    category: '系统'
  },
  {
    name: '电源睡眠',
    uri: 'ms-settings:powersleep',
    category: '系统'
  },
  {
    name: '电池节能',
    uri: 'ms-settings:batterysaver',
    category: '系统'
  },
  {
    name: '电池节能配置',
    uri: 'ms-settings:batterysaver-settings',
    category: '系统'
  },
  {
    name: '电池用量详情',
    uri: 'ms-settings:batterysaver-usagedetails',
    category: '系统'
  },
  {
    name: '节能建议',
    uri: 'ms-settings:energyrecommendations',
    category: '系统'
  },
  {
    name: '磁盘存储',
    uri: 'ms-settings:storagesense',
    category: '系统'
  },
  {
    name: '存储感知自动清理',
    uri: 'ms-settings:storagepolicies',
    category: '系统'
  },
  {
    name: '清理存储建议',
    uri: 'ms-settings:storagerecommendations',
    category: '系统'
  },
  {
    name: '磁盘卷管理',
    uri: 'ms-settings:disksandvolumes',
    category: '系统'
  },
  {
    name: '文件默认保存位置',
    uri: 'ms-settings:savelocations',
    category: '系统'
  },
  {
    name: '窗口多任务',
    uri: 'ms-settings:multitasking',
    category: '系统'
  },
  {
    name: '无线投影接收',
    uri: 'ms-settings:project',
    category: '系统'
  },
  {
    name: '跨设备共享',
    uri: 'ms-settings:crossdevice',
    category: '系统'
  },
  {
    name: '任务栏设置',
    uri: 'ms-settings:taskbar',
    category: '系统'
  },
  {
    name: '剪贴板历史',
    uri: 'ms-settings:clipboard',
    category: '系统'
  },
  {
    name: '远程桌面连接',
    uri: 'ms-settings:remotedesktop',
    category: '系统'
  },
  {
    name: 'BitLocker 设备加密',
    uri: 'ms-settings:deviceencryption',
    category: '系统'
  },
  {
    name: '系统信息',
    uri: 'ms-settings:about',
    category: '系统'
  },
  {
    name: '人体存在感知',
    uri: 'ms-settings:presence',
    category: '系统'
  },

  // === 设备（Devices）===
  {
    name: '蓝牙设备',
    uri: 'ms-settings:bluetooth',
    category: '设备'
  },
  {
    name: '已连接设备',
    uri: 'ms-settings:connecteddevices',
    category: '设备'
  },
  {
    name: '设备自动发现',
    uri: 'ms-settings-connectabledevices:devicediscovery',
    category: '设备'
  },
  {
    name: '打印机扫描仪',
    uri: 'ms-settings:printers',
    category: '设备'
  },
  {
    name: '鼠标触摸板',
    uri: 'ms-settings:mousetouchpad',
    category: '设备'
  },
  {
    name: '触摸屏',
    uri: 'ms-settings:devices-touch',
    category: '设备'
  },
  {
    name: '笔记本触摸板',
    uri: 'ms-settings:devices-touchpad',
    category: '设备'
  },
  {
    name: '手写笔 Ink',
    uri: 'ms-settings:pen',
    category: '设备'
  },
  {
    name: '移动设备自动播放',
    uri: 'ms-settings:autoplay',
    category: '设备'
  },
  {
    name: 'USB 设备',
    uri: 'ms-settings:usb',
    category: '设备'
  },
  {
    name: '摄像头',
    uri: 'ms-settings:camera',
    category: '设备'
  },

  // === 网络和Internet（Network）===
  {
    name: '网络和互联网',
    uri: 'ms-settings:network',
    category: '网络'
  },
  {
    name: '网络连接状态',
    uri: 'ms-settings:network-status',
    category: '网络'
  },
  {
    name: 'Wi-Fi 无线网络',
    uri: 'ms-settings:network-wifi',
    category: '网络'
  },
  {
    name: 'Wi-Fi 高级设置',
    uri: 'ms-settings:network-wifisettings',
    category: '网络'
  },
  {
    name: '以太网有线网络',
    uri: 'ms-settings:network-ethernet',
    category: '网络'
  },
  {
    name: 'VPN 虚拟专用网',
    uri: 'ms-settings:network-vpn',
    category: '网络'
  },
  {
    name: '网络代理',
    uri: 'ms-settings:network-proxy',
    category: '网络'
  },
  {
    name: '拨号连接',
    uri: 'ms-settings:network-dialup',
    category: '网络'
  },
  {
    name: '飞行模式开关',
    uri: 'ms-settings:network-airplanemode',
    category: '网络'
  },
  {
    name: '移动热点共享',
    uri: 'ms-settings:network-mobilehotspot',
    category: '网络'
  },
  {
    name: '流量使用统计',
    uri: 'ms-settings:datausage',
    category: '网络'
  },

  // === 个性化（Personalization）===
  {
    name: '个性化设置',
    uri: 'ms-settings:personalization',
    category: '个性化'
  },
  {
    name: '桌面背景壁纸',
    uri: 'ms-settings:personalization-background',
    category: '个性化'
  },
  {
    name: '主题颜色',
    uri: 'ms-settings:personalization-colors',
    category: '个性化'
  },
  {
    name: '锁屏界面',
    uri: 'ms-settings:lockscreen',
    category: '个性化'
  },
  {
    name: '主题包',
    uri: 'ms-settings:themes',
    category: '个性化'
  },
  {
    name: '系统字体',
    uri: 'ms-settings:fonts',
    category: '个性化'
  },
  {
    name: '开始菜单布局',
    uri: 'ms-settings:personalization-start',
    category: '个性化'
  },
  {
    name: '虚拟触摸键盘',
    uri: 'ms-settings:personalization-touchkeyboard',
    category: '个性化'
  },
  {
    name: '输入文本建议',
    uri: 'ms-settings:devicestyping-hwkbtextsuggestions',
    category: '个性化'
  },
  {
    name: '快速控制中心',
    uri: 'ms-settings:controlcenter',
    category: '个性化'
  },

  // === 应用（Apps）===
  {
    name: '已安装应用',
    uri: 'ms-settings:appsfeatures',
    category: '应用'
  },
  {
    name: '默认程序',
    uri: 'ms-settings:defaultapps',
    category: '应用'
  },
  {
    name: '网站关联应用',
    uri: 'ms-settings:appsforwebsites',
    category: '应用'
  },
  {
    name: '离线地图管理',
    uri: 'ms-settings:maps',
    category: '应用'
  },
  {
    name: '地图下载',
    uri: 'ms-settings:maps-downloadmaps',
    category: '应用'
  },
  {
    name: '视频播放器',
    uri: 'ms-settings:videoplayback',
    category: '应用'
  },
  {
    name: '开机自启动',
    uri: 'ms-settings:startupapps',
    category: '应用'
  },
  {
    name: 'Windows 可选功能',
    uri: 'ms-settings:optionalfeatures',
    category: '应用'
  },

  // === 账户（Accounts）===
  {
    name: '账户信息',
    uri: 'ms-settings:yourinfo',
    category: '账户'
  },
  {
    name: '邮箱账户',
    uri: 'ms-settings:emailandaccounts',
    category: '账户'
  },
  {
    name: '登录方式',
    uri: 'ms-settings:signinoptions',
    category: '账户'
  },
  {
    name: '动态锁屏',
    uri: 'ms-settings:signinoptions-dynamiclock',
    category: '账户'
  },
  {
    name: 'Hello 面部识别',
    uri: 'ms-settings:signinoptions-launchfaceenrollment',
    category: '账户'
  },
  {
    name: 'Hello 指纹识别',
    uri: 'ms-settings:signinoptions-launchfingerprintenrollment',
    category: '账户'
  },
  {
    name: '硬件安全密钥',
    uri: 'ms-settings:signinoptions-launchsecuritykeyenrollment',
    category: '账户'
  },
  {
    name: '工作学校账户',
    uri: 'ms-settings:workplace',
    category: '账户'
  },
  {
    name: '家庭其他用户',
    uri: 'ms-settings:otherusers',
    category: '账户'
  },
  {
    name: '账户同步',
    uri: 'ms-settings:sync',
    category: '账户'
  },

  // === 时间和语言（Time & Language）===
  {
    name: '日期时间',
    uri: 'ms-settings:dateandtime',
    category: '时间'
  },
  {
    name: '语言区域',
    uri: 'ms-settings:regionlanguage',
    category: '语言'
  },
  {
    name: '区域格式化',
    uri: 'ms-settings:regionformatting',
    category: '语言'
  },
  {
    name: '键盘布局',
    uri: 'ms-settings:keyboard',
    category: '语言'
  },
  {
    name: '高级键盘',
    uri: 'ms-settings:keyboard-advanced',
    category: '语言'
  },
  {
    name: '打字输入',
    uri: 'ms-settings:typing',
    category: '语言'
  },
  {
    name: '语音识别',
    uri: 'ms-settings:speech',
    category: '语言'
  },
  {
    name: '日文输入法 IME',
    uri: 'ms-settings:regionlanguage-jpnime',
    category: '语言'
  },
  {
    name: '中文拼音 IME',
    uri: 'ms-settings:regionlanguage-chsime-pinyin',
    category: '语言'
  },
  {
    name: '五笔 IME',
    uri: 'ms-settings:regionlanguage-chsime-wubi',
    category: '语言'
  },

  // === 游戏（Gaming）===
  {
    name: 'Xbox 游戏工具栏',
    uri: 'ms-settings:gaming-gamebar',
    category: '游戏'
  },
  {
    name: '游戏录制截图',
    uri: 'ms-settings:gaming-gamedvr',
    category: '游戏'
  },
  {
    name: '游戏性能模式',
    uri: 'ms-settings:gaming-gamemode',
    category: '游戏'
  },
  {
    name: 'Xbox 联机网络',
    uri: 'ms-settings:gaming-xboxnetworking',
    category: '游戏'
  },

  // === 轻松访问（Ease of Access）===
  {
    name: '辅助功能',
    uri: 'ms-settings:easeofaccess',
    category: '轻松访问'
  },
  {
    name: '辅助显示缩放',
    uri: 'ms-settings:easeofaccess-display',
    category: '轻松访问'
  },
  {
    name: '辅助鼠标指针',
    uri: 'ms-settings:easeofaccess-mouse',
    category: '轻松访问'
  },
  {
    name: '屏幕放大镜',
    uri: 'ms-settings:easeofaccess-magnifier',
    category: '轻松访问'
  },
  {
    name: '辅助颜色滤镜',
    uri: 'ms-settings:easeofaccess-colorfilter',
    category: '轻松访问'
  },
  {
    name: '高对比度主题',
    uri: 'ms-settings:easeofaccess-highcontrast',
    category: '轻松访问'
  },
  {
    name: '屏幕讲述人',
    uri: 'ms-settings:easeofaccess-narrator',
    category: '轻松访问'
  },
  {
    name: '辅助音频',
    uri: 'ms-settings:easeofaccess-audio',
    category: '轻松访问'
  },
  {
    name: '视频隐藏字幕',
    uri: 'ms-settings:easeofaccess-closedcaptioning',
    category: '轻松访问'
  },
  {
    name: '辅助语音',
    uri: 'ms-settings:easeofaccess-speech',
    category: '轻松访问'
  },
  {
    name: '辅助键盘',
    uri: 'ms-settings:easeofaccess-keyboard',
    category: '轻松访问'
  },
  {
    name: '眼球追踪控制',
    uri: 'ms-settings:easeofaccess-eyecontrol',
    category: '轻松访问'
  },
  {
    name: '输入光标样式',
    uri: 'ms-settings:easeofaccess-cursor',
    category: '轻松访问'
  },
  {
    name: '辅助视觉效果',
    uri: 'ms-settings:easeofaccess-visualeffects',
    category: '轻松访问'
  },

  // === 隐私和安全（Privacy）===
  {
    name: '隐私设置',
    uri: 'ms-settings:privacy',
    category: '隐私'
  },
  {
    name: '隐私常规设置',
    uri: 'ms-settings:privacy-general',
    category: '隐私'
  },
  {
    name: '隐私语音识别',
    uri: 'ms-settings:privacy-speech',
    category: '隐私'
  },
  {
    name: '手写键入个性化',
    uri: 'ms-settings:privacy-speechtyping',
    category: '隐私'
  },
  {
    name: '诊断数据反馈',
    uri: 'ms-settings:privacy-feedback',
    category: '隐私'
  },
  {
    name: '活动历史',
    uri: 'ms-settings:privacy-activityhistory',
    category: '隐私'
  },
  {
    name: '位置定位权限',
    uri: 'ms-settings:privacy-location',
    category: '隐私'
  },
  {
    name: '相机摄像头权限',
    uri: 'ms-settings:privacy-webcam',
    category: '隐私'
  },
  {
    name: '麦克风录音权限',
    uri: 'ms-settings:privacy-microphone',
    category: '隐私'
  },
  {
    name: '语音唤醒',
    uri: 'ms-settings:privacy-voiceactivation',
    category: '隐私'
  },
  {
    name: '通知访问权限',
    uri: 'ms-settings:privacy-notifications',
    category: '隐私'
  },
  {
    name: '账户信息权限',
    uri: 'ms-settings:privacy-accountinfo',
    category: '隐私'
  },
  {
    name: '联系人访问',
    uri: 'ms-settings:privacy-contacts',
    category: '隐私'
  },
  {
    name: '日历访问',
    uri: 'ms-settings:privacy-calendar',
    category: '隐私'
  },
  {
    name: '电话通话权限',
    uri: 'ms-settings:privacy-phonecalls',
    category: '隐私'
  },
  {
    name: '通话记录访问',
    uri: 'ms-settings:privacy-callhistory',
    category: '隐私'
  },
  {
    name: '邮件访问',
    uri: 'ms-settings:privacy-email',
    category: '隐私'
  },
  {
    name: '任务访问',
    uri: 'ms-settings:privacy-tasks',
    category: '隐私'
  },
  {
    name: '消息短信权限',
    uri: 'ms-settings:privacy-messaging',
    category: '隐私'
  },
  {
    name: '无线电设备控制',
    uri: 'ms-settings:privacy-radios',
    category: '隐私'
  },
  {
    name: '其他设备同步',
    uri: 'ms-settings:privacy-customdevices',
    category: '隐私'
  },
  {
    name: '后台应用权限',
    uri: 'ms-settings:privacy-backgroundapps',
    category: '隐私'
  },
  {
    name: '应用诊断信息',
    uri: 'ms-settings:privacy-appdiagnostics',
    category: '隐私'
  },
  {
    name: '自动下载文件',
    uri: 'ms-settings:privacy-automaticfiledownloads',
    category: '隐私'
  },
  {
    name: '文档库访问',
    uri: 'ms-settings:privacy-documents',
    category: '隐私'
  },
  {
    name: '图片库访问',
    uri: 'ms-settings:privacy-pictures',
    category: '隐私'
  },
  {
    name: '视频库访问',
    uri: 'ms-settings:privacy-videos',
    category: '隐私'
  },
  {
    name: '完整文件系统',
    uri: 'ms-settings:privacy-broadfilesystemaccess',
    category: '隐私'
  },
  {
    name: '下载文件夹访问',
    uri: 'ms-settings:privacy-downloadsfolder',
    category: '隐私'
  },
  {
    name: '音乐库访问',
    uri: 'ms-settings:privacy-musiclibrary',
    category: '隐私'
  },

  // === 更新和安全（Update & Security）===
  {
    name: '系统更新',
    uri: 'ms-settings:windowsupdate',
    category: '更新'
  },
  {
    name: '立即检查更新',
    uri: 'ms-settings:windowsupdate-action',
    category: '更新'
  },
  {
    name: '更新活动时间',
    uri: 'ms-settings:windowsupdate-activehours',
    category: '更新'
  },
  {
    name: '更新历史',
    uri: 'ms-settings:windowsupdate-history',
    category: '更新'
  },
  {
    name: '可选更新补丁',
    uri: 'ms-settings:windowsupdate-optionalupdates',
    category: '更新'
  },
  {
    name: '更新高级选项',
    uri: 'ms-settings:windowsupdate-options',
    category: '更新'
  },
  {
    name: '更新重启计划',
    uri: 'ms-settings:windowsupdate-restartoptions',
    category: '更新'
  },
  {
    name: '按需更新搜索',
    uri: 'ms-settings:windowsupdate-seekerondemand',
    category: '更新'
  },
  {
    name: '更新传递优化',
    uri: 'ms-settings:delivery-optimization',
    category: '更新'
  },
  {
    name: 'Defender 安全中心',
    uri: 'ms-settings:windowsdefender',
    category: '安全'
  },
  {
    name: '系统疑难解答',
    uri: 'ms-settings:troubleshoot',
    category: '系统'
  },
  {
    name: '系统恢复重置',
    uri: 'ms-settings:recovery',
    category: '系统'
  },
  {
    name: 'Windows 激活',
    uri: 'ms-settings:activation',
    category: '系统'
  },
  {
    name: '查找设备定位',
    uri: 'ms-settings:findmydevice',
    category: '安全'
  },
  {
    name: '开发者模式',
    uri: 'ms-settings:developers',
    category: '系统'
  },

  // === 搜索（Search）===
  {
    name: '搜索索引',
    uri: 'ms-settings:search',
    category: '搜索'
  },
  {
    name: '搜索权限设置',
    uri: 'ms-settings:search-permissions',
    category: '搜索'
  },
  {
    name: '搜索详细设置',
    uri: 'ms-settings:search-moredetails',
    category: '搜索'
  }
]
