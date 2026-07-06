import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Button, Space, Divider, Popover, Input, message, Tooltip } from 'antd';
import '../../styles/rich-text-editor.css';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  LinkOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  CodeOutlined,
  UndoOutlined,
  RedoOutlined,
  FontColorsOutlined,
  SmileOutlined,
} from '@ant-design/icons';

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: string;
  showToolbar?: boolean;
  showEmojis?: boolean;
  compactToolbar?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'Escriba su mensaje aquí...',
  disabled = false,
  height = '200px',
  showToolbar = true,
  showEmojis = false,
  compactToolbar = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false, // Disable default link to avoid duplicates
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      TextStyle,
      Color,
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addEmoji = (emoji: string) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji).run();
    }
  };

  const colorOptions = [
    '#000000', '#374151', '#6B7280', '#EF4444', '#F59E0B', 
    '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316'
  ];

  const emojiOptions = [
    '😀', '😊', '😍', '🤔', '👍', '👏', '🎉', '❤️', 
    '✅', '❌', '⚠️', '📚', '🏫', '👩‍🏫', '👨‍🎓', '📝'
  ];

  if (!editor) {
    return <div>Cargando editor...</div>;
  }

  return (
    <div className={`rich-text-editor border border-gray-300 rounded-lg overflow-hidden bg-white${compactToolbar ? ' rich-text-editor-compact' : ''}`}>
      {showToolbar && (
        <div className="rich-text-toolbar border-b border-gray-200">
          {compactToolbar ? (
            /* Toolbar compacta para mobile inline */
            <Space size={2} style={{ padding: '4px 6px', flexWrap: 'nowrap', display: 'flex' }}>
              <Tooltip title="Negrita">
                <Button
                  size="small"
                  type={editor.isActive('bold') ? 'primary' : 'default'}
                  icon={<BoldOutlined />}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  disabled={disabled}
                />
              </Tooltip>
              <Tooltip title="Cursiva">
                <Button
                  size="small"
                  type={editor.isActive('italic') ? 'primary' : 'default'}
                  icon={<ItalicOutlined />}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  disabled={disabled}
                />
              </Tooltip>
              <Tooltip title="Lista con viñetas">
                <Button
                  size="small"
                  type={editor.isActive('bulletList') ? 'primary' : 'default'}
                  icon={<UnorderedListOutlined />}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  disabled={disabled}
                />
              </Tooltip>
              <Tooltip title="Lista numerada">
                <Button
                  size="small"
                  type={editor.isActive('orderedList') ? 'primary' : 'default'}
                  icon={<OrderedListOutlined />}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  disabled={disabled}
                />
              </Tooltip>
              <Tooltip title="Código">
                <Button
                  size="small"
                  type={editor.isActive('code') ? 'primary' : 'default'}
                  icon={<CodeOutlined />}
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  disabled={disabled}
                />
              </Tooltip>
              {showEmojis && (
                <Popover
                  content={
                    <div className="grid grid-cols-8 gap-1 p-2 max-w-xs">
                      {emojiOptions.map((emoji) => (
                        <Button
                          key={emoji}
                          size="small"
                          onClick={() => addEmoji(emoji)}
                          style={{ fontSize: '16px' }}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  }
                  title="Emojis"
                  trigger="click"
                >
                  <Tooltip title="Insertar emoji">
                    <Button size="small" icon={<SmileOutlined />} disabled={disabled} />
                  </Tooltip>
                </Popover>
              )}
            </Space>
          ) : (
            /* Toolbar completa para desktop / modales */
            <Space size="small" wrap>
              {/* Formato de texto */}
              <Space.Compact>
                <Tooltip title="Negrita">
                  <Button
                    size="small"
                    type={editor.isActive('bold') ? 'primary' : 'default'}
                    icon={<BoldOutlined />}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={disabled}
                  />
                </Tooltip>
                <Tooltip title="Cursiva">
                  <Button
                    size="small"
                    type={editor.isActive('italic') ? 'primary' : 'default'}
                    icon={<ItalicOutlined />}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={disabled}
                  />
                </Tooltip>
                <Tooltip title="Código">
                  <Button
                    size="small"
                    type={editor.isActive('code') ? 'primary' : 'default'}
                    icon={<CodeOutlined />}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    disabled={disabled}
                  />
                </Tooltip>
              </Space.Compact>

              <Divider type="vertical" />

              {/* Títulos */}
              <Space.Compact>
                <Tooltip title="Título 1">
                  <Button
                    size="small"
                    type={editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    disabled={disabled}
                  >
                    H1
                  </Button>
                </Tooltip>
                <Tooltip title="Título 2">
                  <Button
                    size="small"
                    type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    disabled={disabled}
                  >
                    H2
                  </Button>
                </Tooltip>
              </Space.Compact>

              <Divider type="vertical" />

              {/* Listas */}
              <Space.Compact>
                <Tooltip title="Lista con viñetas">
                  <Button
                    size="small"
                    type={editor.isActive('bulletList') ? 'primary' : 'default'}
                    icon={<UnorderedListOutlined />}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    disabled={disabled}
                  />
                </Tooltip>
                <Tooltip title="Lista numerada">
                  <Button
                    size="small"
                    type={editor.isActive('orderedList') ? 'primary' : 'default'}
                    icon={<OrderedListOutlined />}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    disabled={disabled}
                  />
                </Tooltip>
              </Space.Compact>

              <Divider type="vertical" />

              {/* Enlaces */}
              <Tooltip title="Insertar enlace">
                <Button
                  size="small"
                  type={editor.isActive('link') ? 'primary' : 'default'}
                  icon={<LinkOutlined />}
                  onClick={setLink}
                  disabled={disabled}
                />
              </Tooltip>

              {/* Color de texto */}
              <Popover
                content={
                  <div className="grid grid-cols-5 gap-1 p-2">
                    {colorOptions.map((color) => (
                      <Button
                        key={color}
                        size="small"
                        style={{
                          backgroundColor: color,
                          width: '24px',
                          height: '24px',
                          border: '1px solid #d9d9d9'
                        }}
                        onClick={() => editor.chain().focus().setColor(color).run()}
                      />
                    ))}
                  </div>
                }
                title="Color de texto"
                trigger="click"
              >
                <Tooltip title="Color de texto">
                  <Button size="small" icon={<FontColorsOutlined />} disabled={disabled} />
                </Tooltip>
              </Popover>

              {/* Emojis */}
              {showEmojis && (
                <Popover
                  content={
                    <div className="grid grid-cols-8 gap-1 p-2 max-w-xs">
                      {emojiOptions.map((emoji) => (
                        <Button
                          key={emoji}
                          size="small"
                          onClick={() => addEmoji(emoji)}
                          style={{ fontSize: '16px' }}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  }
                  title="Emojis"
                  trigger="click"
                >
                  <Tooltip title="Insertar emoji">
                    <Button size="small" icon={<SmileOutlined />} disabled={disabled} />
                  </Tooltip>
                </Popover>
              )}

              <Divider type="vertical" />

              {/* Deshacer/Rehacer */}
              <Space.Compact>
                <Tooltip title="Deshacer">
                  <Button
                    size="small"
                    icon={<UndoOutlined />}
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={disabled || !editor.can().chain().focus().undo().run()}
                  />
                </Tooltip>
                <Tooltip title="Rehacer">
                  <Button
                    size="small"
                    icon={<RedoOutlined />}
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={disabled || !editor.can().chain().focus().redo().run()}
                  />
                </Tooltip>
              </Space.Compact>
            </Space>
          )}
        </div>
      )}

      <div className="relative">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none"
          style={{
            minHeight: height,
            padding: '12px',
            outline: 'none',
          }}
        />
        {editor.isEmpty && (
          <div 
            className="absolute top-3 left-3 text-gray-400 pointer-events-none select-none"
            style={{ fontSize: '14px' }}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
};

export default RichTextEditor;