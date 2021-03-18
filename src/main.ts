/// <reference path = "header.ts" />
/// <reference path = "helpers.ts" />

let started = false

GM_registerMenuCommand("点我开始导出", function () {
    let tops = GetTopItems()
    if (tops == null) {
        return
    }
    if (started) {
        alert("抱歉，正在导出或者已经导出完毕，刷新本网页后才能再次导出。")
        return
    }
    started = true
    WriteLog("开始导出工作")
    tops.forEach(function (v) {
        if (v.type == ShimoItemType.folder) {
            WaitingCollectFolderIDs.push(v)
        } else {
            GotItems.push(v)
        }
    })
    let currentFolder = URL2ShimoItem(location.href)
    if (currentFolder != null) {
        FolderIDs.set("", currentFolder.id)
    }
    let len = WaitingCollectFolderIDs.length
    WriteLog("找到当前文件夹个数：" + len.toFixed())
    if (len > 0) {
        WriteLog("扫描子文件夹和子文件中...")
        let timerID = -88.88
        timerID = setInterval(function () {
            if (WaitingCollectFolderIDs.length > 0) {
                return
            }
            clearInterval(timerID)
            ExportItems()
        }, 1000)
    } else {
        ExportItems()
    }
})

// 获取当前页面可见的全部文件、文件夹
function GetTopItems(): ShimoItem[] | null {
    let items = document.getElementsByClassName("file-creator")
    if (items.length < 1) {
        alert("请先把当前页面设置为列表视图！也可能是因为这个文件夹是空的")
        throw "x"
    }
    items = document.getElementsByClassName("file-item")
    if (items.length > 0) {
        let array: ShimoItem[] = []
        for (let i = 0; i < items.length; i++) {
            let item = items.item(i) as HTMLAnchorElement
            let str = item.href
            let t = URL2ShimoItem(str)
            if (t != null) {
                let tt = item.getElementsByClassName("file-title")
                let div = tt.item(0) as HTMLDivElement
                t.name = div.innerText
                array.push(t)
            }
        }
        if (array.length > 0) {
            return array
        }
    }
    alert("无法在当前页面寻找到任何文件、文件夹！请重试。 ")
    throw "x"
}

let FolderIDs = new Map<string, string>()
let GotItems: ShimoItem[] = []
let WaitingCollectFolderIDs: ShimoItem[] = []

// 扫描子文件夹
setInterval(function () {
    if (WaitingCollectFolderIDs.length < 1) {
        return
    }
    let folder = WaitingCollectFolderIDs[0]
    let id = folder.id
    let pathname = BuildFolderPathName(folder, true)
    WriteLog("开始扫描文件夹：" + pathname)
    FolderIDs.set(pathname, id)
    WaitingCollectFolderIDs.splice(0, 1)
    GM_xmlhttpRequest({
        url: "https://shimo.im/lizard-api/files?collaboratorCount=true&folder=" + id,
        headers: {
            accept: "application/vnd.shimo.v2+json",
            Referer: "https://shimo.im/folder/" + id
        },
        timeout: 5000,
        method: "GET",
        onload: function () {
            if (this.status == 200) {
                try {
                    let array: ShimoFileObject[] = JSON.parse(this.responseText)
                    let path = CloneArray(folder.path)
                    path.push(folder.name)
                    array.forEach(function (v) {
                        let t = URL2ShimoItem(v.url)
                        if (t != null) {
                            t.name = v.name
                            t.path = CloneArray(path)
                            if (t.type == ShimoItemType.folder) {
                                WaitingCollectFolderIDs.push(t)
                                console.log(" fd", t)
                            } else {
                                GotItems.push(t)
                                console.log(" item", t)
                            }
                        }
                    })
                } catch (error) {
                    WriteLog("API返回JSON解析失败：" + error + "，id:" + id)
                }
            } else {
                WriteLog("检查子文件夹出错！返回" + this.status.toFixed() + "，id:" + id)
            }
        },
        ontimeout: function () {
            WriteLog("检查子文件夹超时！ id:" + id)
        },
        onerror: function () {
            WriteLog("检查子文件夹出错！信息：" + this.error + "，id:" + id)
        }
    })
}, 700)

// 导出所有已知的文件
function ExportItems() {
    WriteLog("扫描结束，统计信息：")
    let map = new Map<number, number>()
    GotItems.forEach(function (v) {
        let key = v.type
        if (!map.has(key)) {
            map.set(key, 1)
        } else {
            let olds = map.get(key) as number
            map.set(key, olds + 1)
        }
    })
    map.forEach(function (v, k) {
        let typeName = ShimoItemType[k] as keyof typeof ShimoItemType
        WriteLog(typeName + "：" + v)
    })
    WriteLog("下面开始下载要导出的文件")
    DownloadAll()
}

