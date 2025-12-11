export interface Command {
  name: string
  path: string
  icon?: string
}

export interface AppScanner {
  scanApplications(): Promise<Command[]>
}
