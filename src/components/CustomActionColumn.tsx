import React from "react";
import eyeIcon from "../assets/icons/eye.svg";

const CustomActionColumn = ({
  row,
  onEdit,
  onDelete,
  onChat,
  onView,
  onChangePassword,
}: {
  row: any;
  onEdit?: (partner: any) => void;
  onDelete?: (partner: any) => void;
  onChat?: (partner: any) => void;
  onView?: (partner: any) => void;
  /** When set, shown instead of the pencil edit control (e.g. super-admin password reset). */
  onChangePassword?: (partner: any) => void;
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
          style={{ cursor: "pointer" }}
        />
      )}
      {onChangePassword ? (
        <i
          className="bi bi-key-fill fs-6 custom-table-action-edit me-2"
          onClick={() => onChangePassword(row)}
          style={{ cursor: "pointer" }}
          aria-label="Change password"
          role="button"
        />
      ) : (
        onEdit && (
          <i
            className="bi bi-pencil-fill fs-6 custom-table-action-edit me-2"
            onClick={() => onEdit(row)}
            style={{ cursor: "pointer" }}
            aria-label="Edit"
          ></i>
        )
      )}

      {onDelete && (
        // <img
        //   src={deleteIcon}
        //   alt="delete"
        //   className="custom-table-action-delete"
        //   onClick={() => onDelete(row)}
        // />
        <i
          className="bi bi-ban fs-6 custom-table-action-delete"
          onClick={() => onDelete(row)}
          style={{ cursor: "pointer" }}
        ></i>
      )}
    </>
  );
};

export default CustomActionColumn;
