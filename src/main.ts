/// <reference path = "header.ts" />
/// <reference path = "scan&export.ts" />

//  文件夹的ID表
const FolderIDs = new Map<string, string>()

// 已经收集到的文件列表
const GotItems: ShimoItem[] = []

// 等待扫描的文件夹列表
const WaitingCollectFolderIDs: ShimoItem[] = []

let StartTime = 0

GM_registerMenuCommand("设置导出的格式", function () {
    if (StartTime > 123456) {
        alert("我已经启动过了！要调整导出格式，请刷新后重试。")
        return
    }
    OpenFormatMenu()
})

GM_registerMenuCommand("点我开始导出", function () {
    if (StartTime > 123456) {
        alert("我已经启动过了！请刷新本页面后再试！")
        return
    }
    let url = location.href
    if (url.includes("desktop")) {
        WaitingCollectFolderIDs.push({
            name: "起点", id: "", type: ShimoItemType.folder, path: []
        })
    } else {
        let fd = URL2ShimoItem(url)
        if (fd == null || fd.type != ShimoItemType.folder) {
            alert("对不起，请在桌面页面或者在文件夹页面使用我。")
            return
        }
        fd.name = "起点"
        WaitingCollectFolderIDs.push(fd)
    }
    fm.remove()
    WriteLog("这里是戈登走過去编写的石墨文档批量导出工具。希望可以帮助到你。祝愿你每天开心。少加班，多休息。\n QWQ")
    let now = new Date
    StartTime = now.getTime()
    WriteLog("今天是：" + now.toLocaleDateString())
    WriteLog("开始导出工作")
    WriteLog("扫描子文件夹和子文件中...")
    ScanFolders().then(function () {
        ExportItems()
    })
})

GM_registerMenuCommand("查看源码、反馈BUG", function () {
    GM_openInTab("https://github.com/gordonwalkedby/shimo-export", { active: true, insert: true })
})
