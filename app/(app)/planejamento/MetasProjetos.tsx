'use client';

/**
 * FinOk — Módulo "Metas e Projetos"
 *
 * Planeja compras e projetos futuros:
 *  - capacidade de poupança (manual ou calculada a partir das transações do FinOk)
 *  - cadastro de projetos com valor, prazo, prioridade e forma de pagamento
 *  - aporte mensal necessário recalculado automaticamente
 *  - alerta quando os aportes passam da capacidade
 *  - registro de aportes, parcelas já assumidas e fluxo projetado de 12 meses
 *
 * Portal Retec: o estado vem do banco (`inicial`) e cada alteração é gravada
 * pela server action `salvar`, já amarrada ao dono do planejamento.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  HardDriveDownload,
  HardDriveUpload,
  Pencil,
  PiggyBank,
  Plus,
  Settings,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type TipoProjeto = 'Reserva' | 'Dívida' | 'Necessidade' | 'Investimento' | 'Desejo';
export type FormaPagamento = 'À vista' | 'Parcelado' | 'Financiado' | 'Consórcio';
export type StatusProjeto = 'Planejado' | 'Em andamento' | 'Concluído' | 'Adiado';

export interface Projeto {
  id: string;
  nome: string;
  tipo: TipoProjeto;
  prioridade: 1 | 2 | 3 | 4 | 5;
  valorEstimado: number;
  margem: number; // fração: 0.1 = 10%
  prazo: string; // 'YYYY-MM'
  formaPagamento: FormaPagamento;
  guardadoInicial: number;
  status: StatusProjeto;
}

export interface Aporte {
  id: string;
  projetoId: string;
  data: string; // 'YYYY-MM-DD'
  valor: number;
  obs?: string;
}

export interface Parcela {
  id: string;
  descricao: string;
  valorParcela: number;
  primeiroMes: string; // 'YYYY-MM'
  numParcelas: number;
}

export interface ConfigPlanejamento {
  rendaLiquida: number;
  gastosFixos: number;
  gastosVariaveis: number;
  fonteCapacidade: 'manual' | 'transacoes';
}

/** Formato mínimo das transações do FinOk usado para calcular a capacidade real. */
export interface TransacaoFinOk {
  type: 'income' | 'expense' | 'entrada' | 'saida';
  amount: number;
  date: string; // ISO
}

export interface Estado {
  config: ConfigPlanejamento;
  projetos: Projeto[];
  aportes: Aporte[];
  parcelas: Parcela[];
}

/* ------------------------------------------------------------------ */
/* Persistência                                                        */
/* ------------------------------------------------------------------ */

const estadoInicial: Estado = {
  config: { rendaLiquida: 0, gastosFixos: 0, gastosVariaveis: 0, fonteCapacidade: 'manual' },
  projetos: [],
  aportes: [],
  parcelas: [],
};

/** Completa o que veio do banco (ou nada, no primeiro acesso) com os valores padrão. */
function doBanco(parsed: Partial<Estado> | null): Estado {
  if (!parsed) return estadoInicial;
  return {
    config: { ...estadoInicial.config, ...parsed.config },
    projetos: parsed.projetos ?? [],
    aportes: parsed.aportes ?? [],
    parcelas: parsed.parcelas ?? [],
  };
}

export type ResultadoSalvar = { ok: boolean; error?: string };

/* ------------------------------------------------------------------ */
/* Cálculos (funções puras — fáceis de testar)                         */
/* ------------------------------------------------------------------ */

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const mesAtual = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return mesAtual(d);
}

/** Meses de `de` até `ate`, contando o mês do prazo como último aporte (mínimo 1). */
export function mesesAte(ate: string, de = mesAtual()): number {
  return Math.max(1, diffMeses(de, ate));
}

export const valorAlvo = (p: Projeto) => p.valorEstimado * (1 + (p.margem || 0));

export function totalGuardado(p: Projeto, aportes: Aporte[]): number {
  return p.guardadoInicial + aportes.filter((a) => a.projetoId === p.id).reduce((s, a) => s + a.valor, 0);
}

export function aporteMensal(p: Projeto, aportes: Aporte[], hoje = mesAtual()): number {
  if (p.status === 'Concluído' || p.status === 'Adiado') return 0;
  const falta = Math.max(0, valorAlvo(p) - totalGuardado(p, aportes));
  if (falta === 0) return 0;
  return falta / mesesAte(p.prazo, hoje);
}

export function parcelasNoMes(parcelas: Parcela[], mes: string): number {
  return parcelas
    .filter((p) => p.primeiroMes <= mes && somarMeses(p.primeiroMes, p.numParcelas - 1) >= mes)
    .reduce((s, p) => s + p.valorParcela, 0);
}

