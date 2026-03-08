// Mock symbol directory — replaced by Polygon.io symbol search API in Epic 6.
// Single source of truth for symbol metadata used across components.

export type SymbolCategory = 'Equities' | 'Crypto'

export type SymbolInfo = {
  symbol: string
  name: string
  exchange: string
  category: SymbolCategory
}

export const SYMBOLS: SymbolInfo[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', category: 'Equities' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', category: 'Equities' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', category: 'Equities' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', category: 'Equities' },
  { symbol: 'BTCUSD', name: 'Bitcoin / USD', exchange: 'Crypto', category: 'Crypto' },
  { symbol: 'ETHUSD', name: 'Ethereum / USD', exchange: 'Crypto', category: 'Crypto' },
]

export function findSymbol(symbol: string): SymbolInfo | undefined {
  return SYMBOLS.find((s) => s.symbol === symbol)
}

export function searchSymbols(query: string): SymbolInfo[] {
  if (!query.trim()) return SYMBOLS
  const q = query.toLowerCase()
  return SYMBOLS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
  )
}
