import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDocumentTree, getProcessDocuments } from "@/lib/actions/documentos";
import { DocumentTree } from "./DocumentTree";
import { DocumentFileGrid } from "./DocumentFileActions";
import Link from "next/link";

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const isPdf = ext === "pdf";
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: isPdf ? "#E11D48" : "var(--steel-400)" }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      {isPdf && <text x="6" y="18" fontSize="5" fill="currentColor" stroke="none" fontWeight="bold">PDF</text>}
    </svg>
  );
}

function Breadcrumb({
  tree,
  clientId,
  processId,
  folder,
}: {
  tree: Awaited<ReturnType<typeof getDocumentTree>>;
  clientId?: string;
  processId?: string;
  folder?: string;
}) {
  const client = tree.find((c) => c.clientId === clientId);
  const proc = client?.processes.find((p) => p.processId === processId);

  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500 min-w-0">
      <Link href="/dashboard/documentos" className="hover:text-gray-700">
        Documentos
      </Link>
      {client && (
        <>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 truncate">{client.clientName}</span>
        </>
      )}
      {proc && (
        <>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 truncate">{proc.label}</span>
        </>
      )}
      {folder && (
        <>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 capitalize">{folder}</span>
        </>
      )}
    </div>
  );
}

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; processId?: string; folder?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { clientId, processId, folder } = await searchParams;

  const [tree, fileData] = await Promise.all([
    getDocumentTree(),
    processId ? getProcessDocuments(processId) : Promise.resolve(null),
  ]);

  const client = tree.find((c) => c.clientId === clientId);
  const proc = client?.processes.find((p) => p.processId === processId);

  const showDocs = folder === "documentos" && fileData;
  const showRecibos = folder === "recibos" && fileData;

  return (
    <div className="flex h-screen -m-8 overflow-hidden">
      {/* Sidebar / árvore */}
      <div className="w-64 flex-none border-r border-gray-200 bg-white overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Explorador</p>
        </div>
        <DocumentTree
          tree={tree}
          clientId={clientId}
          processId={processId}
          folder={folder}
        />
      </div>

      {/* Painel principal */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
          <Breadcrumb tree={tree} clientId={clientId} processId={processId} folder={folder} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Estado inicial: nenhum processo selecionado */}
          {!processId && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
              <svg className="w-14 h-14 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-sm">Selecione um processo na árvore à esquerda</p>
            </div>
          )}

          {/* Processo selecionado mas sem pasta */}
          {processId && !folder && proc && (
            <div>
              <p className="text-sm text-gray-500 mb-4">Pastas do processo</p>
              <div className="flex gap-4">
                <Link
                  href={`/dashboard/documentos?clientId=${clientId}&processId=${processId}&folder=documentos`}
                  className="flex flex-col items-center gap-2 p-5 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all w-36"
                >
                  <svg className="w-10 h-10 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Documentos</span>
                  <span className="text-xs text-gray-400">{proc.docCount} arquivo{proc.docCount !== 1 ? "s" : ""}</span>
                </Link>
                <Link
                  href={`/dashboard/documentos?clientId=${clientId}&processId=${processId}&folder=recibos`}
                  className="flex flex-col items-center gap-2 p-5 bg-white border border-gray-200 rounded-lg hover:border-amber-300 hover:shadow-sm transition-all w-36"
                >
                  <svg className="w-10 h-10 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Recibos</span>
                  <span className="text-xs text-gray-400">{proc.receiptCount} arquivo{proc.receiptCount !== 1 ? "s" : ""}</span>
                </Link>
              </div>
            </div>
          )}

          {/* Documentos do processo */}
          {showDocs && processId && (
            <DocumentFileGrid docs={fileData.docs} processId={processId} />
          )}

          {/* Recibos de custos */}
          {showRecibos && (
            <>
              {fileData.receipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                  <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                  </svg>
                  <p className="text-sm">Nenhum recibo anexado neste processo</p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
                  {fileData.receipts.map((r) => (
                    <a
                      key={r.id}
                      href={r.receiptUrl!}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-center group"
                    >
                      <FileIcon name={r.receiptUrl!} />
                      <span className="text-xs text-gray-700 break-all line-clamp-2 group-hover:text-[var(--signal-500)]">
                        {r.description}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {fmtDate(r.date)}
                        {r.user && ` · ${r.user.name}`}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Status bar */}
        {(showDocs || showRecibos) && (
          <div className="bg-white border-t border-gray-200 px-5 py-2 text-xs text-gray-400 flex items-center gap-4">
            {showDocs && <span>{fileData!.docs.length} documento{fileData!.docs.length !== 1 ? "s" : ""}</span>}
            {showRecibos && <span>{fileData!.receipts.length} recibo{fileData!.receipts.length !== 1 ? "s" : ""}</span>}
            {processId && (
              <Link
                href={`/dashboard/operacao/${processId}`}
                className="ml-auto text-[var(--signal-500)] hover:underline"
              >
                Abrir processo →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
