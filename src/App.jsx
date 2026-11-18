import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive, ArrowDownWideNarrow, Check, ChevronDown, CircleHelp, Clock3,
  Grid2X2, List, Menu, Pin, Plus, Search, Settings2,
  StickyNote, Tag, Trash2, X,
} from 'lucide-react'

const STORAGE_KEY = 'daybook-notes-v1'
const COLORS = [
  { name: 'Paper', value: '#ffffff' },
  { name: 'Citrus', value: '#eff6d5' },
  { name: 'Peach', value: '#fae5d7' },
  { name: 'Sky', value: '#dcecf2' },
  { name: 'Lilac', value: '#eae2f0' },
  { name: 'Rose', value: '#f4dfe3' },
  { name: 'Sea glass', value: '#dcece3' },
]

const starterNotes = [
  { id: 'welcome-note', title: 'A little space to think', content: 'Good ideas rarely arrive in a straight line. Leave yourself a note, make a list, or save the small things you don’t want to forget.\n\n- Capture it now\n- Come back to it later', color: '#eff6d5', tags: ['Getting started'], pinned: true, archived: false, createdAt: '2026-02-14T09:30:00.000Z', updatedAt: '2026-02-14T09:30:00.000Z' },
  { id: 'weekend-note', title: 'Weekend market', content: 'Pick up sourdough, tulips, and the good olive oil. Ask Maya if she wants to come along.', color: '#fae5d7', tags: ['Personal'], pinned: false, archived: false, createdAt: '2026-02-13T16:20:00.000Z', updatedAt: '2026-02-13T16:20:00.000Z' },
  { id: 'project-note', title: 'Ideas for the studio', content: 'A few things to try next week:\n\n- Move the big table toward the window\n- Make a tiny reference wall\n- Leave Friday open for experiments', color: '#dcecf2', tags: ['Work', 'Ideas'], pinned: false, archived: false, createdAt: '2026-02-11T11:05:00.000Z', updatedAt: '2026-02-11T11:05:00.000Z' },
]

