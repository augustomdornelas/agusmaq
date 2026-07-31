import { Image as ImageIcon } from "lucide-react";
import { whatsappLink } from "@/lib/portal/format";
import { WhatsAppIcon } from "@/components/catalogo/CatalogoLayout";

export interface EquipamentoPublicData {
  id: string;
  nome: string;
  foto_url: string;
}

export function EquipamentoPublicCard({ equipamento, telefone }: { equipamento: EquipamentoPublicData; telefone: string | null }) {
  const waHref = telefone
    ? whatsappLink(telefone, `Olá! Vi a ${equipamento.nome} no site e gostaria de fazer um orçamento.`)
    : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#eef0f4] bg-white transition hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f4f4]">
        {equipamento.foto_url ? (
          <img src={equipamento.foto_url} alt={equipamento.nome} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#6e7280]"><ImageIcon className="h-10 w-10 opacity-40" /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="flex-1 text-base font-bold text-[#213368]">{equipamento.nome}</h3>
        <div className="mt-4">
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#f37032] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#db5f22]"
            >
              <WhatsAppIcon size={16} />
              Chamar no WhatsApp
            </a>
          ) : (
            <p className="text-xs text-[#6e7280]">Entre em contato pelos canais da Agusmaq.</p>
          )}
        </div>
      </div>
    </div>
  );
}
