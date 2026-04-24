"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

export interface StreamingMessage {
  content: string
  isComplete: boolean
  error?: string
}

export function useStreaming() {
  const [content, setContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startStream = useCallback(async (url: string) => {
    setContent("")
    setIsStreaming(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/x-ndjson",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("Response body is not readable")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.c) {
              setContent((prev) => prev + data.c)
            }
          } catch (e) {
            console.warn("Error parsing NDJSON chunk", e)
          }
        }
      }
    } catch (err: any) {
      console.error("Streaming error:", err)
      setError(err.message || "An error occurred during streaming")
    } finally {
      setIsStreaming(false)
    }
  }, [])

  return { content, isStreaming, error, startStream }
}
