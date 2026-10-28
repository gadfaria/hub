import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, ReactNodeViewRenderer, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Image from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  SquareCodeIcon,
  StrikethroughIcon,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Toggle } from '@/components/ui/toggle'
import { useAttachments } from '@/storage/useAttachments'
import { ATTACHMENT_PREFIX, NoteImage } from './NoteImage'
import { UNTITLED, type Note } from './types'
import type { NoteContent, SaveResult } from './useNotes'

const SAVE_DELAY = 800

const NoteImageNode = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(NoteImage)
  },
})

/** Plain text that is clearly Markdown is pasted as formatted content instead of literal symbols. */
const MARKDOWN_HINT = /^(#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|>\s|```)|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/m

interface NoteEditorProps {
  note: Note
  readOnly: boolean
  loadContent: (noteId: string) => Promise<NoteContent | null>
  saveContent: (noteId: string, markdown: string, expected: string | undefined) => Promise<SaveResult>
  onRename: (title: string) => void
}

export function NoteEditor(props: NoteEditorProps) {
  const { note, loadContent } = props
  const [content, setContent] = useState<{ noteId: string; value: NoteContent | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    loadContent(note.id).then((value) => !cancelled && setContent({ noteId: note.id, value }))
    return () => {
      cancelled = true
    }
  }, [note.id, loadContent])

  if (content?.noteId !== note.id) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (!content.value) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Esta nota ainda não foi baixada neste aparelho. Abra-a com internet para ler offline depois.
      </p>
    )
  }
  return <EditorBody key={note.id} {...props} initial={content.value} />
}

type Status = 'saved' | 'pending' | 'saving' | 'error'

const STATUS_LABEL: Record<Status, string> = {
  saved: 'Salvo',
  pending: 'Alterações não salvas',
  saving: 'Salvando…',
  error: 'Não salvo',
}

