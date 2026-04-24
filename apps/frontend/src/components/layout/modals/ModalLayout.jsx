import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "../../ui/Button.jsx";

export const ModalLayout = ({
  open,
  title,
  children,
  saveLabel = "Enregistrer",
  cancelLabel = "Annuler",
  onClose,
  onSave,
  saveDisabled = false,
  isSaving = false,
  panelClassName = "",
  footerContent = null
}) => (
  <Transition appear show={open} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={onClose}>
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div data-ui="modal-overlay" className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm" />
      </Transition.Child>

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 md:p-6">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-4 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-4 scale-95"
          >
            <Dialog.Panel data-ui="modal-panel" className={`w-full max-w-3xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(10,15,13,0.98))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] ${panelClassName}`.trim()}>
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <Dialog.Title className="text-2xl font-semibold text-white">{title}</Dialog.Title>
              </div>

              <div className="py-6">{children}</div>

              {footerContent ?? (
                <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" className="px-5 py-3" onClick={onClose}>
                    {cancelLabel}
                  </Button>
                  <Button
                    type="button"
                    className="px-5 py-3"
                    disabled={saveDisabled || isSaving}
                    onClick={onSave}
                  >
                    {isSaving ? "Enregistrement..." : saveLabel}
                  </Button>
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
);
