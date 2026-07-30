export type UUID = string;

export type EquipamentoStatus = "disponivel" | "alugado" | "manutencao" | "inativo";
export type ClienteTipo = "pessoa_fisica" | "pessoa_juridica";
export type TipoCobranca = "diaria" | "semanal" | "mensal";
export type AluguelStatus = "orcamento" | "reservado" | "ativo" | "devolvido" | "atrasado" | "cancelado";
export type FormaPagamento = "dinheiro" | "pix" | "cartao" | "boleto";
export type StatusPagamento = "pendente" | "parcial" | "pago";
export type ManutencaoStatus = "aberta" | "em_andamento" | "concluida";
export type ManutencaoTipo = "preventiva" | "corretiva" | "emergencial";
export type LocalTipo = "Base" | "Almoxarifado" | "Obra";
export type DescontoTipo = "percentual" | "valor";
// "expirado" não é gravado no banco — é calculado na tela (enviado + validade vencida),
// igual ao "atrasado" dos aluguéis.
export type OrcamentoStatus = "rascunho" | "enviado" | "aprovado" | "recusado";
export type OrcamentoStatusDisplay = OrcamentoStatus | "expirado";

export interface Categoria {
  id: UUID;
  nome: string;
  descricao: string;
  ordem: number;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Local {
  id: UUID;
  nome: string;
  tipo: LocalTipo;
  created_at: string;
}

export interface Equipamento {
  id: UUID;
  categoria_id: UUID;
  nome: string;
  codigo_patrimonio: string;
  codigos_patrimonio?: string[];
  descricao: string;
  foto_url: string;
  valor_diaria: number;
  valor_semanal: number;
  valor_mensal: number;
  valor_compra: number;
  data_compra: string | null;
  quantidade_total: number;
  status: EquipamentoStatus;
  observacoes: string;
  local_base_id: UUID | null;
  local_atual_id: UUID | null;
  exibir_catalogo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: UUID;
  tipo: ClienteTipo;
  nome_razao_social: string;
  cpf_cnpj: string;
  telefone_whatsapp: string;
  email: string;
  endereco: string;
  cidade: string;
  observacoes: string;
  created_at: string;
  updated_at: string;
}

export interface AluguelItem {
  id: UUID;
  aluguel_id: UUID;
  equipamento_id: UUID;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
  unidades_codigos?: string[];
}

export interface Aluguel {
  id: UUID;
  numero: number;
  cliente_id: UUID;
  destino: string | null;
  data_inicio: string;
  data_prevista_devolucao: string;
  data_devolucao_real: string | null;
  tipo_cobranca: TipoCobranca;
  status: AluguelStatus;
  desconto: number;
  valor_frete: number;
  valor_total: number;
  forma_pagamento: FormaPagamento;
  status_pagamento: StatusPagamento;
  observacoes: string;
  itens: AluguelItem[];
  created_at: string;
  updated_at: string;
}

export interface Pagamento {
  id: UUID;
  aluguel_id: UUID;
  data: string;
  valor: number;
  forma: FormaPagamento;
  observacao: string;
  created_at: string;
}

export interface ManutencaoAnexo {
  name: string;
  path: string;
  size?: number;
  type?: string;
}

export interface Manutencao {
  id: UUID;
  equipamento_id: UUID;
  tipo: ManutencaoTipo;
  data_inicio: string;
  data_fim: string | null;
  descricao: string;
  oficina: string | null;
  custo_pecas: number;
  custo_mao_obra: number;
  custo: number;
  status: ManutencaoStatus;
  anexos: ManutencaoAnexo[];
  created_at: string;
  updated_at: string;
}

export interface OrcamentoHistoricoEntry {
  status: OrcamentoStatus;
  data: string;
}

export interface OrcamentoItem {
  id: UUID;
  orcamento_id: UUID;
  equipamento_id: UUID;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto_tipo: DescontoTipo;
  desconto_valor: number;
  valor_total: number;
  ordem: number;
}

export interface Orcamento {
  id: UUID;
  numero: string;
  cliente_id: UUID;
  status: OrcamentoStatus;
  data_emissao: string;
  data_validade: string;
  data_inicio_periodo: string;
  data_fim_periodo: string;
  quantidade_dias: number;
  tipo_cobranca: TipoCobranca;
  desconto_tipo: DescontoTipo;
  desconto_valor: number;
  valor_frete: number;
  subtotal: number;
  valor_desconto: number;
  valor_total: number;
  condicoes_pagamento: string;
  observacoes: string;
  motivo_recusa: string;
  data_decisao: string | null;
  historico_status: OrcamentoHistoricoEntry[];
  aluguel_id: UUID | null;
  arquivado: boolean;
  itens: OrcamentoItem[];
  created_at: string;
  updated_at: string;
}

export interface Empresa {
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
}

export interface ConfiguracoesEmpresa {
  id: number;
  nome_empresa: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  telefone: string;
  email: string;
  logo_url: string;
  texto_condicoes_termo: string;
  updated_at: string;
}

export interface Usuario {
  id: UUID;
  email: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}
