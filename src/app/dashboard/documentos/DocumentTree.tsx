"use client";

import Link from "next/link";
import { useState } from "react";

interface TreeProcess {
  processId: string;
  label: string;
  docCount: number;
  receiptCount: number;
}

interface TreeClient {
  clientId: string;
  clientName: string;
  processes: TreeProcess[];
}

interface Props {
  tree: TreeClient[];
  clientId?: string;
  processId?: string;
  folder?: string;
}

function folderHref(clientId: string, processId: string, folder: string) {
  return `/dashboard/documentos?clientId=${clientId}&processId=${processId}&folder=${folder}`;
}

export function DocumentTree({ tree, clientId, processId, folder }: Props) {
  const [openClients, setOpenClients] = useState<Set<string>>(
    () => new Set(clientId ? [clientId] : [])
  );
  const [openProcesses, setOpenProcesses] = useState<Set<string>>(
    () => new Set(processId ? [processId] : [])
  );

  function toggleClient(id: string) {
    setOpenClients((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleProcess(id: string) {
    setOpenProcesses((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <nav className="flex flex-col gap-0.5 py-2">
      {/* Root */}
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        Todos os clientes
      </div>

      {tree.map((client) => {
        const clientOpen = openClients.has(client.clientId);
        const isClientActive = clientId === client.clientId;
        const totalDocs = client.processes.reduce((s, p) => s + p.docCount + p.receiptCount, 0);

        return (
          <div key={client.clientId}>
            {/* Client row */}
            <button
              onClick={() => toggleClient(client.clientId)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors rounded-none hover:bg-gray-50 ${
                isClientActive && !processId ? "bg-gray-100 font-medium" : ""
              }`}
            >
              <span className="text-gray-400 text-xs w-3 flex-none">
                {clientOpen ? "▾" : "▸"}
              </span>
              <svg className="w-4 h-4 flex-none text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="flex-1 truncate text-gray-800">{client.clientName}</span>
              {totalDocs > 0 && (
                <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 flex-none">
                  {totalDocs}
                </span>
              )}
            </button>

            {/* Processes */}
            {clientOpen && (
              <div>
                {client.processes.map((proc) => {
                  const procOpen = openProcesses.has(proc.processId);
                  const isProcActive = processId === proc.processId;

                  return (
                    <div key={proc.processId}>
                      {/* Process row */}
                      <button
                        onClick={() => toggleProcess(proc.processId)}
                        className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 text-sm text-left transition-colors hover:bg-gray-50 ${
                          isProcActive && !folder ? "bg-gray-100 font-medium" : ""
                        }`}
                      >
                        <span className="text-gray-400 text-xs w-3 flex-none">
                          {procOpen ? "▾" : "▸"}
                        </span>
                        <svg className="w-4 h-4 flex-none text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <span className="flex-1 truncate text-gray-700 text-xs">{proc.label}</span>
                      </button>

                      {/* Sub-folders */}
                      {procOpen && (
                        <div>
                          {proc.docCount > 0 || true ? (
                            <Link
                              href={folderHref(client.clientId, proc.processId, "documentos")}
                              className={`flex items-center gap-2 pl-14 pr-3 py-1.5 text-xs transition-colors hover:bg-gray-50 ${
                                isProcActive && folder === "documentos"
                                  ? "bg-[var(--signal-500)] bg-opacity-10 text-[var(--signal-500)] font-medium"
                                  : "text-gray-600"
                              }`}
                            >
                              <svg className="w-3.5 h-3.5 flex-none" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                              </svg>
                              Documentos
                              {proc.docCount > 0 && (
                                <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5">
                                  {proc.docCount}
                                </span>
                              )}
                            </Link>
                          ) : null}

                          <Link
                            href={folderHref(client.clientId, proc.processId, "recibos")}
                            className={`flex items-center gap-2 pl-14 pr-3 py-1.5 text-xs transition-colors hover:bg-gray-50 ${
                              isProcActive && folder === "recibos"
                                ? "bg-[var(--signal-500)] bg-opacity-10 text-[var(--signal-500)] font-medium"
                                : "text-gray-600"
                            }`}
                          >
                            <svg className="w-3.5 h-3.5 flex-none" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                            Recibos
                            {proc.receiptCount > 0 && (
                              <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 rounded-full px-1.5">
                                {proc.receiptCount}
                              </span>
                            )}
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {tree.length === 0 && (
        <p className="px-4 py-6 text-xs text-gray-400 text-center">Nenhum documento encontrado.</p>
      )}
    </nav>
  );
}