function EditorBody({ note, readOnly, loadContent, saveContent, onRename, initial }: NoteEditorProps & { initial: NoteContent }) {
  const [title, setTitle] = useState(note.title)
  const [status, setStatus] = useState<Status>('saved')
  const [conflict, setConflict] = useState(false)
  const { upload } = useAttachments('notes')

  // The version on Drive this editor is based on, and Markdown typed but not yet saved.
  const base = useRef(initial.modifiedTime)
  const unsaved = useRef<string | null>(null)
  const blocked = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const chain = useRef<Promise<void>>(Promise.resolve())
  const editorRef = useRef<Editor | null>(null)

  /** Saves run one after another; each takes whatever is unsaved at that moment. */
  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    chain.current = chain.current.then(async () => {
      const markdown = unsaved.current
      if (markdown === null || blocked.current) return
      unsaved.current = null
      setStatus('saving')
      const result = await saveContent(note.id, markdown, base.current)
      if (result.ok) {
        base.current = result.modifiedTime
        setStatus(unsaved.current === null ? 'saved' : 'pending')
        return
      }
      // Keep the text for the next attempt, unless something newer was typed meanwhile.
      unsaved.current ??= markdown
      if (result.conflict) {
        blocked.current = true
        setConflict(true)
      }
      setStatus('error')
    })
    return chain.current
  }, [note.id, saveContent])

  const schedule = useCallback(
    (editor: Editor) => {
      unsaved.current = editor.getMarkdown()
      setStatus('pending')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, SAVE_DELAY)
    },
    [flush],
  )
  const scheduleRef = useRef(schedule)
  useEffect(() => {
    scheduleRef.current = schedule
  }, [schedule])

  const insertImages = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'))
      if (!images.length) return false
      const id = toast.loading(images.length > 1 ? 'Enviando imagens…' : 'Enviando imagem…')
      const uploaded = await upload(images)
      toast.dismiss(id)
      for (const attachment of uploaded ?? []) {
        editorRef.current?.chain().focus().setImage({ src: `${ATTACHMENT_PREFIX}${attachment.id}`, alt: attachment.name }).run()
      }
      return true
    },
    [upload],
  )
  const insertImagesRef = useRef(insertImages)
  useEffect(() => {
    insertImagesRef.current = insertImages
  }, [insertImages])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Markdown,
      TaskList,
      TaskItem.configure({ nested: true }),
      NoteImageNode,
      Placeholder.configure({ placeholder: 'Escreva aqui…' }),
    ],
    content: initial.markdown,
    contentType: 'markdown',
    editable: !readOnly,
    onUpdate: ({ editor }) => scheduleRef.current(editor),
    editorProps: {
      attributes: { class: 'note-content min-h-[50svh] outline-none' },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])]
        if (files.some((f) => f.type.startsWith('image/'))) {
          void insertImagesRef.current(files)
          return true
        }
        const text = event.clipboardData?.getData('text/plain') ?? ''
        if (!event.clipboardData?.getData('text/html') && MARKDOWN_HINT.test(text)) {
          editorRef.current?.commands.insertContent(text, { contentType: 'markdown' })
          return true
        }
        return false
      },
      handleDrop: (_view, event, _slice, moved) => {
        const files = [...(event.dataTransfer?.files ?? [])]
        if (moved || !files.some((f) => f.type.startsWith('image/'))) return false
        event.preventDefault()
        void insertImagesRef.current(files)
        return true
      },
    },
  })

  // Paste and image handlers are set up before the editor exists, so they reach it through this ref.
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    editor.setEditable(!readOnly)
  }, [editor, readOnly])

  // Back online with unsaved text (the connection dropped mid-save): try again.
  useEffect(() => {
    if (!readOnly && unsaved.current !== null && !blocked.current) void flush()
  }, [readOnly, flush])

  // Leaving the note, hiding the tab or closing the app saves right away instead of waiting.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && void flush()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      void flush()
    }
  }, [flush])

  // The title is part of notes.json, saved on its own shortly after typing stops.
  const titleTimer = useRef<number | undefined>(undefined)
  const renameRef = useRef(onRename)
  useEffect(() => {
    renameRef.current = onRename
  }, [onRename])
  const commitTitle = useCallback((value: string) => {
    window.clearTimeout(titleTimer.current)
    renameRef.current(value.trim())
  }, [])
  useEffect(() => () => window.clearTimeout(titleTimer.current), [])

  async function keepMine() {
    blocked.current = false
    setConflict(false)
    // Overwrite: the next save skips the version check once.
    base.current = ''
    await flush()
  }

  async function takeDriveVersion() {
    const latest = await loadContent(note.id)
    if (!latest) return
    blocked.current = false
    unsaved.current = null
    base.current = latest.modifiedTime
    editor.commands.setContent(latest.markdown, { contentType: 'markdown', emitUpdate: false })
    setConflict(false)
    setStatus('saved')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            window.clearTimeout(titleTimer.current)
            const value = e.target.value
            titleTimer.current = window.setTimeout(() => commitTitle(value), SAVE_DELAY)
          }}
          onBlur={() => title.trim() !== note.title && commitTitle(title)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              editor.commands.focus('start')
            }
          }}
          placeholder={UNTITLED}
          disabled={readOnly}
          aria-label="Título"
          className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 disabled:opacity-100"
        />
        {!readOnly && (
          <span className={`shrink-0 pt-2 text-xs ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      {!readOnly && <Toolbar editor={editor} onImages={insertImages} />}

      <EditorContent editor={editor} />

      <AlertDialog open={conflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nota alterada em outro aparelho</AlertDialogTitle>
            <AlertDialogDescription>
              Esta nota mudou no Drive depois que você a abriu. Escolha qual versão fica: a do Drive descarta o que você
              digitou aqui; a sua substitui a do Drive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={takeDriveVersion}>Usar a do Drive</AlertDialogCancel>
            <AlertDialogAction onClick={keepMine}>Manter a minha</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface ToolbarItem {
  label: string
  icon: LucideIcon
  active: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const TOOLBAR: ToolbarItem[][] = [
  [
    { label: 'Título 1', icon: Heading1Icon, active: (e) => e.isActive('heading', { level: 1 }), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Título 2', icon: Heading2Icon, active: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Título 3', icon: Heading3Icon, active: (e) => e.isActive('heading', { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  ],
  [
    { label: 'Negrito', icon: BoldIcon, active: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
    { label: 'Itálico', icon: ItalicIcon, active: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
    { label: 'Tachado', icon: StrikethroughIcon, active: (e) => e.isActive('strike'), run: (e) => e.chain().focus().toggleStrike().run() },
    { label: 'Código', icon: CodeIcon, active: (e) => e.isActive('code'), run: (e) => e.chain().focus().toggleCode().run() },
    {
      label: 'Link',
      icon: LinkIcon,
      active: (e) => e.isActive('link'),
      run: (e) => {
        if (e.isActive('link')) {
          e.chain().focus().extendMarkRange('link').unsetLink().run()
          return
        }
        const url = window.prompt('Endereço do link')?.trim()
        if (!url) return
        const href = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
        e.chain().focus().extendMarkRange('link').setLink({ href }).run()
      },
    },
  ],
  [
    { label: 'Lista', icon: ListIcon, active: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
    { label: 'Lista numerada', icon: ListOrderedIcon, active: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
    { label: 'Checklist', icon: ListChecksIcon, active: (e) => e.isActive('taskList'), run: (e) => e.chain().focus().toggleTaskList().run() },
    { label: 'Citação', icon: QuoteIcon, active: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
    { label: 'Bloco de código', icon: SquareCodeIcon, active: (e) => e.isActive('codeBlock'), run: (e) => e.chain().focus().toggleCodeBlock().run() },
  ],
]

function Toolbar({ editor, onImages }: { editor: Editor; onImages: (files: File[]) => Promise<boolean> }) {
  const fileInput = useRef<HTMLInputElement>(null)
  // Re-renders only when an active state changes, not on every keystroke.
  const active = useEditorState({
    editor,
    selector: ({ editor }) => TOOLBAR.flat().map((item) => item.active(editor)),
  })
  let index = 0

  return (
    <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-0.5 border-b bg-background/95 px-1 py-1 backdrop-blur">
      {TOOLBAR.map((group, g) => (
        <div key={g} className="flex items-center gap-0.5">
          {g > 0 && <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />}
          {group.map((item) => {
            const pressed = active[index++]
            return (
              <Toggle
                key={item.label}
                size="sm"
                pressed={pressed}
                onPressedChange={() => item.run(editor)}
                aria-label={item.label}
                title={item.label}
              >
                <item.icon />
              </Toggle>
            )
          })}
        </div>
      ))}
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          void onImages(files)
        }}
      />
      <Toggle size="sm" pressed={false} onPressedChange={() => fileInput.current?.click()} aria-label="Imagem" title="Imagem">
        <ImageIcon />
      </Toggle>
    </div>
  )
}
