/// <reference path = "header.ts" />
// 石墨文档里的文件类型
enum ShimoItemType {
    folder,
    docs,
    sheets,
    mindmaps,
    forms,
    boards,
    docx,
    presentation
}

const ShimoItemTypeNames = new Map<ShimoItemType, string>()
ShimoItemTypeNames.set(ShimoItemType.folder, "文件夹")
ShimoItemTypeNames.set(ShimoItemType.docs, "普通文档")
ShimoItemTypeNames.set(ShimoItemType.sheets, "表格")
ShimoItemTypeNames.set(ShimoItemType.mindmaps, "思维导图")
ShimoItemTypeNames.set(ShimoItemType.forms, "表单（不可导出）")
ShimoItemTypeNames.set(ShimoItemType.boards, "白板（不可导出）")
ShimoItemTypeNames.set(ShimoItemType.docx, "传统文档")
ShimoItemTypeNames.set(ShimoItemType.presentation, "幻灯片")

// 简单存储石墨文档里的文件信息
interface ShimoItem {
    type: ShimoItemType,
    id: string,
    name: string,
    path: string[]
}

// 石墨官方的获取文件夹子文件的API的返回的单个OBJ
interface ShimoFileObject {
    name: string,
    url: string
}

// 石墨官方导出 API 的返回的 JSON
interface ShimoExportResult {
    redirectUrl: string
}