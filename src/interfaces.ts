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