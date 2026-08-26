"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DocumentType, DocumentStatus } from "./_helpers";

export interface BrokerDocumentDTO {
  id: string;
  name: string;
  type: DocumentType;
  fileName: string;
  notes?: string;
  status: DocumentStatus;
  expiresAt?: string;
  uploadedAt: string;
}

export function useBrokerDocumentsData() {
  const [documents, setDocuments] = useState<BrokerDocumentDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/documents");
      setDocuments(res.ok ? await res.json() : []);
    } catch {
      toast.error("Could not load broker documents.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addDocument = useCallback(async (input: { name: string; type: string; fileName: string; expiresAt?: string; notes?: string }) => {
    const res = await fetch("/api/broker/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not upload document.", { description: body.error });
      return null;
    }
    setDocuments((prev) => [body, ...prev]);
    return body as BrokerDocumentDTO;
  }, []);

  return { documents, loaded, reload, addDocument };
}