/** Diferença em meses entre dois 'YYYY-MM' (pode ser negativa). */
export function diffMeses(de: string, ate: string): number {
  const [a1, m1] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

export function saldoDevedor(p: Parcela, hoje = mesAtual()): number {
  const ultimo = somarMeses(p.primeiroMes, p.numParcelas - 1);
  if (ultimo < hoje) return 0;
  const inicio = p.primeiroMes > hoje ? p.primeiroMes : hoje;
  return (diffMeses(inicio, ultimo) + 1) * p.valorParcela;
}

/** Média de entradas − saídas dos últimos 3 meses fechados. */
export function capacidadePorTransacoes(transacoes: TransacaoFinOk[], hoje = mesAtual()) {
  const meses = [1, 2, 3].map((n) => somarMeses(hoje, -n));
  let entradas = 0;
  let saidas = 0;
  for (const t of transacoes) {
    const mes = t.date.slice(0, 7);
    if (!meses.includes(mes)) continue;
    const ehEntrada = t.type === 'income' || t.type === 'entrada';
    if (ehEntrada) entradas += Math.abs(t.amount);
    else saidas += Math.abs(t.amount);
  }
  return { mediaEntradas: entradas / 3, mediaSaidas: saidas / 3, capacidade: (entradas - saidas) / 3 };
}

const ORDEM_TIPO: Record<TipoProjeto, number> = {
  Reserva: 0,
  Dívida: 1,
  Necessidade: 2,
  Investimento: 3,
  Desejo: 4,
};

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

const nomeMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};

/* ------------------------------------------------------------------ */
/* Relatório e backup                                                  */
/* ------------------------------------------------------------------ */

type Celula = string | number;
interface Secao {
  titulo: string;
  cabecalho: string[];
  linhas: Celula[][];
  /** Índices das colunas que são valores em R$. */
  moeda?: number[];
}

export interface LinhaFluxo {
  mes: string;
  rotulo: string;
  parcelas: number;
  aportes: number;
  saldo: number;
  acumulado: number;
}

/** Monta as seções do relatório a partir do estado atual (função pura). */
export function montarRelatorio(
  estado: Estado,
  capacidade: number,
  fluxo: LinhaFluxo[],
  hoje = mesAtual(),
): Secao[] {
  const { projetos, aportes, parcelas } = estado;
  const necessarios = projetos.reduce((s, p) => s + aporteMensal(p, aportes, hoje), 0);
  const guardado = projetos.reduce((s, p) => s + totalGuardado(p, aportes), 0);
  const falta = projetos.reduce((s, p) => s + Math.max(0, valorAlvo(p) - totalGuardado(p, aportes)), 0);
  const devedor = parcelas.reduce((s, p) => s + saldoDevedor(p, hoje), 0);
  const nomeProjeto = (id: string) => projetos.find((p) => p.id === id)?.nome ?? '—';

  return [
    {
      titulo: 'Resumo',
      cabecalho: ['Indicador', 'Valor'],
      moeda: [1],
      linhas: [
        ['Capacidade de poupança/mês', capacidade],
        ['Aportes necessários/mês', necessarios],
        ['Folga mensal', capacidade - necessarios],
        ['Total já guardado', guardado],
        ['Total que falta', falta],
        ['Saldo devedor de parcelas', devedor],
        ['Saldo acumulado em 12 meses', fluxo.length ? fluxo[fluxo.length - 1].acumulado : 0],
      ],
    },
    {
      titulo: 'Projetos',
      cabecalho: ['Projeto', 'Tipo', 'Prioridade', 'Status', 'Pagamento', 'Prazo', 'Valor-alvo', 'Guardado', 'Falta', 'Aporte/mês', '% concluído'],
      moeda: [6, 7, 8, 9],
      linhas: [...projetos]
        .sort((a, b) => a.prioridade - b.prioridade || a.prazo.localeCompare(b.prazo))
        .map((p) => {
          const g = totalGuardado(p, aportes);
          const alvo = valorAlvo(p);
          return [
            p.nome, p.tipo, p.prioridade, p.status, p.formaPagamento, nomeMes(p.prazo),
            alvo, g, Math.max(0, alvo - g), aporteMensal(p, aportes, hoje),
            `${Math.round(alvo > 0 ? Math.min(1, g / alvo) * 100 : 0)}%`,
          ];
        }),
    },
    {
      titulo: 'Aportes',
      cabecalho: ['Data', 'Projeto', 'Valor', 'Observação'],
      moeda: [2],
      linhas: [...aportes]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((a) => [new Date(a.data + 'T12:00').toLocaleDateString('pt-BR'), nomeProjeto(a.projetoId), a.valor, a.obs ?? '']),
    },
    {
      titulo: 'Parcelas',
      cabecalho: ['Descrição', 'Valor da parcela', 'Nº de parcelas', 'Início', 'Fim', 'Saldo devedor'],
      moeda: [1, 5],
      linhas: parcelas.map((p) => [
        p.descricao, p.valorParcela, p.numParcelas, nomeMes(p.primeiroMes),
        nomeMes(somarMeses(p.primeiroMes, p.numParcelas - 1)), saldoDevedor(p, hoje),
      ]),
    },
    {
      titulo: 'Fluxo projetado — 12 meses',
      cabecalho: ['Mês', 'Parcelas', 'Aportes', 'Saldo do mês', 'Acumulado'],
      moeda: [1, 2, 3, 4],
      linhas: fluxo.map((f) => [f.rotulo, f.parcelas, f.aportes, f.saldo, f.acumulado]),
    },
  ];
}