function readNotes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : starterNotes
  } catch {
    return starterNotes
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function renderInline(text) {
  const chunks = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return chunks.map((chunk, index) => {
    if (chunk.startsWith('**') && chunk.endsWith('**')) return <strong key={index}>{chunk.slice(2, -2)}</strong>
    if (chunk.startsWith('*') && chunk.endsWith('*')) return <em key={index}>{chunk.slice(1, -1)}</em>
    if (chunk.startsWith('`') && chunk.endsWith('`')) return <code className="rounded bg-black/5 px-1 py-0.5 text-[0.9em]" key={index}>{chunk.slice(1, -1)}</code>
    return chunk
  })
}

function NoteBody({ content }) {
  return <div className="space-y-1.5 text-[13px] leading-[1.65] text-[#555d53]">
    {content.split('\n').map((line, index) => line.startsWith('- ')
      ? <div className="flex gap-2" key={index}><span className="text-[#829270]">·</span><span>{renderInline(line.slice(2))}</span></div>
      : <p className={line ? '' : 'h-1'} key={index}>{renderInline(line)}</p>)}
  </div>
}

function App() {
  const [notes, setNotes] = useState(readNotes)
  const [activeView, setActiveView] = useState('notes')
  const [query, setQuery] = useState('')
  const [filterTag, setFilterTag] = useState('All notes')
  const [sortBy, setSortBy] = useState('updated')
  const [layout, setLayout] = useState('grid')
  const [editor, setEditor] = useState(null)
  const [selected, setSelected] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target
      const editing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      } else if (!editing && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        openEditor()
      } else if (event.key === 'Escape') {
        setEditor(null)
        setConfirmDelete(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const allTags = useMemo(() => [...new Set(notes.flatMap((note) => note.tags))].sort(), [notes])
  const visibleNotes = useMemo(() => {
    const matching = notes.filter((note) => {
      const isArchive = activeView === 'archive'
      const matchesView = note.archived === isArchive
      const matchesTag = filterTag === 'All notes' || filterTag === 'Archive' || note.tags.includes(filterTag)
      const searchText = `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase()
      return matchesView && matchesTag && searchText.includes(query.toLowerCase())
    })
    return matching.sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned)
      if (sortBy === 'title') return (a.title || a.content).localeCompare(b.title || b.content)
      if (sortBy === 'color') return a.color.localeCompare(b.color)
      return new Date(b.updatedAt) - new Date(a.updatedAt)
    })
  }, [notes, activeView, filterTag, query, sortBy])

  function openEditor(note = null) {
    setEditor(note ? { ...note, tagsText: note.tags.join(', '), isNew: false } : {
      id: null, title: '', content: '', color: COLORS[0].value, tags: [], tagsText: '', pinned: false, archived: false, isNew: true,
    })
  }

  function saveNote(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') || '').trim()
    const content = String(form.get('content') || '').trim()
    const tags = [...new Set(String(form.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean))]
    if (!content) {
      setToast('Add a little content before saving.')
      return
    }
    if (title.length > 100 || content.length > 5000 || tags.some((tag) => tag.length > 30) || tags.length > 8) {
      setToast('Check the character limits and try again.')
      return
    }
    const duplicate = notes.some((note) => note.id !== editor.id && note.title.trim().toLowerCase() === title.toLowerCase() && note.content.trim().toLowerCase() === content.toLowerCase())
    if (duplicate) {
      setToast('A note with the same title and content already exists.')
      return
    }
    const now = new Date().toISOString()
    const nextNote = { id: editor.id || crypto.randomUUID(), title, content, color: String(form.get('color') || COLORS[0].value), tags, pinned: editor.pinned, archived: editor.archived, createdAt: editor.createdAt || now, updatedAt: now }
    setNotes((current) => editor.id ? current.map((note) => note.id === editor.id ? nextNote : note) : [nextNote, ...current])
    setEditor(null)
    setToast(editor.id ? 'Note updated' : 'Note added')
  }

  function updateNote(id, changes) {
    setNotes((current) => current.map((note) => note.id === id ? { ...note, ...changes, updatedAt: new Date().toISOString() } : note))
  }

  function deleteNotes(ids) {
    setNotes((current) => current.filter((note) => !ids.includes(note.id)))
    setSelected([])
    setConfirmDelete(null)
    setToast(ids.length > 1 ? `${ids.length} notes deleted` : 'Note deleted')
  }

  function toggleSelected(id) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const navItems = [
    { id: 'notes', label: 'Notes', icon: StickyNote, count: notes.filter((note) => !note.archived).length },
    { id: 'archive', label: 'Archive', icon: Archive, count: notes.filter((note) => note.archived).length },
  ]

  return <div className="min-h-screen bg-[#f7f6f1]/90 text-[#302f2a]">
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-[#e7e2d9] bg-[#fffefa]/95 px-4 backdrop-blur-md sm:px-7">
      <button className="-ml-1 rounded-lg p-2 text-[#6e776a] hover:bg-[#edf0e9] lg:hidden" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu size={19} /></button>
      <a className="flex min-w-[180px] items-center gap-2.5 no-underline" href="#home" onClick={() => { setActiveView('notes'); setFilterTag('All notes') }}>
        <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#f1d2bf] text-[#9c583d]"><StickyNote size={19} strokeWidth={2.2} /></span>
        <span className="font-serif text-[21px] font-semibold tracking-[-0.5px] text-[#39352f]">daybook<span className="text-[#ce8969]">.</span></span>
      </a>
      <div className="relative mx-auto hidden w-full max-w-[540px] sm:block">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b9385]" size={17} />
        <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your notes" className="h-11 w-full rounded-xl border border-transparent bg-[#f0eee8] pl-11 pr-20 text-[13px] outline-none transition focus:border-[#d59a7d] focus:bg-white focus:ring-4 focus:ring-[#f1d5c6]/60" aria-label="Search notes" />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[#dfe2da] bg-white px-1.5 py-0.5 text-[10px] text-[#92998d]">⌘ K</kbd>
      </div>
      <div className="ml-auto flex items-center gap-1.5 text-[#6c7568]">
        <button onClick={() => setToast('Your notes are saved on this device.')} className="hidden rounded-lg p-2 hover:bg-[#edf0e9] sm:inline-flex" aria-label="Storage information" title="Local storage"><CircleHelp size={18} /></button>
        <button onClick={() => setSortBy(sortBy === 'updated' ? 'title' : sortBy === 'title' ? 'color' : 'updated')} className="rounded-lg p-2 hover:bg-[#edf0e9]" title={`Sort by ${sortBy}`} aria-label={`Sort by ${sortBy}`}><ArrowDownWideNarrow size={18} /></button>
        <button onClick={() => setLayout(layout === 'grid' ? 'list' : 'grid')} className="rounded-lg p-2 hover:bg-[#edf0e9]" title={layout === 'grid' ? 'Switch to list view' : 'Switch to grid view'} aria-label="Change layout">{layout === 'grid' ? <List size={19} /> : <Grid2X2 size={18} />}</button>
      </div>
    </header>

    <div className="mx-auto flex max-w-[1480px]">
      <aside className={`${mobileNav ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-[72px] left-0 z-20 w-[250px] border-r border-[#e7e2d9] bg-[#fbfaf6] px-4 py-7 transition-transform lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:translate-x-0`}>
        <button onClick={() => { openEditor(); setMobileNav(false) }} className="mb-8 flex h-12 w-full items-center gap-3 rounded-xl bg-[#f0d2bf] px-4 text-[13px] font-semibold text-[#754832] shadow-[0_3px_8px_rgba(105,67,44,0.09)] transition hover:bg-[#eac4ab]"><Plus size={18} strokeWidth={2.2} />New note <span className="ml-auto text-[10px] font-medium text-[#9a6d55]">N</span></button>
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[1.1px] text-[#a0a69a]">Workspace</p>
        <nav className="space-y-1" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon, count }) => <button key={id} onClick={() => { setActiveView(id); setFilterTag(id === 'archive' ? 'Archive' : 'All notes'); setSelected([]); setMobileNav(false) }} className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] transition ${activeView === id ? 'bg-[#f1e4d8] font-semibold text-[#84553d]' : 'text-[#687165] hover:bg-[#f0eee8]'}`}><Icon size={17} strokeWidth={1.8} />{label}<span className="ml-auto text-[11px] text-[#98a08f]">{count}</span></button>)}
        </nav>
        <div className="my-6 border-t border-[#e6e9e1]" />
        <div className="mb-2 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[1.1px] text-[#a0a69a]"><Tag size={12} />Labels</div>
        <div className="space-y-1">
          {allTags.length ? allTags.map((tag) => <button key={tag} onClick={() => { setFilterTag(filterTag === tag ? (activeView === 'archive' ? 'Archive' : 'All notes') : tag); setActiveView('notes') }} className={`flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] ${filterTag === tag ? 'bg-[#e8eddf] font-semibold text-[#42533b]' : 'text-[#71796e] hover:bg-[#ecefe8]'}`}><span className="h-1.5 w-1.5 rounded-full bg-[#a6b58f]" />{tag}</button>) : <p className="px-3 py-2 text-[12px] text-[#a0a69a]">Labels appear as you add them.</p>}
        </div>
        <div className="absolute inset-x-4 bottom-5 border-t border-[#e6e9e1] pt-4"><div className="flex items-center gap-3 px-2"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#e8d8c6] font-serif text-[13px] font-semibold text-[#705740]">D</div><div><p className="text-[12px] font-semibold text-[#465043]">Your daybook</p><p className="mt-0.5 text-[10px] text-[#9aa194]">Just for you</p></div><button onClick={() => setToast('Settings are looking tidy.')} aria-label="Settings" className="ml-auto rounded-lg p-2 text-[#969d91] hover:bg-[#ecefe8]"><Settings2 size={16} /></button></div></div>
      </aside>

      <main className="min-h-[calc(100vh-72px)] min-w-0 flex-1 px-4 pb-20 pt-7 sm:px-7 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-[1030px]">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[1.3px] text-[#a08d7e]">{activeView === 'archive' ? 'Tucked away' : 'Your little corner'}</p><h1 className="font-serif text-[30px] font-semibold leading-tight tracking-[-0.7px] text-[#39352f] sm:text-[34px]">{activeView === 'archive' ? 'Archive' : filterTag !== 'All notes' ? filterTag : 'All notes'}<span className="ml-2 align-middle font-sans text-[13px] font-normal text-[#a08f81]">{visibleNotes.length}</span></h1></div>
            <div className="flex items-center gap-2">
              <label className="flex h-9 items-center gap-2 rounded-lg border border-[#e6e8e1] bg-white px-2.5 text-[11px] text-[#838a7e]"><Clock3 size={14} /><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="max-w-[108px] bg-transparent outline-none"><option value="updated">Last edited</option><option value="title">Title</option><option value="color">Color</option></select><ChevronDown size={12} /></label>
              {selected.length > 0 && <button onClick={() => setConfirmDelete(selected)} className="flex h-9 items-center gap-2 rounded-lg bg-[#f7e5e1] px-3 text-[11px] font-semibold text-[#a24f44] hover:bg-[#f1d8d2]"><Trash2 size={14} />Delete {selected.length}</button>}
            </div>
          </div>
          <div className="relative mb-8 sm:hidden"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b9385]" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your notes" className="h-11 w-full rounded-xl border border-[#e7e9e2] bg-white pl-10 pr-4 text-[13px] outline-none focus:border-[#b7c8a4]" /></div>

          {activeView === 'notes' && <button onClick={() => openEditor()} className="group mb-9 flex min-h-[58px] w-full items-center gap-3 rounded-xl border border-[#e3e7dd] bg-white px-5 text-left shadow-[0_5px_16px_rgba(45,55,40,0.035)] transition hover:border-[#cbd6bd] hover:shadow-[0_8px_24px_rgba(45,55,40,0.07)]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eff4e8] text-[#76915d]"><Plus size={18} /></span><span className="text-[13px] text-[#9ba195]">Start a note...</span><span className="ml-auto hidden text-[11px] text-[#b0b6aa] transition group-hover:text-[#6f7e61] sm:block">Make room for a thought</span></button>}

          {visibleNotes.length ? <div className={layout === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-3'}>
            {visibleNotes.map((note, index) => <article key={note.id} className={`note-card group relative flex flex-col overflow-hidden rounded-xl border border-[#e6e6df] p-4 transition hover:-translate-y-0.5 hover:border-[#d2d7ca] hover:shadow-[0_10px_24px_rgba(46,57,38,0.07)] ${layout === 'list' ? 'min-h-[120px] sm:flex-row sm:items-start sm:gap-6' : 'min-h-[202px]'}`} style={{ backgroundColor: note.color, animationDelay: `${Math.min(index, 8) * 35}ms` }}>
              <div className="absolute right-3 top-3 flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <button onClick={() => toggleSelected(note.id)} className={`grid h-7 w-7 place-items-center rounded-full transition ${selected.includes(note.id) ? 'bg-[#657952] text-white' : 'bg-white/65 text-[#7d8775] hover:bg-white'}`} aria-label={selected.includes(note.id) ? 'Deselect note' : 'Select note'} title="Select note">{selected.includes(note.id) ? <Check size={14} /> : <span className="h-3 w-3 rounded-full border border-current" />}</button>
                <button onClick={() => updateNote(note.id, { pinned: !note.pinned })} className={`grid h-7 w-7 place-items-center rounded-full transition ${note.pinned ? 'bg-[#e0e9ce] text-[#647b4f]' : 'bg-white/65 text-[#879080] hover:bg-white'}`} aria-label={note.pinned ? 'Unpin note' : 'Pin note'} title={note.pinned ? 'Unpin' : 'Pin'}><Pin size={14} fill={note.pinned ? 'currentColor' : 'none'} /></button>
                <button onClick={() => setConfirmDelete([note.id])} className="grid h-7 w-7 place-items-center rounded-full bg-white/65 text-[#8b867e] transition hover:bg-[#fae8e3] hover:text-[#a24f44]" aria-label="Delete note" title="Delete"><Trash2 size={14} /></button>
              </div>
              <button onClick={() => openEditor(note)} className="min-w-0 flex-1 text-left">
                <div className="mb-2 flex items-center gap-2 pr-[98px]">{note.pinned && <Pin size={12} className="shrink-0 text-[#738660]" fill="currentColor" />}<h2 className="truncate text-[14px] font-semibold text-[#354132]">{note.title || 'Untitled note'}</h2></div>
                <NoteBody content={note.content} />
              </button>
              <div className={`mt-auto flex items-center justify-between gap-2 pt-4 ${layout === 'list' ? 'sm:mt-0 sm:w-[190px] sm:shrink-0 sm:pt-1' : ''}`}>
                <div className="flex min-w-0 flex-wrap gap-1.5">{note.tags.slice(0, 3).map((tag) => <span key={tag} className="max-w-[120px] truncate rounded-full bg-white/60 px-2 py-1 text-[9px] font-medium text-[#747c6d]">{tag}</span>)}</div>
                <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-[#92998b]"><span>{formatDate(note.updatedAt)}</span><button onClick={(event) => { event.stopPropagation(); updateNote(note.id, { archived: !note.archived }) }} className="grid h-7 w-7 place-items-center rounded-full text-[#838b7d] opacity-100 hover:bg-white/70 sm:opacity-0 sm:group-hover:opacity-100" aria-label={note.archived ? 'Unarchive note' : 'Archive note'} title={note.archived ? 'Unarchive' : 'Archive'}><Archive size={14} /></button></div>
              </div>
            </article>)}
          </div> : <div className="flex min-h-[370px] flex-col items-center justify-center px-6 text-center"><div className="mb-5 grid h-[76px] w-[76px] place-items-center rounded-[25px] bg-[#e9eee2] text-[#8ba077]"><StickyNote size={32} strokeWidth={1.4} /></div><h2 className="font-serif text-[22px] font-semibold text-[#485443]">{query ? 'Nothing found just yet' : activeView === 'archive' ? 'Your archive is taking a breather' : 'A fresh page'}</h2><p className="mt-2 max-w-[290px] text-[13px] leading-6 text-[#92998e]">{query ? 'Try another search, or clear a filter to find your note.' : activeView === 'archive' ? 'Notes you archive will land here, safe and sound.' : 'The best notes start somewhere. Catch your first thought.'}</p>{!query && activeView === 'notes' && <button onClick={() => openEditor()} className="mt-5 flex items-center gap-2 rounded-lg bg-[#dce9c7] px-4 py-2.5 text-[12px] font-semibold text-[#415537] hover:bg-[#d2e2b8]"><Plus size={15} />Write a note</button>}</div>}
          <div className="mt-12 flex items-center justify-center gap-2 text-[10px] text-[#b0b5aa]"><span className="h-px w-8 bg-[#e5e8e0]" />A little at a time<span className="h-px w-8 bg-[#e5e8e0]" /></div>
        </div>
      </main>
    </div>

    {editor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#283126]/25 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null) }}>
      <form onSubmit={saveNote} style={{ borderTopColor: editor.color }} className="max-h-[calc(100dvh-24px)] w-full max-w-[590px] overflow-y-auto rounded-2xl border border-t-[5px] border-[#e5e7df] bg-[#fffefa] shadow-[0_24px_70px_rgba(49,43,36,0.2)]">
        <div className="flex items-center justify-between border-b border-[#eff0eb] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[1.1px] text-[#9ca391]">{editor.id ? 'Your note' : 'A new thought'}</p><p className="mt-1 text-[11px] text-[#b0b5aa]">Changes save when you’re ready</p></div><button type="button" onClick={() => setEditor(null)} aria-label="Close editor" className="grid h-8 w-8 place-items-center rounded-full text-[#868d80] hover:bg-[#f0f2ed]"><X size={17} /></button></div>
        <div className="px-5 pt-4"><input name="title" maxLength={100} value={editor.title} onChange={(event) => setEditor((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="w-full border-0 bg-transparent py-2 font-serif text-[22px] font-semibold text-[#354132] outline-none placeholder:text-[#c0c5ba]" /><textarea name="content" required maxLength={5000} value={editor.content} onChange={(event) => setEditor((current) => ({ ...current, content: event.target.value }))} placeholder="Let the thought out..." rows={8} className="mt-2 w-full resize-y border-0 bg-transparent py-2 text-[14px] leading-7 text-[#515a4d] outline-none placeholder:text-[#b6bcb1]" />
          <div className="flex items-center gap-1 border-t border-[#eff0eb] py-2"><button type="button" title="Bold" onClick={() => insertMarkup('**', '**')} className="grid h-8 w-8 place-items-center rounded-md font-serif font-bold text-[#727b6b] hover:bg-[#f1f3ee]">B</button><button type="button" title="Italic" onClick={() => insertMarkup('*', '*')} className="grid h-8 w-8 place-items-center rounded-md font-serif italic text-[#727b6b] hover:bg-[#f1f3ee]">I</button><button type="button" title="Add a list item" onClick={() => insertMarkup('- ', '')} className="grid h-8 w-8 place-items-center rounded-md text-[13px] text-[#727b6b] hover:bg-[#f1f3ee]">☷</button><span className="ml-auto text-[10px] text-[#a6ada0]">{editor.content.length}/5000</span></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eff0eb] py-3"><div className="flex items-center gap-2" aria-label="Note color">{COLORS.map((color) => <button type="button" key={color.value} onClick={() => setEditor((current) => ({ ...current, color: color.value }))} style={{ backgroundColor: color.value }} className={`h-6 w-6 rounded-full border transition ${editor.color === color.value ? 'border-[#6f8061] ring-2 ring-[#dce7cf] ring-offset-1' : 'border-black/10 hover:scale-110'}`} aria-label={`${color.name} color`} title={color.name}>{editor.color === color.value && <Check size={12} className="mx-auto text-[#536747]" />}</button>)}</div><label className="flex items-center gap-2 text-[#8a9283]"><Tag size={14} /><input name="tags" maxLength={248} value={editor.tagsText} onChange={(event) => setEditor((current) => ({ ...current, tagsText: event.target.value }))} placeholder="Labels, comma separated" className="w-[180px] bg-transparent text-[11px] outline-none placeholder:text-[#adb3a8]" /></label></div>
          <input type="hidden" name="color" value={editor.color} />
        </div>
        <div className="flex items-center justify-between border-t border-[#eee8df] bg-[#fbf8f3] px-5 py-3"><label className="flex items-center gap-2 text-[11px] text-[#756b60]"><input type="checkbox" checked={editor.pinned} onChange={(event) => setEditor((current) => ({ ...current, pinned: event.target.checked }))} className="accent-[#bd7958]" />Pin note</label><div className="flex items-center gap-2"><button type="button" onClick={() => setEditor(null)} className="rounded-lg px-3 py-2 text-[11px] font-medium text-[#83796e] hover:bg-[#f1ede5]">Cancel</button><button type="submit" className="rounded-lg bg-[#a95f40] px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-[#8e4d34]">Save note</button></div></div>
      </form>
    </div>}

    {confirmDelete && <div className="fixed inset-0 z-[60] grid place-items-center bg-[#283126]/30 p-4 backdrop-blur-[2px]"><div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(33,43,29,0.2)]"><div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#fae8e3] text-[#a24f44]"><Trash2 size={18} /></div><h2 id="delete-title" className="font-serif text-[20px] font-semibold text-[#354132]">Delete {confirmDelete.length > 1 ? `${confirmDelete.length} notes` : 'this note'}?</h2><p className="mt-2 text-[12px] leading-5 text-[#858d80]">This can’t be undone. The note will be removed from this device.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-2 text-[11px] text-[#747d70] hover:bg-[#f1f3ee]">Keep it</button><button onClick={() => deleteNotes(confirmDelete)} className="rounded-lg bg-[#a95347] px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-[#93483e]">Delete</button></div></div></div>}
    {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#374333] px-4 py-3 text-[12px] font-medium text-white shadow-xl"><Check size={15} className="text-[#c7dda9]" />{toast}</div>}
  </div>

  function insertMarkup(before, after) {
    const textarea = document.querySelector('textarea[name="content"]')
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentText = textarea.value
    const selectedText = currentText.slice(start, end)
    const nextText = `${currentText.slice(0, start)}${before}${selectedText}${after}${currentText.slice(end)}`
    setEditor((current) => ({ ...current, content: nextText }))
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    })
  }
}

export default App