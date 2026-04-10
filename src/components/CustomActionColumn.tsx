import React from "react";
import eyeIcon from "../assets/icons/eye.svg";

const CustomActionColumn = ({
  row,
  onEdit,
  onDelete,
  onChat,
  onView,
}: {
  row: any;
  onEdit?: (partner: any) => void;
  onDelete?: (partner: any) => void;
  onChat?: (partner: any) => void;
  onView?: (partner: any) => void;
}) => {

  return (
    <>
      {onChat && (
        <i
          className="bi bi-chat-left-dots fs-6 custom-table-action-chat me-2"
          onClick={() => onChat(row)}
          style={{ cursor: "pointer" }}
          aria-label="Open chat"
        />
      )}
      {onView && (
         <img
         src={eyeIcon}
         alt="view"
         width={24}
         height={24}
         className="custom-table-action-view me-2"
         onClick={() => onView(row)}
       />
      )}
      {onEdit && (
        // <img
        //   src={editIcon}
        //   alt="edit"
        //   className="custom-table-action-edit me-2"
        //   onClick={() => onEdit(row)}
        // />
        <i
    className="bi bi-pencil-fill fs-6 custom-table-action-edit me-2"
    onClick={() => onEdit(row)}
    style={{ cursor: "pointer" }}
  ></i>
      )}

      {onDelete && (
        // <img
        //   src={deleteIcon}
        //   alt="delete"
        //   className="custom-table-action-delete"
        //   onClick={() => onDelete(row)}
        // />
        <i className="bi bi-ban fs-6 custom-table-action-delete" onClick={() => onDelete(row)} style={{ cursor: "pointer" }}></i>
      )}
    </>
  );
};

export default CustomActionColumn;
