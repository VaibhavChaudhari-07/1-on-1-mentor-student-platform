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
  const [runOutput, setRunOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)

  const [isEditorReady, setIsEditorReady] = useState(false)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)

  useEffect(() => {
    if (!isEditorReady || !editorRef.current) return

    // Create Yjs document
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    // Create websocket provider (match backend /y-websocket upgrade path)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ''
    const wsUrl = (() => {
      if (backendUrl) {
        try {
          const parsed = new URL(backendUrl)
          const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
          return `${protocol}//${parsed.host}/y-websocket`
        } catch {
          // fallback to localhost
        }
      }
      if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        return `${protocol}//${window.location.hostname}:3001/y-websocket`
      }
      return 'ws://localhost:3001/y-websocket'
    })()

    const provider = new WebsocketProvider(
      wsUrl,
      sessionId,
      ydoc
    )
    providerRef.current = provider

    // Create Monaco binding
    const ytext = ydoc.getText('monaco')

    // If this is the first client, initialize with default document content
    if (ytext.length === 0) {
      ytext.insert(0, getDefaultValue(language))
    }

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
      providerRef.current = null
      ydocRef.current = null
    }
  }, [sessionId, isEditorReady])

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
    setIsEditorReady(true)

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

  const runCode = () => {
    if (!editorRef.current) {
      setRunOutput('Editor not initialized')
      return
    }

    const code = editorRef.current.getValue()
    setIsRunning(true)
    setRunOutput('Running...')

    setTimeout(() => {
      try {
        if (language === 'javascript') {
          const logs: string[] = []
          const originalConsoleLog = console.log
          console.log = (...args) => {
            logs.push(args.map(String).join(' '))
            originalConsoleLog(...args)
          }

          new Function(code)()
          console.log = originalConsoleLog

          setRunOutput(logs.length ? logs.join('\n') : 'Execution finished (no output)')
        } else {
          setRunOutput('Python execution is not supported in this offline mode')
        }
      } catch (err: any) {
        setRunOutput('Error: ' + (err?.message || String(err)))
      } finally {
        setIsRunning(false)
      }
    }, 100)
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

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={runCode}
          disabled={isRunning}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
        <span className="text-sm text-gray-600">Current language: {language}</span>
      </div>

      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Output</h3>
        <pre className="max-h-40 overflow-auto text-xs text-gray-800 whitespace-pre-wrap">{runOutput}</pre>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Real-time collaboration:</strong> Your changes sync instantly with other users in this session.
          Try changing the language or start coding together!
        </p>
      </div>
    </div>
  )
}