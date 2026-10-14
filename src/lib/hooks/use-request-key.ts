"use client";
import { useRef } from "react";
/** A retry reuses the same key; changing the form starts a new request. */
export function useRequestKey() {
  const request = useRef<{payload:string;id:string} | null>(null);
  return (payload:unknown) => {
    const serialized=JSON.stringify(payload);
    if(request.current?.payload!==serialized) request.current={payload:serialized,id:crypto.randomUUID()};
    return request.current.id;
  };
}
