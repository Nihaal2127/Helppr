import React from "react";
import editIcon from "../assets/icons/Edit.svg";
import deleteIcon from "../assets/icons/delete_action.svg";

const CustomActionColumn = ({
  row,
  onEdit,
  onDelete,
  onView,
}: {
  row: any;
  onEdit?: (partner: any) => void;
  onDelete?: (partner: any) => void;
  onView?: (partner: any) => void;
}) => {

  const handleAction = (action: string) => {
    if (action === "view" && onView) {
      onView(row.original);
    } else if (action === "edit" && onEdit) {
      onEdit(row.original);
    } else if (action === "delete" && onDelete) {
      onDelete(row.original);
    }
  };

  return (
    <>
      {onView && (
        <a
          href="#"
          className="action-icon"
          onClick={(e) => {
            e.preventDefault();
            handleAction("view");
          }}
        >
          <i className="mdi mdi-eye"></i>
        </a>
      )}
      {onEdit && (
        <img
          src={editIcon}
          alt="edit"
          className="custom-table-action-edit me-2"
          onClick={() => onEdit(row)}
        />
      )}

      {onDelete && (
        <img
          src={deleteIcon}
          alt="delete"
          className="custom-table-action-delete"
          onClick={() => onDelete(row)}
        />
      )}
    </>
  );
};

export default CustomActionColumn;
