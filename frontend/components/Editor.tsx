'use client'

import { useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Socket } from 'socket.io-client'

interface EditorProps {
  socket: Socket
}

export default function CodeEditor({ socket }: EditorProps) {
  const editorRef = useRef<any>(null)

  useEffect(() => {
    socket.on('editor-change', (data: { value: string; event: any }) => {
      if (editorRef.current && data.event) {
        const { changes, eol, versionId } = data.event
        editorRef.current.getModel().applyEdits(changes)
      }
    })

    return () => {
      socket.off('editor-change')
    }
  }, [socket])

  const handleEditorChange = (value: string | undefined, event: any) => {
    socket.emit('editor-change', { value, event })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-lg font-semibold mb-4">Collaborative Editor</h2>
      <Editor
        height="400px"
        defaultLanguage="javascript"
        defaultValue="// Start coding here..."
        onChange={handleEditorChange}
        onMount={(editor) => {
          editorRef.current = editor
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
        }}
      />
    </div>
  )
}