import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import logoPrincipal from "@/assets/agusmaq-logo-principal.png";
import logoNegativo from "@/assets/agusmaq-logo-negativo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agusmaq — Locações e Equipamentos | Agudos, SP" },
      {
        name: "description",
        content:
          "Locação de máquinas e equipamentos para construção em Agudos, SP. Betoneiras, andaimes, compactadores, geradores, rompedores e ferramentas — revisadas antes de cada locação.",
      },
      { property: "og:title", content: "Agusmaq — Locações e Equipamentos" },
      {
        property: "og:description",
        content:
          "Equipamento de quem entende de obra. Aluguel de máquinas em Agudos, SP e região.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

const WHATSAPP_URL =
  "https://wa.me/5514900000000?text=" +
  encodeURIComponent("Olá! Quero um orçamento de locação.");

/* -------------------------- Icons (line, brand-colored) ------------------------- */

const iconProps = {
  width: 40,
  height: 40,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconMixer = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M4 17h6" />
    <circle cx="15" cy="12" r="6" />
    <path d="M15 8v4l3 2" />
    <path d="M4 20h8" />
  </svg>
);
const IconScaffold = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M4 4v16M10 4v16M16 4v16M22 4v16" />
    <path d="M4 9h18M4 15h18" />
  </svg>
);
const IconCompact = () => (
  <svg {...iconProps} aria-hidden="true">
    <rect x="3" y="8" width="14" height="8" rx="1" />
    <path d="M17 12h4M6 20h8" />
    <path d="M8 8V5h6v3" />
  </svg>
);
const IconGenerator = () => (
  <svg {...iconProps} aria-hidden="true">
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 10h4M7 14h6" />
    <path d="M17 10v4" />
  </svg>
);
const IconHammer = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M14 3l7 7-3 3-7-7z" />
    <path d="M11 6l-8 8 4 4 8-8" />
  </svg>
);
const IconTools = () => (
  <svg {...iconProps} aria-hidden="true">
    <circle cx="8" cy="16" r="3" />
    <path d="M10 14l8-8 3 3-8 8" />
    <path d="M14 6l3 3" />
  </svg>
);

const IconCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const IconWhatsapp = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.5 3.5A11 11 0 0 0 3.4 17.2L2 22l4.9-1.4A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.5-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4 0-.4.2-.6l.4-.5c.1-.1.1-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3a2.9 2.9 0 0 0-.9 2.1c0 1.3.9 2.5 1 2.7 1.3 2 3 3 4.3 3.5 1.4.4 2 .3 2.7.2.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1 0-.1-.2-.2-.4-.3z" />
  </svg>
);

/* -------------------------- UI atoms ------------------------- */

function TapeStripe({ className = "" }: { className?: string }) {
  return <div className={`tape-stripes h-3 w-full ${className}`} aria-hidden="true" />;
}

