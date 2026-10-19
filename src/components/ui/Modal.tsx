import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  abierto: boolean;
  tituloId: string;
  onCerrar: () => void;
  children: ReactNode;
}

/**
 * Modal accesible sobre <dialog> nativo: focus trap, Escape y fondo inerte vienen del navegador,
 * que además devuelve el foco al elemento que lo abrió. Móvil: bottom sheet; desde sm: centrado.
 */
export function Modal({ abierto, tituloId, onCerrar, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    else if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={tituloId}
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar(); // clic en el backdrop
      }}
      className="w-full max-w-md rounded-lg border border-border bg-surface p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm
                 max-sm:m-0 max-sm:mt-auto max-sm:max-h-[90dvh] max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-b-none max-sm:rounded-t-2xl"
    >
      {abierto && (
        <div className="max-h-[90dvh] overflow-y-auto p-5 max-sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      )}
    </dialog>
  );
}
