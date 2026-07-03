import React, { useState } from "react";
import { downloadChatMediaFile } from "../../lib/chat/chatDisplayHelpers";
import { showErrorAlert } from "../../lib/global/alertHelper";

type ChatMessageFileProps = {
  fileUrl: string;
  fileName: string;
  isPdf?: boolean;
};

const ChatMessageFile: React.FC<ChatMessageFileProps> = ({
  fileUrl,
  fileName,
  isPdf = false,
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    const key = String(fileUrl ?? "").trim();
    if (!key || downloading) return;

    setDownloading(true);
    const ok = await downloadChatMediaFile(key, fileName);
    setDownloading(false);

    if (!ok) {
      showErrorAlert("Could not download the file. Please try again.");
    }
  };

  return (
    <button
      type="button"
      className="normal-chat-bubble-file"
      onClick={() => void handleDownload()}
      disabled={downloading}
      aria-label={isPdf ? `Download ${fileName}` : `Open ${fileName}`}
    >
      <i className={`bi ${isPdf ? "bi-file-earmark-pdf" : "bi-file-earmark-text"}`} />
      <span className="normal-chat-bubble-file-name">{fileName}</span>
      <i
        className={`bi normal-chat-bubble-file-action ${
          downloading ? "bi-hourglass-split" : "bi-download"
        }`}
        aria-hidden
      />
    </button>
  );
};

export default ChatMessageFile;
