/// <reference path = "helpers.ts" />

let ExportFormats = new Map<string, string>()

// 格式选择菜单
let fm = document.createElement("div");
let fmOptions = new Map<string, HTMLSelectElement>();

(function () {
    let defaultFormats = new Map<string, string>()
    defaultFormats.set("docs", "docx")
    defaultFormats.set("sheets", "xlsx")
    defaultFormats.set("mindmaps", "xmind")
    defaultFormats.set("docx", "docx")
    defaultFormats.set("presentation", "pptx")
    defaultFormats.forEach(function (v, k) {
        ExportFormats.set(k, GM_getValue("fm_" + k, v))
    })
    document.body.insertBefore(fm, document.body.firstChild)
    fm.style.width = "400px"
    fm.style.height = "600px"
    fm.style.position = "fixed"
    fm.style.backgroundColor = "black"
    fm.style.right = "100px"
    fm.style.padding = "10px"
    fm.style.color = "white"
    fm.style.display = "none"
    fm.style.zIndex = "99999"
    fm.style.wordWrap = "anywhere"
    fm.style.overflow = "auto"
    let h1 = document.createElement("h1")
    h1.innerText = "修改导出的格式"
    fm.appendChild(h1)
    let helps = document.createElement("p")
    helps.innerText = "下面所做的修改会自动保存。\n石墨不支持导出表单，我就没办法了。\n表单无法导出，表单的收集数据在另外的在线表格里。\n尽量不要选择导出图片，可能会因为文档过大导出失败。\n\n"
    fm.appendChild(helps)
    let addSelect = function (id: string, text: string, options: string[]) {
        let p = document.createElement("p")
        p.style.margin = "4px"
        fm.appendChild(p)
        let span = document.createElement("span")
        span.innerText = text
        p.appendChild(span)
        let s = document.createElement("select")
        p.appendChild(s)
        fmOptions.set(id, s)
        options.forEach(function (v) {
            let o = document.createElement("option")
            o.innerText = v
            o.value = v
            s.appendChild(o)
            if (v == ExportFormats.get(id)) {
                o.selected = true
            }
        })
        s.addEventListener("change", function () {
            let v = this.value
            GM_setValue("fm_" + id, v)
            ExportFormats.set(id, v)
        })
    }
    addSelect("docs", "普通文档：", ["pdf", "docx", "jpg", "md"])
    addSelect("docx", "文档传统版：", ["pdf", "docx", "wps"])
    addSelect("sheets", "表格：", ["xlsx"])
    addSelect("presentation", "幻灯片：", ["pdf", "pptx"])
    addSelect("mindmaps", "思维导图：", ["jpg", "xmind"])
})();

function OpenFormatMenu() {
    fm.style.display = "block"
}

function GetFormatByType(v: ShimoItemType): string | null {
    let kind = ShimoItemType[v] as keyof typeof ShimoItemType
    let format = ExportFormats.get(kind)
    if (format == null || format.length < 1) {
        return null
    }
    return format
}