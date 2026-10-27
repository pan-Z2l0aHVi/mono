export function parsePo(text: string): {
  entries: Map<string, string | string[]>
  obsolete: string[]
  pluralCount: number
}

export function checkApp(options: { root: string; app: string }): Promise<string>
