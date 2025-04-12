import React from "react";
import eyeIcon from "../assets/icons/eye.svg";
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

  return (
    <>
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
