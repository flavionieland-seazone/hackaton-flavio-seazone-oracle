// Filtro de privacidade em 3 camadas

const BLOCKED_INPUT_PATTERNS = [
  /sal[aá]rio|remunera[çc][aã]o|quanto\s+ganha|folha\s+de\s+pagamento|benef[ií]cio\s+financeiro/i,
  /desligamento|demiss[aã]o|demitid[oa]|mandou\s+embora|rescis[aã]o/i,
  /processo\s+judicial|processo\s+trabalhista|a[çc][aã]o\s+judicial|lit[ií]gio|processo\s+jur[ií]dico/i,
  /\bcpf\b|endere[çc]o\s+pessoal|dados\s+pessoais\s+de/i,
  /cap\s*table|valuation|projeç[aã]o\s+financeira|pitch\s+deck\s+financeiro/i,
  /senha|token\s+de\s+api|credencial|api[-\s]?key/i,
]

const SENSITIVE_OUTPUT_PATTERNS = [
  /R\$\s*[\d.,]+.*(?:sal[aá]rio|mensal|CLT|anual)/i,
  /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/,  // CPF
  /(?:demitid|desligad|rescindid)[oa].*(?:em|dia|data)\s*\d/i,
]

export function screenInput(query: string): { blocked: boolean; reason?: string } {
  for (const pattern of BLOCKED_INPUT_PATTERNS) {
    if (pattern.test(query)) {
      return {
        blocked: true,
        reason:
          'Essa informação é confidencial e não posso compartilhar. Por favor, consulte o departamento responsável.',
      }
    }
  }
  return { blocked: false }
}

export function scanOutput(response: string): string {
  for (const pattern of SENSITIVE_OUTPUT_PATTERNS) {
    if (pattern.test(response)) {
      return 'Essa resposta foi bloqueada por conter informações sensíveis. Por favor, reformule sua pergunta ou consulte o departamento responsável.'
    }
  }
  return response
}
