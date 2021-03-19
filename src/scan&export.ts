/// <reference path = "header.ts" />
/// <reference path = "helpers.ts" />

const fails: string[] = []

// 扫描全部的文件夹
async function ScanFolders(): Promise<void> {
    while (WaitingCollectFolderIDs.length > 0) {
        let fd = WaitingCollectFolderIDs[0]
        let name = BuildFolderPathName(fd, true)
        WriteLog("开始扫描文件夹：" + name)
        let ok = false
        for (let retry = 0; retry < 4; retry++) {
            if (retry > 0) {
                WriteLog("重试：" + retry)
            }
            await Sleep(1000)
            try {
                await ScanFolder(fd)
                ok = true
                if (retry > 0) {
                    WriteLog("重试成功：" + name)
                }
                break
            } catch (error) {
            }
        }
        if (!ok) {
            fails.push(name)
            WriteLog("放弃文件夹扫描：" + name)
        }
        WaitingCollectFolderIDs.splice(0, 1)
    }
}

// 扫描单个文件夹
async function ScanFolder(folder: ShimoItem): Promise<void> {
    let id = folder.id
    let pathname = BuildFolderPathName(folder, true)
    FolderIDs.set(pathname, id)
    let p = new Promise<void>(function (resolve: (value: void) => void, reject: (reason?: any) => void) {
        GM_xmlhttpRequest({
            url: "https://shimo.im/lizard-api/files?collaboratorCount=true&folder=" + id,
            headers: {
                accept: "application/vnd.shimo.v2+json",
                Referer: "https://shimo.im/folder/" + id
            },
            timeout: 5000,
            method: "GET",
            onload: function (rep) {
                if (rep.status == 200) {
                    try {
                        let array: ShimoFileObject[] = JSON.parse(rep.responseText)
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
                                resolve()
                            }
                        })
                    } catch (error) {
                        WriteLog("API返回JSON解析失败：" + error + "，id:" + id)
                        reject()
                    }
                } else {
                    WriteLog("检查子文件夹出错！返回" + rep.status.toFixed() + "，id:" + id)
                    reject()
                }
            },
            ontimeout: function () {
                WriteLog("检查子文件夹超时！ id:" + id)
                reject()
            },
            onerror: function (rep) {
                WriteLog("检查子文件夹出错！信息：" + rep.error + "，id:" + id)
                reject()
            }
        })
    })
    return p
}

// 导出所有已知的文件
async function ExportItems(): Promise<void> {
    WriteLog("扫描结束，统计信息：")
    let len = GotItems.length
    WriteLog("总文件数量：" + len.toFixed())
    if (len > 6) {
        let guessTime = (len) / 6 * 60 + 60
        let dd = new Date
        dd.setSeconds(dd.getSeconds() + guessTime)
        WriteLog("石墨文档有速度限制，1分钟最多只能导出6个文件，相当于10秒一个，所以说预计完成导出时间是：" + dd.toLocaleString())
    }
    let map = new Map<ShimoItemType, number>()
    let goodCount = 0
    GotItems.forEach(function (v) {
        let key = v.type
        if (!map.has(key)) {
            map.set(key, 1)
        } else {
            let olds = map.get(key) as number
            map.set(key, olds + 1)
        }
        if (GetFormatByType(key) != null) {
            goodCount += 1
        }
    })
    WriteLog("实际可导出文件数量：" + goodCount.toFixed())
    map.forEach(function (v, k) {
        let typeName = ShimoItemTypeNames.get(k) || "未知格式："
        WriteLog(typeName + "：" + v)
    })
    WriteLog("下面开始下载要导出的文件")
    let zip = new JSZip
   
    for (let index = 0; index < len; index++) {
        let v = GotItems[index]
        let pathname = BuildFolderPathName(v, true)
        let format = GetFormatByType(v.type)
        if (format == null) {
            console.log("无法导出，跳过：", pathname)
            continue
        }
        WriteLog("进度：" + (index / len * 100).toFixed(1) + "% " + pathname + "." + format)
        let ok = false
        for (let retry = 0; retry < 4; retry++) {
            if (retry > 0) {
                WriteLog("重试：" + retry.toFixed())
            }
            await Sleep(3000)
            try {
                let blob = await ExportItem(v, format)
                let zp = zip
                if (v.path.length > 0) {
                    v.path.forEach(function (fd) {
                        fd = fd.trim()
                        if (fd.length < 1) {
                            fd = "unNamed_" + Math.random().toString()
                        }
                        let zp2 = zp.folder(fd)
                        if (zp2 == null) {
                            WriteLog("异常！zip folder 出错！ " + fd)
                            throw fd
                        }
                        zp = zp2
                    })
                }
                zp.file(v.name + "." + format, blob)
                ok = true
                if (retry > 0) {
                    WriteLog("重试成功：" + pathname)
                }
                break
            } catch (error) {

            }
        }
        if (!ok) {
            WriteLog("失败，跳过：" + pathname)
            fails.push(pathname)
        }
    }
    WriteLog("导出工作结束，失败数：" + fails.length)
    if (fails.length > 0) {
        let str = ""
        fails.forEach(function (v) {
            str += v + "\n"
        })
        WriteLog(str)
    }
    let dt = new Date
    let pass = (dt.getTime() - StartTime) / 1000 / 60
    WriteLog("总用时：" + pass.toFixed(1) + " 分钟。")
    WriteLog("正在生成 zip 文件")
    zip.file("导出日志.txt", logHistory)
    let b64 = await zip.generateAsync({ type: "base64" })
    let DownloadZIP = function () {
        DownloadData(dt.getTime().toFixed() + ".zip", b64)
    }
    DownloadZIP()
    let but = document.createElement("button")
    but.innerText = "点我下载"
    but.style.padding = "5px"
    but.style.fontSize = "2em"
    but.onclick = function () {
        DownloadZIP()
    }
    logPanel.appendChild(but)
    GM_notification({ text: "您的石墨文档导出已经完成！可以下载了！", title: "下载完成！", timeout: 0 })
    WriteLog("可以下载了！")
}