async function DownloadAll() {
    let zip = new JSZip
    let fails: string[] = []
    let len = GotItems.length
    for (let index = 0; index < len; index++) {
        let v = GotItems[index]
        let pathname = BuildFolderPathName(v, true)
        WriteLog("进度：" + (index / (len - 1) * 100).toFixed(1) + "% " + pathname)
        for (let retry = 0; retry < 3; retry++) {
            await Sleep(1900)
            try {
                let blob = await ExportItem(v, "docx")
                let zp = zip
                if (v.path.length > 0) {
                    v.path.forEach(function (fd) {
                        let zp2 = zip.folder(fd)
                        if (zp2 == null) {
                            WriteLog("异常！zip folder 出错！ " + fd)
                            throw fd
                        }
                        zp = zp2
                    })
                }
                zp.file(v.name + ".docx", blob)
                break
            } catch (error) {
                if (retry > 2) {
                    WriteLog("跳过：" + pathname)
                    fails.push(pathname)
                    retry = 0
                } else {
                    retry += 1
                    WriteLog("重试：" + retry.toFixed())
                }
            }
        }
    }
    let b64 = await zip.generateAsync({ type: "base64" })
    let dt = new Date
    WriteLog("导出工作结束，失败文件个数：" + fails.length)
    if (fails.length > 0) {
        let str = ""
        fails.forEach(function (v) {
            str += v + "\n"
        })
        WriteLog(str)
    }
    let DownloadZIP = function () {
        DownloadData(dt.getTime().toFixed() + ".zip", b64)
    }
    DownloadZIP()
    let but = document.createElement("button")
    but.innerText = "点我下载"
    but.style.padding = "5px"
    but.style.fontSize = "2em"
    but.style.position = "absolute"
    but.style.left = "3px"
    but.style.top = "3px"
    but.onclick = function () {
        DownloadZIP()
    }
    logPanel.appendChild(but)
    GM_notification({ text: "您的石墨文档导出已经完成！可以下载了！", title: "下载完成！", timeout: 0 })
}

// 下载一个石墨文件，返回 base64 字符串
function ExportItem(t: ShimoItem, format: string): Promise<Blob> {
    let url = "https://xxport.shimo.im/files/" + t.id + "/export?type=docx&file=" + t.id + "&returnJson=1&name=" + t.name
    console.log(url)
    let refr = BuildFolderPathName(t, false)
    if (FolderIDs.has(refr)) {
        refr = FolderIDs.get(refr) as string
        refr = "https://shimo.im/folder/" + refr
    } else {
        refr = "https://shimo.im/desktop"
    }
    let p = new Promise<Blob>(function (resolve: (value: Blob) => void, reject: (reason?: any) => void) {
        let downloads = function (u2: string) {
            console.log("去下载：", u2)
            var x = new XMLHttpRequest()
            x.open("GET", u2)
            x.timeout = 15000
            x.setRequestHeader("Accept", "*/*")
            x.responseType = "blob"
            x.onloadend = function () {
                if (this.status == 200) {
                    let obj: Blob = this.response
                    resolve(obj)
                } else {
                    WriteLog("下载异常：" + this.status.toFixed() + " " + this.responseText)
                    reject()
                }
            }
            x.send()
        }
        GM_xmlhttpRequest({
            url: url,
            headers: {
                Accept: "*/*",
                Referer: refr
            },
            timeout: 5000,
            onload: async function () {
                if (this.status == 200) {
                    try {
                        let info: ShimoExportResult = JSON.parse(this.responseText)
                        let u = info.redirectUrl
                        if (u.length > 15) {
                            downloads(u)
                        }
                    } catch (error) {
                        WriteLog("API返回JSON解析失败：" + error)
                        reject()
                    }
                } else {
                    let str = this.responseText
                    WriteLog("返回异常：" + this.status.toFixed() + " " + str)
                    const reg = new RegExp("([0-9]+) seconds", "gim")
                    let rs = reg.exec(str)
                    if (rs != null) {
                        let num = parseFloat(rs[1]) + 1
                        WriteLog("石墨限制，等待 " + num.toFixed() + " 秒")
                        await Sleep(num * 1000)
                    }
                    reject()
                }
            },
            onerror: function () {
                WriteLog("返回出错：" + this.error)
                reject()
            },
            ontimeout: function () {
                WriteLog("返回超时！")
                reject()
            }
        })
    })
    return p
}

