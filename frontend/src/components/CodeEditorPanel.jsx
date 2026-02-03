import React from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditorPanel({ code, onChange }) {
  return (
    <div className="editor-panel">
      <Editor height="70vh" defaultLanguage="python" value={code} onChange={(v)=>onChange(v || '')} />
    </div>
  );
}
