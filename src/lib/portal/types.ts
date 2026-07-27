export type UUID = string;

export type EquipamentoStatus = "disponivel" | "alugado" | "manutencao" | "inativo";
export type ClienteTipo = "pessoa_fisica" | "pessoa_juridica";
export type TipoCobranca = "diaria" | "semanal" | "mensal";
export type AluguelStatus = "orcamento" | "reservado" | "ativo" | "devolvido" | "atrasado" | "cancelado";
export type FormaPagamento = "dinheiro" | "pix" | "cartao" | "boleto";
export type StatusPagamento = "pendente" | "parcial" | "pago";
export type ManutencaoStatus = "em_andamento" | "concluida";

export interface Categoria {
  id: UUID;
  nome: string;
  descricao: string;
  ordem: number;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Equipamento {
  id: UUID;
  categoria_id: UUID;
  nome: string;
  codigo_patrimonio: string;
  descricao: string;
  foto_url: string;
  valor_diaria: number;
  valor_semanal: number;
  valor_mensal: number;
  quantidade_total: number;
  status: EquipamentoStatus;
  observacoes: string;
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
}

export interface Aluguel {
  id: UUID;
  cliente_id: UUID;
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

export interface Manutencao {
  id: UUID;
  equipamento_id: UUID;
  data_inicio: string;
  data_fim: string | null;
  descricao: string;
  custo: number;
  status: ManutencaoStatus;
  created_at: string;
  updated_at: string;
}

export interface Empresa {
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
}

export interface Usuario {
  id: UUID;
  email: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}
