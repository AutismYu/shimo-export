/// <reference path = "header.ts" />
/// <reference path = "interfaces.ts" />

// 把石墨文档的链接转换为信息，这只处理链接字符串，返回的name默认是空的
function URL2ShimoItem(url: string): ShimoItem | null {
    const reg = new RegExp("(folder|docs|sheets|mindmaps|forms|boards|docx|presentation)/([a-z|A-Z|0-9]+)", "gim")
    let rs = reg.exec(url)
    if (rs == null) {
        WriteLog("无法解析链接：" + url)
        return null
    }
    let id = rs[2]
    let tp = ShimoItemType[rs[1] as keyof typeof ShimoItemType]
    let t: ShimoItem = {
        type: tp,
        name: "",
        id: id,
        path: []
    }
    return t
}

// 日志输出面板
let logPanel = document.createElement("div")
logPanel.style.width = "400px"
logPanel.style.height = "600px"
logPanel.style.position = "fixed"
logPanel.style.backgroundColor = "black"
logPanel.style.right = "100px"
logPanel.style.padding = "10px"
logPanel.style.color = "white"
logPanel.style.display = "none"
logPanel.style.zIndex = "99999"
logPanel.style.wordWrap = "anywhere"
logPanel.style.overflow = "auto"
document.body.insertBefore(logPanel, document.body.firstChild)
let logHistory = ""

function WriteLog(str: string) {
    let now = new Date
    str = now.toLocaleTimeString() + " | " + str
    console.log(str)
    str += "\n"
    logHistory += str
    logPanel.style.display = "block"
    logPanel.innerText += str
    logPanel.scrollBy(0, logPanel.scrollHeight)
}

// 复制数组
function CloneArray<T>(a: Array<T>): Array<T> {
    return [...a]
}

// 组件路径的字符串
function BuildFolderPathName(t: ShimoItem, addOwn: boolean): string {
    let pathname = ""
    t.path.forEach(function (v) {
        if (pathname.length > 0) {
            pathname += "/"
        }
        pathname += v
    })
    if (addOwn) {
        if (pathname.length > 0) {
            pathname += "/"
        }
        pathname += t.name
    }
    return pathname
}

// 下载一个base64的文件
function DownloadData(filename: string, content: string) {
    var c = document.createElement('a')
    let s = 'data:application/zip;base64,'
    s += content
    c.href = s
    c.download = filename
    c.style.display = 'none'
    document.body.appendChild(c)
    c.click()
    c.remove()
}

function Sleep(ms: number): Promise<void> {
    let t = new Promise<void>(function (resolve: (value: void) => void, reject: (reason?: any) => void) {
        setTimeout(function () {
            resolve()
        }, ms)
    })
    return t
}