/** CSV no padrão do Excel em português: separador ";" e decimal com vírgula. */
export function relatorioCSV(secoes: Secao[], geradoEm = new Date()): string {
  const esc = (v: Celula) => {
    const r = typeof v === 'number' ? Math.round(v * 100) / 100 : 0;
    const s = typeof v !== 'number' ? v : Number.isInteger(r) ? String(r) : r.toFixed(2).replace('.', ',');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const partes = [`Relatório Metas e Projetos — FinOk;Gerado em ${geradoEm.toLocaleString('pt-BR')}`];
  for (const s of secoes) {
    partes.push('', s.titulo, s.cabecalho.map(esc).join(';'));
    for (const l of s.linhas) partes.push(l.map(esc).join(';'));
  }
  return '﻿' + partes.join('\r\n');
}

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Página HTML pronta para impressão / "Salvar como PDF". */
export function relatorioHTML(secoes: Secao[], geradoEm = new Date()): string {
  const tabelas = secoes
    .map((s) => {
      const corpo = s.linhas.length
        ? s.linhas
            .map(
              (l) =>
                `<tr>${l
                  .map((c, i) => {
                    const moeda = s.moeda?.includes(i) && typeof c === 'number';
                    const neg = moeda && (c as number) < 0;
                    return `<td class="${moeda ? 'num' : ''}${neg ? ' neg' : ''}">${escHtml(moeda ? brl(c as number) : String(c))}</td>`;
                  })
                  .join('')}</tr>`,
            )
            .join('')
        : `<tr><td colspan="${s.cabecalho.length}" class="vazio">Nenhum registro</td></tr>`;
      return `<h2>${escHtml(s.titulo)}</h2><table><thead><tr>${s.cabecalho
        .map((c, i) => `<th class="${s.moeda?.includes(i) ? 'num' : ''}">${escHtml(c)}</th>`)
        .join('')}</tr></thead><tbody>${corpo}</tbody></table>`;
    })
    .join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório Metas e Projetos</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:32px;font-size:12px}
  h1{font-size:20px;margin:0;color:#065f46} .sub{color:#64748b;margin:4px 0 24px}
  h2{font-size:14px;margin:24px 0 8px;color:#065f46;border-bottom:2px solid #059669;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;page-break-inside:auto} tr{page-break-inside:avoid}
  th{background:#f1f5f9;text-align:left;font-weight:600;padding:6px 8px;border-bottom:1px solid #cbd5e1}
  td{padding:5px 8px;border-bottom:1px solid #e2e8f0} th,td{font-size:11px} .num{text-align:right;white-space:nowrap}
  .neg{color:#dc2626;font-weight:600} .vazio{color:#94a3b8;text-align:center}
  @page{margin:14mm} @media print{body{margin:0}}
</style></head><body>
<h1>Relatório — Metas e Projetos</h1>
<p class="sub">FinOk · gerado em ${escHtml(geradoEm.toLocaleString('pt-BR'))}</p>
${tabelas}
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`;
}

function baixarArquivo(conteudo: string, nome: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Abre o relatório numa nova aba já com a janela de impressão. Se o navegador bloquear, baixa o .html. */
function abrirParaImprimir(html: string, nome: string) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const janela = window.open(url, '_blank');
  if (!janela) baixarArquivo(html, nome, 'text/html');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Valida um backup importado; devolve null se o arquivo não for um backup deste módulo. */
export function lerBackup(texto: string): Estado | null {
  try {
    const d = JSON.parse(texto) as Partial<Estado> & { app?: string };
    if (d.app !== 'finok-metas-projetos') return null;
    if (!Array.isArray(d.projetos) || !Array.isArray(d.aportes) || !Array.isArray(d.parcelas)) return null;
    return {
      config: { ...estadoInicial.config, ...d.config },
      projetos: d.projetos,
      aportes: d.aportes,
      parcelas: d.parcelas,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

type Aba = 'projetos' | 'aportes' | 'parcelas' | 'fluxo' | 'config';

export default function MetasProjetos({
  inicial,
  salvar,
  transacoes = [],
}: {
  inicial: Partial<Estado> | null;
  salvar: (estado: Estado) => Promise<ResultadoSalvar>;
  transacoes?: TransacaoFinOk[];
}) {
  const [estado, setEstado] = useState<Estado>(() => doBanco(inicial));
  const [gravacao, setGravacao] = useState<{ status: 'salvo' | 'salvando' | 'erro'; erro?: string }>({ status: 'salvo' });
  const primeiraVez = useRef(true);
  const [aba, setAba] = useState<Aba>('projetos');
  const [editando, setEditando] = useState<Projeto | null>(null);
  const [aportando, setAportando] = useState<Projeto | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const hoje = mesAtual();

  // Grava no banco 600 ms depois da última alteração (o estado inteiro de uma vez).
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    setGravacao({ status: 'salvando' });
    const t = setTimeout(() => {
      salvar(estado)
        .then((r) => setGravacao(r.ok ? { status: 'salvo' } : { status: 'erro', erro: r.error }))
        .catch(() => setGravacao({ status: 'erro', erro: 'Sem conexão com o servidor.' }));
    }, 600);
    return () => clearTimeout(t);
  }, [estado, salvar]);

  // Avisa antes de fechar a aba com alteração ainda não gravada.
  useEffect(() => {
    if (gravacao.status === 'salvo') return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [gravacao.status]);

  const { config, projetos, aportes, parcelas } = estado;

  const capTransacoes = useMemo(() => capacidadePorTransacoes(transacoes, hoje), [transacoes, hoje]);
  const parcelasHoje = parcelasNoMes(parcelas, hoje);
  const capacidadeManual =
    config.rendaLiquida - config.gastosFixos - config.gastosVariaveis - parcelasHoje;
  const capacidade =
    config.fonteCapacidade === 'transacoes' && transacoes.length > 0
      ? capTransacoes.capacidade
      : capacidadeManual;

  const projetosOrdenados = useMemo(
    () =>
      [...projetos].sort(
        (a, b) =>
          Number(a.status === 'Concluído') - Number(b.status === 'Concluído') ||
          a.prioridade - b.prioridade ||
          ORDEM_TIPO[a.tipo] - ORDEM_TIPO[b.tipo] ||
          a.prazo.localeCompare(b.prazo),
      ),
    [projetos],
  );

  const aportesNecessarios = projetos.reduce((s, p) => s + aporteMensal(p, aportes, hoje), 0);
  const folga = capacidade - aportesNecessarios;

  const fluxo = useMemo(() => {
    let acumulado = 0;
    return Array.from({ length: 12 }, (_, i) => {
      const mes = somarMeses(hoje, i);
      const parc = parcelasNoMes(parcelas, mes);
      const aport = projetos
        .filter((p) => p.prazo >= mes)
        .reduce((s, p) => s + aporteMensal(p, aportes, hoje), 0);
      const saldo =
        config.rendaLiquida - config.gastosFixos - config.gastosVariaveis - parc - aport;
      // eslint-disable-next-line react-hooks/immutability -- variável local do useMemo, não estado
      acumulado += saldo;
      return { mes, rotulo: nomeMes(mes), parcelas: parc, aportes: aport, saldo, acumulado };
    });
  }, [hoje, parcelas, projetos, aportes, config]);

  /* ---------- ações ---------- */
  const salvarProjeto = (p: Projeto) =>
    setEstado((e) => ({
      ...e,
      projetos: e.projetos.some((x) => x.id === p.id)
        ? e.projetos.map((x) => (x.id === p.id ? p : x))
        : [...e.projetos, p],
    }));

  const excluirProjeto = (id: string) => {
    if (!confirm('Excluir este projeto e os aportes ligados a ele?')) return;
    setEstado((e) => ({
      ...e,
      projetos: e.projetos.filter((p) => p.id !== id),
      aportes: e.aportes.filter((a) => a.projetoId !== id),
    }));
  };

  const registrarAporte = (a: Aporte) =>
    setEstado((e) => {
      const projetos = e.projetos.map((p) =>
        p.id === a.projetoId && p.status === 'Planejado' ? { ...p, status: 'Em andamento' as const } : p,
      );
      return { ...e, projetos, aportes: [...e.aportes, a] };
    });

  const excluirAporte = (id: string) =>
    setEstado((e) => ({ ...e, aportes: e.aportes.filter((a) => a.id !== id) }));

  const salvarParcela = (p: Parcela) => setEstado((e) => ({ ...e, parcelas: [...e.parcelas, p] }));
  const excluirParcela = (id: string) =>
    setEstado((e) => ({ ...e, parcelas: e.parcelas.filter((p) => p.id !== id) }));

  const atualizarConfig = (c: Partial<ConfigPlanejamento>) =>
    setEstado((e) => ({ ...e, config: { ...e.config, ...c } }));

  /* ---------- relatório e backup ---------- */
  const dataArquivo = () => new Date().toISOString().slice(0, 10);

  const baixarPDF = () => {
    setMenuAberto(false);
    abrirParaImprimir(
      relatorioHTML(montarRelatorio(estado, capacidade, fluxo, hoje)),
      `relatorio-metas-${dataArquivo()}.html`,
    );
  };

  const baixarExcel = () => {
    setMenuAberto(false);
    baixarArquivo(
      relatorioCSV(montarRelatorio(estado, capacidade, fluxo, hoje)),
      `relatorio-metas-${dataArquivo()}.csv`,
      'text/csv;charset=utf-8',
    );
  };

  const baixarBackup = () => {
    setMenuAberto(false);
    baixarArquivo(
      JSON.stringify({ app: 'finok-metas-projetos', versao: 1, exportadoEm: new Date().toISOString(), ...estado }, null, 2),
      `backup-metas-${dataArquivo()}.json`,
      'application/json',
    );
  };

  const restaurarBackup = (arquivo: File | undefined) => {
    setMenuAberto(false);
    if (!arquivo) return;
    arquivo.text().then((texto) => {
      const dados = lerBackup(texto);
      if (!dados) {
        alert('Este arquivo não é um backup válido do módulo Metas e Projetos.');
        return;
      }
      const resumo = `${dados.projetos.length} projeto(s), ${dados.aportes.length} aporte(s) e ${dados.parcelas.length} parcela(s)`;
      if (confirm(`Restaurar ${resumo}? Os dados atuais deste planejamento serão substituídos.`)) setEstado(dados);
    });
  };

  /* ---------- render ---------- */
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-brand-600" />
          <h2 className="text-xl font-semibold text-slate-900">Metas e Projetos</h2>
          <span
            role="status"
            className={`ml-2 text-xs ${gravacao.status === 'erro' ? 'font-medium text-red-600' : 'text-slate-400'}`}
          >
            {gravacao.status === 'salvando'
              ? 'Salvando…'
              : gravacao.status === 'erro'
                ? `Não foi salvo: ${gravacao.erro ?? 'tente de novo.'}`
                : 'Salvo'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setMenuAberto((v) => !v)}
              aria-expanded={menuAberto}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Relatório <ChevronDown className="h-4 w-4" />
            </button>
            {menuAberto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <ItemMenu icone={<FileText className="h-4 w-4" />} titulo="PDF" detalhe="Abre para imprimir ou salvar como PDF" onClick={baixarPDF} />
                  <ItemMenu icone={<FileSpreadsheet className="h-4 w-4" />} titulo="Excel (.csv)" detalhe="Planilha com todas as tabelas" onClick={baixarExcel} />
                  <div className="my-1 border-t border-slate-100" />
                  <ItemMenu icone={<HardDriveDownload className="h-4 w-4" />} titulo="Fazer backup" detalhe="Salva seus dados em um arquivo .json" onClick={baixarBackup} />
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2 text-left hover:bg-slate-50">
                    <span className="mt-0.5 text-slate-500"><HardDriveUpload className="h-4 w-4" /></span>
                    <span>
                      <span className="block text-sm font-medium text-slate-800">Restaurar backup</span>
                      <span className="block text-xs text-slate-500">Carrega um .json salvo antes</span>
                    </span>
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(e) => {
                        restaurarBackup(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setEditando(novoProjeto())}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Novo projeto
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          icone={<Wallet className="h-5 w-5" />}
          rotulo="Capacidade de poupança/mês"
          valor={brl(capacidade)}
          nota={config.fonteCapacidade === 'transacoes' && transacoes.length ? 'Média dos últimos 3 meses' : 'Informada em Configuração'}
        />
        <Kpi icone={<PiggyBank className="h-5 w-5" />} rotulo="Aportes necessários/mês" valor={brl(aportesNecessarios)} />
        <Kpi
          icone={folga >= 0 ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          rotulo="Folga mensal"
          valor={brl(folga)}
          tom={folga >= 0 ? 'ok' : 'alerta'}
        />
      </div>

      {folga < 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Os aportes passam da capacidade em <strong>{brl(-folga)}</strong> por mês. Estenda prazos, reduza valores
            ou adie os projetos de menor prioridade.
          </p>
        </div>
      )}

      {/* Abas */}
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {(
          [
            ['projetos', 'Projetos', Target],
            ['aportes', 'Aportes', PiggyBank],
            ['parcelas', 'Parcelas', CreditCard],
            ['fluxo', 'Fluxo 12 meses', TrendingUp],
            ['config', 'Configuração', Settings],
          ] as const
        ).map(([id, rotulo, Icone]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              aba === id
                ? 'border-brand-600 font-medium text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icone className="h-4 w-4" /> {rotulo}
          </button>
        ))}
      </nav>

      {aba === 'projetos' && (
        <div className="grid gap-3 md:grid-cols-2">
          {projetosOrdenados.length === 0 && (
            <Vazio texto="Nenhum projeto ainda. Comece pela reserva de emergência." />
          )}
          {projetosOrdenados.map((p) => {
            const guardado = totalGuardado(p, aportes);
            const alvo = valorAlvo(p);
            const pct = alvo > 0 ? Math.min(1, guardado / alvo) : 0;
            const mensal = aporteMensal(p, aportes, hoje);
            const vencido = p.prazo < hoje && guardado < alvo && p.status !== 'Concluído';
            return (
              <article
                key={p.id}
                className={`rounded-xl border p-4 ${
                  p.status === 'Adiado' ? 'opacity-60' : ''
                } border-slate-200 bg-white`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-slate-900">{p.nome}</h3>
                    <p className="text-xs text-slate-500">
                      {p.tipo} · prioridade {p.prioridade} · {p.formaPagamento} · {p.status}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <IconeBotao titulo="Editar" onClick={() => setEditando(p)}>
                      <Pencil className="h-4 w-4" />
                    </IconeBotao>
                    <IconeBotao titulo="Excluir" onClick={() => excluirProjeto(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconeBotao>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct * 100}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>
                    {brl(guardado)} de {brl(alvo)}
                  </span>
                  <span>{Math.round(pct * 100)}%</span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Prazo</dt>
                    <dd className={vencido ? 'font-medium text-red-600' : 'text-slate-800'}>
                      {nomeMes(p.prazo)} {vencido && '· vencido'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Guardar por mês</dt>
                    <dd className="font-semibold text-slate-900">{brl(mensal)}</dd>
                  </div>
                </dl>

                {p.status !== 'Concluído' && (
                  <button
                    onClick={() => setAportando(p)}
                    className="mt-3 w-full rounded-lg border border-brand-600 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                  >
                    Registrar aporte
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {aba === 'aportes' && (
        <Tabela
          vazio="Nenhum aporte registrado."
          cabecalho={['Data', 'Projeto', 'Valor', 'Obs.', '']}
          linhas={[...aportes]
            .sort((a, b) => b.data.localeCompare(a.data))
            .map((a) => [
              new Date(a.data + 'T12:00').toLocaleDateString('pt-BR'),
              projetos.find((p) => p.id === a.projetoId)?.nome ?? '—',
              brl(a.valor),
              a.obs ?? '',
              <IconeBotao key="x" titulo="Excluir" onClick={() => excluirAporte(a.id)}>
                <Trash2 className="h-4 w-4" />
              </IconeBotao>,
            ])}
        />
      )}

      {aba === 'parcelas' && (
        <div className="space-y-4">
          <FormParcela onSalvar={salvarParcela} />
          <Tabela
            vazio="Nenhuma compra parcelada cadastrada."
            cabecalho={['Descrição', 'Parcela', 'Período', 'Saldo devedor', '']}
            linhas={parcelas.map((p) => [
              p.descricao,
              `${brl(p.valorParcela)} × ${p.numParcelas}`,
              `${nomeMes(p.primeiroMes)} → ${nomeMes(somarMeses(p.primeiroMes, p.numParcelas - 1))}`,
              brl(saldoDevedor(p, hoje)),
              <IconeBotao key="x" titulo="Excluir" onClick={() => excluirParcela(p.id)}>
                <Trash2 className="h-4 w-4" />
              </IconeBotao>,
            ])}
          />
        </div>
      )}

      {aba === 'fluxo' && (
        <div className="space-y-4">
          <div className="h-64 rounded-xl border border-slate-200 bg-white p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fluxo} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="rotulo" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} width={60} />
                <Tooltip formatter={(v) => brl(Number(v))} />
                <ReferenceLine y={0} stroke="#ef4444" />
                <Line type="monotone" dataKey="acumulado" name="Saldo acumulado" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Tabela
            vazio=""
            cabecalho={['Mês', 'Parcelas', 'Aportes', 'Saldo do mês', 'Acumulado']}
            linhas={fluxo.map((f) => [
              f.rotulo,
              brl(f.parcelas),
              brl(f.aportes),
              <span key="s" className={f.saldo < 0 ? 'font-medium text-red-600' : ''}>{brl(f.saldo)}</span>,
              <span key="a" className={f.acumulado < 0 ? 'font-medium text-red-600' : ''}>{brl(f.acumulado)}</span>,
            ])}
          />
          <p className="text-xs text-slate-500">
            Projeção com renda, gastos fixos e variáveis da Configuração. Meses com 13º, férias ou IPVA não estão
            incluídos.
          </p>
        </div>
      )}

      {aba === 'config' && (
        <div className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <Campo rotulo="Renda líquida mensal">
            <InputNumero valor={config.rendaLiquida} onChange={(v) => atualizarConfig({ rendaLiquida: v })} />
          </Campo>
          <Campo rotulo="Gastos fixos (moradia, escola, contas…)">
            <InputNumero valor={config.gastosFixos} onChange={(v) => atualizarConfig({ gastosFixos: v })} />
          </Campo>
          <Campo rotulo="Gastos variáveis (média mensal)">
            <InputNumero valor={config.gastosVariaveis} onChange={(v) => atualizarConfig({ gastosVariaveis: v })} />
          </Campo>
          <p className="text-sm text-slate-600">
            Parcelas deste mês: <strong>{brl(parcelasHoje)}</strong> · Capacidade manual:{' '}
            <strong>{brl(capacidadeManual)}</strong>
          </p>
          <Campo rotulo="Calcular a capacidade de poupança por">
            <select
              value={config.fonteCapacidade}
              onChange={(e) => atualizarConfig({ fonteCapacidade: e.target.value as ConfigPlanejamento['fonteCapacidade'] })}
              className={classeInput}
            >
              <option value="manual">Valores informados acima</option>
              <option value="transacoes" disabled={transacoes.length === 0}>
                Transações do FinOk (média dos últimos 3 meses)
              </option>
            </select>
          </Campo>
          {transacoes.length > 0 && (
            <p className="text-xs text-slate-500">
              Pelas transações: entradas {brl(capTransacoes.mediaEntradas)} − saídas{' '}
              {brl(capTransacoes.mediaSaidas)} = {brl(capTransacoes.capacidade)}/mês
            </p>
          )}
        </div>
      )}

      {editando && (
        <ModalProjeto
          projeto={editando}
          onFechar={() => setEditando(null)}
          onSalvar={(p) => {
            salvarProjeto(p);
            setEditando(null);
          }}
        />
      )}
      {aportando && (
        <ModalAporte
          projeto={aportando}
          sugerido={aporteMensal(aportando, aportes, hoje)}
          onFechar={() => setAportando(null)}
          onSalvar={(a) => {
            registrarAporte(a);
            setAportando(null);
          }}
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponentes                                                      */
/* ------------------------------------------------------------------ */

const classeInput =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none';

function novoProjeto(): Projeto {
  return {
    id: uid(),
    nome: '',
    tipo: 'Necessidade',
    prioridade: 3,
    valorEstimado: 0,
    margem: 0.1,
    prazo: somarMeses(mesAtual(), 12),
    formaPagamento: 'À vista',
    guardadoInicial: 0,
    status: 'Planejado',
  };
}

function Kpi({
  icone,
  rotulo,
  valor,
  nota,
  tom = 'neutro',
}: {
  icone: ReactNode;
  rotulo: string;
  valor: string;
  nota?: string;
  tom?: 'neutro' | 'ok' | 'alerta';
}) {
  const cor =
    tom === 'alerta' ? 'text-red-600' : tom === 'ok' ? 'text-brand-600' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icone} {rotulo}
      </div>
      <p className={`mt-1 text-2xl font-semibold ${cor}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-slate-400">{nota}</p>}
    </div>
  );
}

function IconeBotao({ children, titulo, onClick }: { children: ReactNode; titulo: string; onClick: () => void }) {
  return (
    <button
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
    >
      {children}
    </button>
  );
}

function ItemMenu({ icone, titulo, detalhe, onClick }: { icone: ReactNode; titulo: string; detalhe: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-slate-50">
      <span className="mt-0.5 text-slate-500">{icone}</span>
      <span>
        <span className="block text-sm font-medium text-slate-800">{titulo}</span>
        <span className="block text-xs text-slate-500">{detalhe}</span>
      </span>
    </button>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {texto}
    </p>
  );
}

function Tabela({ cabecalho, linhas, vazio }: { cabecalho: string[]; linhas: ReactNode[][]; vazio: string }) {
  if (linhas.length === 0 && vazio) return <Vazio texto={vazio} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            {cabecalho.map((c, i) => (
              <th key={i} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {linhas.map((l, i) => (
            <tr key={i}>
              {l.map((c, j) => (
                <td key={j} className="whitespace-nowrap px-3 py-2 text-slate-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{rotulo}</span>
      {children}
    </label>
  );
}

function InputNumero({ valor, onChange, passo = 0.01 }: { valor: number; onChange: (v: number) => void; passo?: number }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={passo}
      value={Number.isFinite(valor) ? valor : 0}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={classeInput}
    />
  );
}

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onFechar}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>
          <IconeBotao titulo="Fechar" onClick={onFechar}>
            <X className="h-5 w-5" />
          </IconeBotao>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalProjeto({
  projeto,
  onFechar,
  onSalvar,
}: {
  projeto: Projeto;
  onFechar: () => void;
  onSalvar: (p: Projeto) => void;
}) {
  const [p, setP] = useState<Projeto>(projeto);
  const set = <K extends keyof Projeto>(k: K, v: Projeto[K]) => setP((x) => ({ ...x, [k]: v }));
  const valido = p.nome.trim() !== '' && p.valorEstimado > 0 && /^\d{4}-\d{2}$/.test(p.prazo);

  return (
    <Modal titulo={projeto.nome ? 'Editar projeto' : 'Novo projeto'} onFechar={onFechar}>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) onSalvar({ ...p, nome: p.nome.trim() });
        }}
      >
        <div className="col-span-2">
          <Campo rotulo="Nome">
            <input value={p.nome} onChange={(e) => set('nome', e.target.value)} className={classeInput} autoFocus />
          </Campo>
        </div>
        <Campo rotulo="Tipo">
          <select value={p.tipo} onChange={(e) => set('tipo', e.target.value as TipoProjeto)} className={classeInput}>
            {Object.keys(ORDEM_TIPO).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Prioridade (1 = alta)">
          <select
            value={p.prioridade}
            onChange={(e) => set('prioridade', Number(e.target.value) as Projeto['prioridade'])}
            className={classeInput}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Valor estimado (R$)">
          <InputNumero valor={p.valorEstimado} onChange={(v) => set('valorEstimado', v)} />
        </Campo>
        <Campo rotulo="Margem p/ imprevistos (%)">
          <InputNumero valor={Math.round(p.margem * 100)} passo={1} onChange={(v) => set('margem', v / 100)} />
        </Campo>
        <Campo rotulo="Prazo">
          <input type="month" value={p.prazo} onChange={(e) => set('prazo', e.target.value)} className={classeInput} />
        </Campo>
        <Campo rotulo="Forma de pagamento">
          <select
            value={p.formaPagamento}
            onChange={(e) => set('formaPagamento', e.target.value as FormaPagamento)}
            className={classeInput}
          >
            {['À vista', 'Parcelado', 'Financiado', 'Consórcio'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Já guardado antes (R$)">
          <InputNumero valor={p.guardadoInicial} onChange={(v) => set('guardadoInicial', v)} />
        </Campo>
        <Campo rotulo="Status">
          <select value={p.status} onChange={(e) => set('status', e.target.value as StatusProjeto)} className={classeInput}>
            {['Planejado', 'Em andamento', 'Concluído', 'Adiado'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Campo>

        <p className="col-span-2 flex items-center gap-1.5 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">
          <CalendarClock className="h-4 w-4" />
          Valor-alvo {brl(valorAlvo(p))} · {mesesAte(p.prazo)} meses ·{' '}
          <strong>{brl(Math.max(0, valorAlvo(p) - p.guardadoInicial) / mesesAte(p.prazo))}/mês</strong>
        </p>

        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <button type="button" onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!valido}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalAporte({
  projeto,
  sugerido,
  onFechar,
  onSalvar,
}: {
  projeto: Projeto;
  sugerido: number;
  onFechar: () => void;
  onSalvar: (a: Aporte) => void;
}) {
  const [valor, setValor] = useState(Math.round(sugerido * 100) / 100);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState('');
  return (
    <Modal titulo={`Aporte — ${projeto.nome}`} onFechar={onFechar}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valor > 0) onSalvar({ id: uid(), projetoId: projeto.id, data, valor, obs: obs || undefined });
        }}
      >
        <Campo rotulo={`Valor (sugerido: ${brl(sugerido)})`}>
          <InputNumero valor={valor} onChange={setValor} />
        </Campo>
        <Campo rotulo="Data">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={classeInput} />
        </Campo>
        <Campo rotulo="Observação (opcional)">
          <input value={obs} onChange={(e) => setObs(e.target.value)} className={classeInput} />
        </Campo>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={valor <= 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Registrar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FormParcela({ onSalvar }: { onSalvar: (p: Parcela) => void }) {
  const [descricao, setDescricao] = useState('');
  const [valorParcela, setValorParcela] = useState(0);
  const [numParcelas, setNumParcelas] = useState(1);
  const [primeiroMes, setPrimeiroMes] = useState(mesAtual());
  const valido = descricao.trim() !== '' && valorParcela > 0 && numParcelas >= 1;
  return (
    <form
      className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valido) return;
        onSalvar({ id: uid(), descricao: descricao.trim(), valorParcela, numParcelas, primeiroMes });
        setDescricao('');
        setValorParcela(0);
        setNumParcelas(1);
      }}
    >
      <div className="col-span-2">
        <Campo rotulo="Descrição">
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={classeInput} />
        </Campo>
      </div>
      <Campo rotulo="Valor da parcela">
        <InputNumero valor={valorParcela} onChange={setValorParcela} />
      </Campo>
      <Campo rotulo="Nº de parcelas">
        <InputNumero valor={numParcelas} passo={1} onChange={(v) => setNumParcelas(Math.max(1, Math.round(v)))} />
      </Campo>
      <Campo rotulo="1ª parcela">
        <input type="month" value={primeiroMes} onChange={(e) => setPrimeiroMes(e.target.value)} className={classeInput} />
      </Campo>
      <div className="col-span-2 flex justify-end sm:col-span-5">
        <button
          type="submit"
          disabled={!valido}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Adicionar parcela
        </button>
      </div>
    </form>
  );
}