function BtnPrimary({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-[#f37032] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#db5f22] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f37032] ${className}`}
    >
      {children}
    </a>
  );
}

function BtnOutlineWhite({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-white bg-transparent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white hover:text-[#213368]"
    >
      {children}
    </a>
  );
}

/* -------------------------- Reveal on scroll ------------------------- */

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("reveal-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* -------------------------- Page ------------------------- */

function Landing() {
  useReveal();

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <TapeStripe />
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <Equipment />
        <ForWhom />
        <About />
        <ContactCTA />
      </main>
      <TapeStripe />
      <Footer />
    </div>
  );
}

/* -------------------------- Header ------------------------- */

function Header() {
  const nav = [
    { href: "#equipamentos", label: "Equipamentos" },
    { href: "#como-funciona", label: "Como funciona" },
    { href: "#para-quem", label: "Para quem" },
    { href: "#sobre", label: "Sobre" },
    { href: "#contato", label: "Contato" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-[#eef0f4] bg-white/95 backdrop-blur">
      <div className="container-x flex h-20 items-center justify-between gap-4">
        <a href="#top" className="flex shrink-0 items-center" aria-label="Agusmaq — Início">
          <img
            src={logoPrincipal}
            alt="Agusmaq — Locações e Equipamentos"
            className="h-11 w-auto"
            width={220}
            height={64}
          />
        </a>
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm font-semibold text-[#1a1a1a] transition hover:text-[#f37032]"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <BtnPrimary href={WHATSAPP_URL} className="hidden md:inline-flex">
          <IconWhatsapp size={18} />
          Pedir orçamento
        </BtnPrimary>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Pedir orçamento no WhatsApp"
          className="inline-flex items-center justify-center rounded-md bg-[#f37032] p-3 text-white md:hidden"
        >
          <IconWhatsapp size={20} />
        </a>
      </div>
    </header>
  );
}

/* -------------------------- Hero ------------------------- */

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#213368] text-white">
      {/* Decorative geometric shapes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute right-32 bottom-10 h-40 w-40 rounded-full bg-[#f37032]/15" />
        <div className="absolute left-1/2 top-1/3 h-2 w-40 -rotate-12 rounded-full bg-[#f37032]/60" />
      </div>

      <div className="container-x relative grid gap-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <p className="reveal text-xs font-semibold tracking-[0.22em] text-[#f37032]">
            LOCAÇÃO DE MÁQUINAS E EQUIPAMENTOS · AGUDOS, SP
          </p>
          <h1 className="reveal mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Equipamento de quem entende de obra.
          </h1>
          <p className="reveal mt-6 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
            Máquinas revisadas antes de cada locação, com entrega em Agudos e região — para
            construtoras, indústrias e pessoas físicas.
          </p>
          <div className="reveal mt-9 flex flex-col gap-3 sm:flex-row">
            <BtnPrimary href={WHATSAPP_URL}>
              <IconWhatsapp size={18} />
              Pedir orçamento no WhatsApp
            </BtnPrimary>
            <BtnOutlineWhite href="#equipamentos">Ver equipamentos</BtnOutlineWhite>
          </div>
        </div>

        {/* Signature card */}
        <div className="reveal lg:col-span-5">
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <div className="absolute -top-3 left-8 rounded-full bg-[#f37032] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
              Locação
            </div>
            <div className="rounded-xl bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">
                “Fechou hoje, retira amanhã.”
              </p>
              <p className="mt-2 text-xs text-white/70">
                É esse o jeito Agusmaq de resolver. Sem letra miúda, sem espera de semana.
              </p>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-white/85">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#f37032]" />
                Revisão antes de cada locação
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#f37032]" />
                Entrega e retirada na obra
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#f37032]" />
                Diária, semanal ou mensal
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}



/* -------------------------- Trust ------------------------- */

function TrustStrip() {
  const items = [
    {
      title: "Máquina revisada",
      body: "Manutenção feita por quem depende dela na própria obra.",
    },
    {
      title: "Entrega e retirada",
      body: "Levamos e buscamos na sua obra, em Agudos e região.",
    },
    {
      title: "Contrato simples",
      body: "Diária, semanal ou mensal, sem letra miúda.",
    },
  ];
  return (
    <section className="border-b border-[#eef0f4] bg-[#f4f4f4]">
      <div className="container-x grid gap-6 py-10 md:grid-cols-3 md:py-12">
        {items.map((it) => (
          <div key={it.title} className="reveal flex items-start gap-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#213368] text-white">
              <IconCheck />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#1a1a1a]">{it.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#6e7280]">{it.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------- How it works ------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Escolha o equipamento",
      body: "Diz o que você precisa — betoneira, andaime, gerador, ferramenta. A gente confere o que tem disponível.",
    },
    {
      n: "02",
      title: "Receba o orçamento pelo WhatsApp",
      body: "Com valor de diária, semana ou mês. Direto, sem passar por cinco pessoas.",
    },
    {
      n: "03",
      title: "Contrato e entrega",
      body: "A máquina sai revisada e chega na obra no prazo combinado. Nota e contrato quando precisar.",
    },
    {
      n: "04",
      title: "Use e devolva",
      body: "Terminou, a gente retira. Precisou de mais tempo, é só renovar.",
    },
  ];
  return (
    <section id="como-funciona" className="bg-white py-20 md:py-28">
      <div className="container-x">
        <div className="reveal max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f37032]">
            Como funciona
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#213368] md:text-4xl">
            Fechou hoje, retira amanhã.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#6e7280]">
            Quatro passos, sem enrolação — do primeiro contato até a devolução.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li
              key={s.n}
              className="reveal group relative rounded-xl border border-[#eef0f4] bg-white p-7 transition hover:border-[#f37032] hover:shadow-md"
            >
              <div className="text-4xl font-extrabold text-[#f37032]">{s.n}</div>
              <div className="mt-5 h-1 w-10 rounded bg-[#213368] transition group-hover:w-16 group-hover:bg-[#f37032]" />
              <h3 className="mt-5 text-lg font-bold text-[#213368]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6e7280]">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------- Equipment ------------------------- */

function Equipment() {
  const cards = [
    {
      icon: <IconMixer />,
      title: "Betoneiras e vibradores",
      body: "Betoneiras de 150 a 400 L, vibradores de imersão e réguas vibratórias.",
    },
    {
      icon: <IconScaffold />,
      title: "Andaimes e escoras",
      body: "Andaimes fachadeiros e tubulares, escoras metálicas e plataformas.",
    },
    {
      icon: <IconCompact />,
      title: "Compactação de solo",
      body: "Placas vibratórias, compactadores de percussão (sapo) e rolos.",
    },
    {
      icon: <IconGenerator />,
      title: "Geradores e compressores",
      body: "Geradores a diesel e compressores de ar para obra e indústria.",
    },
    {
      icon: <IconHammer />,
      title: "Rompedores e perfuração",
      body: "Martelos rompedores, perfuradores e marteletes.",
    },
    {
      icon: <IconTools />,
      title: "Ferramentas elétricas",
      body: "Serras, furadeiras, lixadeiras e cortadoras de piso.",
    },
  ];
  return (
    <section id="equipamentos" className="bg-[#f4f4f4] py-20 md:py-28">
      <div className="container-x">
        <div className="reveal flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f37032]">
              Equipamentos
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#213368] md:text-4xl">
              Do alicerce ao acabamento.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#6e7280]">
            Uma linha completa para atender canteiro pequeno, obra grande, reforma de fim de
            semana e parada de indústria.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <article
              key={c.title}
              className="reveal group flex flex-col rounded-xl border border-[#eef0f4] bg-white p-7 transition hover:-translate-y-1 hover:border-[#213368] hover:shadow-lg"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#213368]/5 text-[#213368] transition group-hover:bg-[#f37032] group-hover:text-white">
                {c.icon}
              </div>
              <h3 className="mt-6 text-lg font-bold text-[#213368]">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6e7280]">{c.body}</p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#f37032] transition hover:gap-3"
              >
                Consultar disponibilidade
                <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>

        <p className="reveal mt-10 text-center text-sm font-medium text-[#1a1a1a]">
          Não achou o que precisa?{" "}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#f37032] underline underline-offset-4 hover:text-[#db5f22]"
          >
            Pergunte no WhatsApp que a gente resolve.
          </a>
        </p>
      </div>
    </section>
  );
}

/* -------------------------- For whom ------------------------- */

function ForWhom() {
  const cols = [
    {
      tag: "Construtoras",
      title: "Equipamento na hora que o cronograma aperta.",
      body: "Contrato mensal, reposição rápida e suporte para não parar a obra.",
      bullets: ["Contrato mensal recorrente", "Reposição ágil", "Nota fiscal e contrato"],
    },
    {
      tag: "Indústrias",
      title: "Manutenção e paradas programadas.",
      body: "Locação sob medida para paradas, ampliações e serviços de manutenção industrial.",
      bullets: ["Paradas programadas", "Locação de longo prazo", "Emissão de nota e contrato"],
    },
    {
      tag: "Pessoa física",
      title: "Aluguel por diária para reforma.",
      body: "Serviço de fim de semana? Pega a máquina certa e devolve segunda. Simples assim.",
      bullets: ["Diária a partir de 24h", "Retirada e devolução simples", "Sem burocracia"],
    },
  ];
  return (
    <section id="para-quem" className="bg-white py-20 md:py-28">
      <div className="container-x">
        <div className="reveal max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f37032]">
            Para quem
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#213368] md:text-4xl">
            Atendemos quem faz.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cols.map((c) => (
            <div
              key={c.tag}
              className="reveal flex flex-col rounded-2xl border border-[#eef0f4] bg-white p-8 transition hover:shadow-md"
            >
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#213368] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                {c.tag}
              </div>
              <h3 className="mt-5 text-xl font-bold text-[#213368]">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#6e7280]">{c.body}</p>
              <ul className="mt-6 space-y-2.5">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-[#1a1a1a]">
                    <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[#f37032]" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------- About ------------------------- */

function About() {
  return (
    <section id="sobre" className="relative overflow-hidden bg-[#213368] py-20 text-white md:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-white/5" />
        <div className="absolute right-10 bottom-10 h-2 w-56 rotate-6 rounded-full bg-[#f37032]/60" />
      </div>
      <div className="container-x relative grid items-center gap-14 lg:grid-cols-12">
        <div className="reveal lg:col-span-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f37032]">
            Sobre a Agusmaq
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
            Nascida dentro do canteiro.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-white/85">
            <p>
              A Agusmaq nasceu dentro do <strong className="font-semibold">Grupo GRD</strong>,
              empresa de projetos e construções de Agudos (SP). Antes de virar locadora, o
              parque de máquinas foi montado para atender as próprias obras — e isso muda tudo.
            </p>
            <p>
              As máquinas são mantidas por quem depende delas todos os dias. Quando você aluga
              da Agusmaq, aluga o mesmo equipamento que a nossa equipe leva para o próprio
              canteiro.
            </p>
            <p>
              O nome vem daí:{" "}
              <span className="font-semibold text-white">AGUS</span> de Agudos,{" "}
              <span className="font-semibold text-[#f37032]">MAQ</span> de máquinas.
            </p>
          </div>
        </div>

        <div className="reveal lg:col-span-5">
          <div className="rounded-2xl bg-white p-10 shadow-2xl">
            <img
              src={logoPrincipal}
              alt="Agusmaq"
              className="h-16 w-auto"
              width={260}
              height={80}
              loading="lazy"
            />
            <div className="mt-8 h-px w-full bg-[#eef0f4]" />
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#213368] text-xs font-bold text-white">
                GRD
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#6e7280]">
                  Selo
                </div>
                <div className="text-sm font-semibold text-[#1a1a1a]">
                  Uma empresa do Grupo GRD
                </div>
              </div>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-[#6e7280]">
              Grupo GRD — Projetos e Construções. Agudos, SP.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Contact CTA ------------------------- */

function ContactCTA() {
  return (
    <section id="contato" className="bg-white py-20 md:py-28">
      <div className="container-x">
        <div className="reveal overflow-hidden rounded-3xl border border-[#eef0f4] bg-gradient-to-br from-[#f4f4f4] to-white p-10 md:p-16">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f37032]">
                Contato
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#213368] md:text-5xl">
                A sua obra não pode esperar.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#6e7280]">
                Fale agora pelo WhatsApp com quem entende de máquina. Orçamento no mesmo dia.
              </p>
              <div className="mt-8">
                <BtnPrimary href={WHATSAPP_URL}>
                  <IconWhatsapp size={18} />
                  Pedir orçamento no WhatsApp
                </BtnPrimary>
              </div>
            </div>

            <div className="lg:col-span-5">
              <dl className="space-y-5">
                <ContactRow label="Telefone" value="(14) 9 0000-0000" href="tel:+5514900000000" />
                <ContactRow
                  label="E-mail"
                  value="contato@agusmaq.com.br"
                  href="mailto:contato@agusmaq.com.br"
                />
                <ContactRow label="Endereço" value="Agudos · SP" />
                <ContactRow label="Horário" value="Seg–sex 7h–17h · Sáb 7h–12h" />
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-[#6e7280]">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-[#1a1a1a]">{value}</dd>
    </>
  );
  return (
    <div className="rounded-xl border border-[#eef0f4] bg-white p-5 transition hover:border-[#f37032]">
      {href ? (
        <a href={href} className="block">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

/* -------------------------- Footer ------------------------- */

function Footer() {
  return (
    <footer className="bg-[#1a2957] text-white/80">
      <div className="container-x grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <img
            src={logoNegativo}
            alt="Agusmaq"
            className="h-14 w-auto"
            width={240}
            height={70}
            loading="lazy"
          />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/70">
            Locação de máquinas e equipamentos para construção em Agudos e região.
          </p>
        </div>

        <div className="lg:col-span-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-white">Navegar</h4>
          <ul className="mt-5 space-y-3 text-sm">
            <li><a href="#equipamentos" className="hover:text-[#f37032]">Equipamentos</a></li>
            <li><a href="#como-funciona" className="hover:text-[#f37032]">Como funciona</a></li>
            <li><a href="#para-quem" className="hover:text-[#f37032]">Para quem</a></li>
            <li><a href="#sobre" className="hover:text-[#f37032]">Sobre</a></li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-white">Contato</h4>
          <ul className="mt-5 space-y-3 text-sm">
            <li><a href="tel:+5514900000000" className="hover:text-[#f37032]">(14) 9 0000-0000</a></li>
            <li><a href="mailto:contato@agusmaq.com.br" className="hover:text-[#f37032]">contato@agusmaq.com.br</a></li>
            <li>Agudos · SP</li>
            <li className="text-white/60">Seg–sex 7h–17h · Sáb 7h–12h</li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-white">Siga</h4>
          <ul className="mt-5 space-y-3 text-sm">
            <li>
              <a
                href="https://instagram.com/agusmaq"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-[#f37032]"
              >
                Instagram @agusmaq
              </a>
            </li>
            <li>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-[#f37032]"
              >
                <IconWhatsapp size={16} /> WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-start justify-between gap-3 py-6 text-xs text-white/60 md:flex-row md:items-center">
          <p>
            Agusmaq é uma marca do Grupo GRD — GRD Projetos e Construções Ltda. · CNPJ
            00.000.000/0001-00
          </p>
          <p>© {new Date().getFullYear()} Agusmaq. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

/* Floating WhatsApp is intentionally omitted to keep header CTA and section CTAs primary. */
