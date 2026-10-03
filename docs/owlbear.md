# Owlbear 扩展

远征手记按照 Owlbear 的官方扩展结构提供 `manifest.json`。清单定义名称、图标和弹出页，界面与共享服务由远征网站提供。用户添加的是完整安装链接，不需要下载或上传 JSON 文件。

## 安装与使用

1. 运行远征网站；在名册里创建共享版本，复制共享子项旁的邀请链接。设置 → Owlbear 扩展可以复制当前网站的安装链接。
2. 主持人进入 Owlbear 房间，打开 Extras → Extensions → Add Custom Extension。
3. 在 Install Link 填入 `https://你的远征网站/manifest.json`，点 Add。按房间界面启用扩展。
4. 从房间的“远征手记”入口打开小页，粘贴同一网站的共享邀请，点“绑定远征”。
5. 房间里的同伴点“翻开手记”，打开完整双页书；“返回枭熊”会先保存当前日记草稿，再收起书页。

绑定、更换和解除由房间 GM 操作。解除只移除该房间的关联，手记、图片与物品保留在原远征服务。换场景也不依赖场景内容保存长期记录。

## 本机调试与上线

本轮实际安装表单可读取 localhost 地址；填写数值别名 127.0.0.1 时添加按钮未启用。因此，本机安装链接为 `http://localhost:4173/manifest.json`。Owlbear 官方开发教程采用本机开发地址；不同浏览器仍可能限制 HTTPS 页面嵌入本机 HTTP 内容。若出现浏览器安全提示，需要使用正常的开发环境或正式 HTTPS 地址，不能关闭浏览器安全保护。

127.0.0.1 指向每个使用者自己的电脑，本机安装只能调试，不能让远处的玩家连接此电脑。正式团用需要一个所有人能访问的同源 HTTPS 地址，同时运行共享 API、事件连接和持久化图片存储。当前按项目决定先完成共享与接入，托管地址之后选择。

### GitHub 与枭熊分别能保存什么

[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) 是静态网页托管，可发布界面、插画、脚本与安装清单；不能运行本项目的 Node 共享服务。若拆分为 Pages 前端与另一处共享服务，需要调整项目路径、API 地址、事件连接及受限跨域配置，当前版本尚未实施这种部署。GitHub 仓库保存源码，不作为玩家实时写入的团录数据库。

[Owlbear Room API](https://docs.owlbear.rodeo/extensions/apis/room/) 的房间元数据总量须小于 16 kB，适合保存本项目的绑定信息。这个限制不代表枭熊全部图片存储的容量；[Assets API](https://docs.owlbear.rodeo/extensions/apis/assets/) 另提供用户选择与上传图片的界面。完全依赖枭熊保存远征需重新设计场景数据、并发更新、媒体引用及离开枭熊后的读取方式，当前版本不作这种承诺。

## 接入范围

- 已提供：安装清单、带彩饰的弹出页、读取当前房间角色、共享邀请校验、房间绑定、全屏书页、返回房间、浏览器打开、更换与解除关联。
- 房间元数据键为 `com.enzo.expedition-journal/room`；保存版本、网站来源、共享房间 ID、邀请凭据和显示名称，远小于官方元数据限制。绑定时验证邀请属于当前网站并可读取，再写入房间元数据，不会把完整远征塞入 Owlbear。
- 持有房间绑定邀请的玩家是该远征的共同编辑者。Owlbear 的 GM 身份只控制扩展的绑定操作，当前独立服务仍采用邀请制；SDK 的玩家 ID 不能直接充当独立账户登录凭据。
- 后续：Owlbear 场景地图导入、地图地点与场景坐标的关联入口、账户及成员权限。当前手记里的地图依旧是独立远征地图，不宣称已有双向场景同步。

## 开发与检查

官方 SDK 已固定版本并打包到 `dist/vendor/obr-sdk.js`，扩展运行不依赖外部脚本 CDN。`npm ci` 后执行 `npm run build:owlbear` 可以重新生成打包文件和许可清单。`npm test` 覆盖邀请来源、GM 校验、绑定改变后的旧提交、失效邀请、弹出接口及 HTTP 安装资源。

完整书页通过静态模块依赖预先加载 SDK，使消息订阅早于 iframe 的 load 事件。不要改回页面启动后的动态加载，否则缓存重开可能错过 OBR_READY，导致返回入口无法出现。

`manifest.json` 和图标可被跨域读取；共享 API 继续要求 Bearer 凭据。网页允许 Owlbear 的正式域名嵌入，未设置任意域名均可嵌入。

参考：[安装指南](https://extensions.owlbear.rodeo/guide)、[Manifest](https://docs.owlbear.rodeo/extensions/reference/manifest/)、[Room API](https://docs.owlbear.rodeo/extensions/apis/room/)、[Modal API](https://docs.owlbear.rodeo/extensions/apis/modal/)。实际界面验收状态记录在 [testing.md](testing.md)。
