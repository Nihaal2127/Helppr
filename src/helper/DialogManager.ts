import ReactDOM from "react-dom/client";

const openModals: Set<ReactDOM.Root> = new Set();

export const closeAllModals = () => {
  openModals.forEach((modalRoot) => modalRoot.unmount());
  openModals.clear();
};

export const openDialog = (
  modalId: string,
  render: (close: () => void) => React.ReactElement
) => {
  const existingModal = document.getElementById(modalId);
  if (existingModal) return;

  const modalContainer = document.createElement("div");
  modalContainer.id = modalId;
  document.body.appendChild(modalContainer);

  const root = ReactDOM.createRoot(modalContainer);
  openModals.add(root);

  const closeModal = () => {
    root.unmount();
    openModals.delete(root);

    if (modalContainer.parentNode) {
      modalContainer.parentNode.removeChild(modalContainer);
    }
  };

  root.render(render(closeModal));
};