// 下载一个石墨文件，返回 base64 字符串
function ExportItem(t: ShimoItem, format: string): Promise<Blob> {
    let url = "https://xxport.shimo.im/files/" + t.id + "/export?type=" + format + "&file=" + t.id + "&returnJson=1&name=" + t.name
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
            GM_xmlhttpRequest({
                url: u2,
                method: "GET",
                timeout: 19000,
                responseType: "blob",
                headers: {
                    Accept: "*/*",
                    Referer: refr
                },
                onload: function (rep) {
                    if (rep.status == 200) {
                        let obj: Blob = rep.response
                        resolve(obj)
                    } else {
                        WriteLog("下载异常：" + rep.status.toFixed() + " " + rep.responseText)
                        reject()
                    }
                }, onerror: function (rep) {
                    WriteLog("下载异常：" + rep.error)
                    reject()
                }, ontimeout: function () {
                    WriteLog("下载超时！")
                    reject()
                }
            })
        }
        GM_xmlhttpRequest({
            url: url,
            headers: {
                Accept: "*/*",
                Referer: refr
            },
            method: "GET",
            timeout: 5000,
            onload: async function (rep) {
                if (rep.status == 200) {
                    try {
                        let info: ShimoExportResult = JSON.parse(rep.responseText)
                        let u = info.redirectUrl
                        if (u.length > 15) {
                            downloads(u)
                        }
                    } catch (error) {
                        WriteLog("API返回JSON解析失败：" + error)
                        reject()
                    }
                } else {
                    let str = rep.responseText
                    WriteLog("返回异常：" + rep.status.toFixed() + " " + str)
                    //{"requestId":"e5a1795135de65730960400ca6d9f160","error":"Rate limit exceeded, retry in 22 seconds","errorCode":0}
                    const reg = new RegExp("retry in ([0-9]+) seconds", "gim")
                    let rs = reg.exec(str)
                    if (rs != null) {
                        let num = parseFloat(rs[1]) + 1
                        let now = new Date
                        now.setSeconds(now.getSeconds() + num)
                        WriteLog("石墨限制，等待到这之后再继续：" + now.toLocaleTimeString())
                        await Sleep(num * 1000)
                        reject()
                    }
                }
            },
            onerror: function (rep) {
                WriteLog("返回出错：" + rep.error)
                reject()
            },
            ontimeout: function () {
                WriteLog("返回超时！")
                reject()
            }
        })
    }
    )
    return p
}

