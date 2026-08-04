import { dateBR, money } from "./format";
import type { Cliente } from "./types";

export const TEMPLATE_TERMO_LOCACAO_DEFAULT = `Por este instrumento, de um lado [nome_empresa], inscrita no CNPJ [cnpj], com sede em [endereco_empresa], doravante denominada LOCADORA, e de outro lado [nome_cliente], inscrito(a) no CPF/CNPJ [cpf_cnpj], residente/estabelecido(a) em [endereco_cliente], [cidade_cliente], doravante denominado(a) LOCATÁRIO(A), firmam o presente termo de locação dos equipamentos listados abaixo.

Período: de [data_inicio] a [data_fim] — regime [regime]. Valor total: [valor_total].

O(A) LOCATÁRIO(A) se compromete a devolver os bens em perfeito estado de conservação, como atualmente se encontram, ao fim do prazo estabelecido. É vedado ao(à) LOCATÁRIO(A) transferir, sublocar, ceder ou emprestar os bens ora locados a terceiros. Em caso de dano, perda ou extravio, o(a) LOCATÁRIO(A) arcará com o custo de reparo ou reposição do equipamento.`;

export interface PreencherTermoLocacaoInput {
  numero: number;
  empresaNome: string;
  empresaCnpj: string;
  empresaEndereco: string;
  cliente: Cliente | null | undefined;
  dataInicio: string;
  dataFim: string;
  regime: string;
  valorTotal: number;
  templateCustom?: string;
}

export function preencherTermoLocacao(input: PreencherTermoLocacaoInput): string {
  const template = input.templateCustom?.trim() || TEMPLATE_TERMO_LOCACAO_DEFAULT;
  return template
    .replace(/\[numero\]/g, String(input.numero))
    .replace(/\[nome_empresa\]/g, input.empresaNome)
    .replace(/\[cnpj\]/g, input.empresaCnpj)
    .replace(/\[endereco_empresa\]/g, input.empresaEndereco)
    .replace(/\[nome_cliente\]/g, input.cliente?.nome_razao_social ?? "—")
    .replace(/\[cpf_cnpj\]/g, input.cliente?.cpf_cnpj ?? "—")
    .replace(/\[endereco_cliente\]/g, input.cliente?.endereco ?? "—")
    .replace(/\[cidade_cliente\]/g, input.cliente?.cidade ?? "—")
    .replace(/\[data_inicio\]/g, dateBR(input.dataInicio))
    .replace(/\[data_fim\]/g, dateBR(input.dataFim))
    .replace(/\[regime\]/g, input.regime)
    .replace(/\[valor_total\]/g, money(input.valorTotal));
}

export const TEMPLATE_TERMO_DEVOLUCAO_DEFAULT = `A LOCADORA declara ter recebido nesta data os bens relacionados acima, nas condições descritas, ressalvadas as avarias eventualmente apontadas. Havendo avarias, o(a) LOCATÁRIO(A) permanece responsável pelo custo de reparo ou reposição do(s) equipamento(s), conforme os termos de locação originalmente firmados.`;

export interface PreencherTermoDevolucaoInput {
  numero: number;
  sequencia: number;
  cliente: Cliente | null | undefined;
  data: string;
  templateCustom?: string;
}

export function preencherTermoDevolucao(input: PreencherTermoDevolucaoInput): string {
  const template = input.templateCustom?.trim() || TEMPLATE_TERMO_DEVOLUCAO_DEFAULT;
  return template
    .replace(/\[numero\]/g, String(input.numero))
    .replace(/\[sequencia\]/g, String(input.sequencia))
    .replace(/\[nome_cliente\]/g, input.cliente?.nome_razao_social ?? "—")
    .replace(/\[data\]/g, dateBR(input.data));
}
