'use client'

import { useRef, useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import { editor } from 'monaco-editor'

interface CodeEditorProps {
  sessionId: string
}

export default function CodeEditor({ sessionId }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript')
  const [isConnected, setIsConnected] = useState(false)
  const [userCount, setUserCount] = useState(1)

  useEffect(() => {
    if (!editorRef.current) return

    // Create Yjs document
    const ydoc = new Y.Doc()

    // Create websocket provider
    const provider = new WebsocketProvider(
      `ws://localhost:3001`,
      sessionId,
      ydoc
    )

    // Create Monaco binding
    const ytext = ydoc.getText('monaco')
    const binding = new MonacoBinding(
      ytext,
      editorRef.current.getModel()!,
      new Set([editorRef.current]),
      provider.awareness
    )

    // Handle connection status
    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected')
    })

    // Handle user awareness
    provider.awareness.on('change', () => {
      setUserCount(provider.awareness.getStates().size)
    })

    // Cleanup
    return () => {
      binding.destroy()
      provider.destroy()
      ydoc.destroy()
    }
  }, [sessionId, language])

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor

    // Configure editor
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true,
    })
  }

  const handleLanguageChange = (newLanguage: 'javascript' | 'python') => {
    setLanguage(newLanguage)
    if (editorRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        editor.setModelLanguage(model, newLanguage)
      }
    }
  }

  const getDefaultValue = (lang: string) => {
    switch (lang) {
      case 'javascript':
        return `// Welcome to collaborative coding!
// Start typing and see your changes sync in real-time

function helloWorld() {
  console.log("Hello, World!");
}

helloWorld();`
      case 'python':
        return `# Welcome to collaborative coding!
# Start typing and see your changes sync in real-time

def hello_world():
    print("Hello, World!")

if __name__ == "__main__":
    hello_world()`
      default:
        return '// Start coding here...'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Collaborative Code Editor</h2>
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* User Count */}
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600">Users:</span>
            <span className="text-sm font-medium text-gray-900">{userCount}</span>
          </div>

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as 'javascript' | 'python')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </div>
      </div>

      {/* Editor */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <Editor
          height="500px"
          language={language}
          defaultValue={getDefaultValue(language)}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastColumn: 0,
            readOnly: false,
            theme: 'vs-light',
          }}
        />
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Real-time collaboration:</strong> Your changes sync instantly with other users in this session.
          Try changing the language or start coding together!
        </p>
      </div>
    </div>
  )
}