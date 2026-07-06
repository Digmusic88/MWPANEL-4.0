/**
 * Editor de texto rico TipTap para entradas de bitácora
 * Con autosave, toolbar personalizado y soporte para contenido educativo
 */

import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Link from '@tiptap/extension-link';
import {
  Button,
  Divider,
  Space,
  Tooltip,
  Select,
  message,
  Typography,
} from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  CheckSquareOutlined,
  LinkOutlined,
  TableOutlined,
  UndoOutlined,
  RedoOutlined,
  HighlightOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { TipTapEditorConfig } from '../../types/logbook.types';

const { Text } = Typography;

interface TipTapEditorProps extends TipTapEditorConfig {
  content?: any;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  toolbar?: boolean;
  statusBar?: boolean;
}

const MenuBar: React.FC<{ editor: any }> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const addTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const addLink = () => {
    const url = window.prompt('Ingresa la URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const setHeading = (level: number) => {
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  return (
    <div className="border-b border-gray-200 p-2 bg-gray-50 rounded-t-md">
      <Space wrap size="small">
        {/* Formato de texto */}
        <Select
          size="small"
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
              ? 'h2'
              : editor.isActive('heading', { level: 3 })
              ? 'h3'
              : 'p'
          }
          onChange={(value) => {
            switch (value) {
              case 'h1':
                setHeading(1);
                break;
              case 'h2':
                setHeading(2);
                break;
              case 'h3':
                setHeading(3);
                break;
              default:
                setHeading(0);
                break;
            }
          }}
          options={[
            { value: 'p', label: 'Párrafo' },
            { value: 'h1', label: 'Título 1' },
            { value: 'h2', label: 'Título 2' },
            { value: 'h3', label: 'Título 3' },
          ]}
          style={{ width: 100 }}
        />

        <Divider type="vertical" className="my-0" />

        {/* Formato básico */}
        <Tooltip title="Negrita">
          <Button
            size="small"
            icon={<BoldOutlined />}
            type={editor.isActive('bold') ? 'primary' : 'default'}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
        </Tooltip>

        <Tooltip title="Cursiva">
          <Button
            size="small"
            icon={<ItalicOutlined />}
            type={editor.isActive('italic') ? 'primary' : 'default'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
        </Tooltip>

        <Tooltip title="Resaltado">
          <Button
            size="small"
            icon={<HighlightOutlined />}
            type={editor.isActive('highlight') ? 'primary' : 'default'}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          />
        </Tooltip>

        <Divider type="vertical" className="my-0" />

        {/* Listas */}
        <Tooltip title="Lista con viñetas">
          <Button
            size="small"
            icon={<UnorderedListOutlined />}
            type={editor.isActive('bulletList') ? 'primary' : 'default'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
        </Tooltip>

        <Tooltip title="Lista numerada">
          <Button
            size="small"
            icon={<OrderedListOutlined />}
            type={editor.isActive('orderedList') ? 'primary' : 'default'}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
        </Tooltip>

        <Tooltip title="Lista de tareas">
          <Button
            size="small"
            icon={<CheckSquareOutlined />}
            type={editor.isActive('taskList') ? 'primary' : 'default'}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          />
        </Tooltip>

        <Divider type="vertical" className="my-0" />

        {/* Enlaces y tablas */}
        <Tooltip title="Insertar enlace">
          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={addLink}
          />
        </Tooltip>

        <Tooltip title="Insertar tabla">
          <Button
            size="small"
            icon={<TableOutlined />}
            onClick={addTable}
          />
        </Tooltip>

        <Divider type="vertical" className="my-0" />

        {/* Deshacer/Rehacer */}
        <Tooltip title="Deshacer">
          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          />
        </Tooltip>

        <Tooltip title="Rehacer">
          <Button
            size="small"
            icon={<RedoOutlined />}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          />
        </Tooltip>
      </Space>
    </div>
  );
};

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  placeholder = 'Escribe aquí el contenido de tu entrada...',
  editable = true,
  autofocus = false,
  autoSave = true,
  autoSaveDelay = 2000,
  onUpdate,
  onSave,
  className = '',
  minHeight = 200,
  maxHeight = 600,
  toolbar = true,
  statusBar = true,
}) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: {
          depth: 100,
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: content,
    editable: editable,
    autofocus: autofocus,
    onUpdate: ({ editor }) => {
      const currentContent = editor.getJSON();
      setIsDirty(true);

      // Actualizar estadísticas
      const text = editor.getText();
      setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);
      setCharCount(text.length);

      onUpdate?.(currentContent);

      // Autosave
      if (autoSave && onSave) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(() => {
          onSave(currentContent);
          setLastSaved(new Date());
          setIsDirty(false);
        }, autoSaveDelay);
      }
    },
  });

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Actualizar contenido cuando cambie el prop
  useEffect(() => {
    if (editor && content !== undefined) {
      editor.commands.setContent(content, false);
      setIsDirty(false);
    }
  }, [editor, content]);

  const handleManualSave = () => {
    if (editor && onSave) {
      const currentContent = editor.getJSON();
      onSave(currentContent);
      setLastSaved(new Date());
      setIsDirty(false);
      message.success('Contenido guardado');
    }
  };

  if (!editor) {
    return (
      <div className={`border rounded-md ${className}`} style={{ minHeight }}>
        <div className="p-4 text-center text-gray-500">
          Cargando editor...
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-md ${className}`}>
      {toolbar && <MenuBar editor={editor} />}

      <div
        className="prose max-w-none p-4 overflow-y-auto"
        style={{
          minHeight: toolbar ? minHeight - 60 : minHeight,
          maxHeight: toolbar ? maxHeight - 60 : maxHeight,
        }}
      >
        <EditorContent
          editor={editor}
          className="outline-none"
          style={{ minHeight: '100%' }}
        />
      </div>

      {statusBar && (
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 rounded-b-md flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Text type="secondary" className="text-xs">
              {wordCount} palabras, {charCount} caracteres
            </Text>

            {autoSave && (
              <Text type="secondary" className="text-xs">
                {isDirty ? (
                  <span className="text-orange-500">● Sin guardar</span>
                ) : lastSaved ? (
                  <span className="text-green-500">
                    ✓ Guardado {lastSaved.toLocaleTimeString()}
                  </span>
                ) : (
                  <span>Listo para escribir</span>
                )}
              </Text>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!autoSave && onSave && (
              <Button
                size="small"
                icon={<SaveOutlined />}
                onClick={handleManualSave}
                disabled={!isDirty}
              >
                Guardar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TipTapEditor;