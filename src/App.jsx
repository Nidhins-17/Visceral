import { createElement, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'the-truth-published-blogs'
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || ''
const FONT_OPTIONS = [
  { label: 'Sans serif', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Humanist', value: 'Trebuchet MS, Arial, sans-serif' },
  { label: 'Monospace', value: '"Courier New", monospace' },
]
const DEFAULT_FONT = FONT_OPTIONS[1].value

const starterArticles = [
  {
    id: 'your-life-is-the-measure',
    category: 'EXPERIENCE',
    title: 'Your life is the measure',
    description: 'No idea matters here unless it meets what you can see in your own life.',
    publishedAt: '',
    body: [
      'Let your own experience be the measure of anything you read. A sentence can sound convincing and still have no bearing on your life.',
      'There is no formula to apply. Look at what is happening, and see whether the words meet what you know directly.',
    ],
  },
  {
    id: 'quiet-weight-of-quick-fixes',
    category: 'PERSPECTIVE',
    title: 'The quiet weight of quick fixes',
    description: 'When advice becomes one more fire to put out, it may be time to look closer.',
    publishedAt: '',
    body: [
      'Motivation, discipline, self-help, advice, tips, and tricks are easy to find. They can offer a new task for every difficulty, while the deeper struggle stays just where it was.',
      'Seeing that pattern clearly may be more useful than adding one more instruction to follow.',
    ],
  },
  {
    id: 'can-we-look-without-a-formula',
    category: 'REFLECTION',
    title: 'Can we look without a formula?',
    description: 'Meeting what is happening without turning it into a prescribed exercise.',
    publishedAt: '',
    body: [
      'Nothing here asks you to perform a prescribed self-examination. The invitation is simpler: read carefully, question what you find, and see what holds true in your own life.',
      'If it does not resonate, you are free to leave it there.',
    ],
  },
]

function getSavedBlogs() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function plainTextToHtml(value) {
  if (!value) return ''
  return String(value).split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`).join('')
}

function sanitizeEditorHtml(html) {
  const parsed = new DOMParser().parseFromString(html || '', 'text/html')
  const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'div'])
  const blockedTags = new Set(['script', 'style', 'iframe', 'object', 'embed'])
  const output = document.createElement('div')

  function copyNode(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.append(document.createTextNode(node.textContent || ''))
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const tagName = node.tagName.toLowerCase()
    if (blockedTags.has(tagName)) return
    if (allowedTags.has(tagName)) {
      const cleanElement = document.createElement(tagName)
      parent.append(cleanElement)
      node.childNodes.forEach((child) => copyNode(child, cleanElement))
      return
    }
    node.childNodes.forEach((child) => copyNode(child, parent))
  }

  parsed.body.childNodes.forEach((node) => copyNode(node, output))
  return output.innerHTML
}

function richTextToReact(html) {
  if (typeof DOMParser === 'undefined') return null
  const documentFragment = new DOMParser().parseFromString(html || '', 'text/html')
  const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'div'])
  const blockedTags = new Set(['script', 'style', 'iframe', 'object', 'embed'])

  function convert(node, key) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent
    if (node.nodeType !== Node.ELEMENT_NODE) return null
    if (blockedTags.has(node.tagName.toLowerCase())) return null
    const children = [...node.childNodes].map((child, index) => convert(child, `${key}-${index}`)).filter((child) => child !== null)
    const tagName = node.tagName.toLowerCase()
    if (!allowedTags.has(tagName)) return children
    return createElement(tagName, { key }, ...children)
  }

  return [...documentFragment.body.childNodes].map((node, index) => convert(node, `rich-${index}`)).filter((child) => child !== null)
}

function Arrow() {
  return <span className="arrow" aria-hidden="true">→</span>
}

function FeatureArtwork() {
  return (
    <svg className="feature-artwork" viewBox="0 0 1000 720" role="img" aria-labelledby="art-title art-description">
      <title id="art-title">A quiet opening in a dark room</title>
      <desc id="art-description">A solitary figure faces a narrow opening filled with soft light.</desc>
      <defs>
        <linearGradient id="room" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#171717" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
        <linearGradient id="opening" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b5b5b5" stopOpacity=".72" />
          <stop offset=".52" stopColor="#747474" stopOpacity=".46" />
          <stop offset="1" stopColor="#242424" stopOpacity=".2" />
        </linearGradient>
        <radialGradient id="light" cx="50%" cy="35%" r="60%">
          <stop offset="0" stopColor="#e8e8e8" stopOpacity=".18" />
          <stop offset="1" stopColor="#8a8a8a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#171717" />
          <stop offset="1" stopColor="#090909" />
        </linearGradient>
      </defs>
      <rect width="1000" height="720" fill="url(#room)" />
      <ellipse cx="540" cy="280" rx="340" ry="310" fill="url(#light)" />
      <path d="M0 0h190v720H0zM810 0h190v720H810z" fill="#080808" />
      <path d="M190 0h80v560l-80 160zM730 0h80v720l-80-160z" fill="#111" />
      <path d="M408 75h184v490H408z" fill="#080808" />
      <path d="M435 92h130v454H435z" fill="url(#opening)" />
      <path d="M435 92h130v454H435z" fill="url(#light)" />
      <path d="M0 553 435 514v206H0zM565 514l435 39v167H565z" fill="url(#floor)" />
      <path d="M0 553 435 514M565 514l435 39" stroke="#292929" strokeWidth="2" />
      <ellipse cx="504" cy="622" rx="116" ry="22" fill="#000" opacity=".66" />
      <path d="M478 487c0-33 15-54 29-54s29 21 29 54l22 113h-102z" fill="#090909" />
      <circle cx="507" cy="416" r="23" fill="#080808" />
      <path d="M476 471c6-15 19-23 31-23s25 8 31 23" fill="none" stroke="#161616" strokeWidth="8" />
      <path d="M435 91h130M434 548h132" stroke="#bdbdbd" strokeOpacity=".32" strokeWidth="2" />
      <path d="M71 655h125M804 655h124" stroke="#333" strokeWidth="1" />
    </svg>
  )
}

function App() {
  const editorRef = useRef(null)
  const [query, setQuery] = useState('')
  const [blogs, setBlogs] = useState(getSavedBlogs)
  const [view, setView] = useState(() => {
    const path = window.location.pathname.replace(/\/+$/, '')
    return path === '/write' ? 'writer' : path === '/contact' ? 'contact' : 'home'
  })
  const [editingId, setEditingId] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [draft, setDraft] = useState({ title: '', category: 'REFLECTION', description: '', bodyHtml: '', fontFamily: DEFAULT_FONT })
  const [editorError, setEditorError] = useState('')
  const [contactStatus, setContactStatus] = useState('')
  const allArticles = [...blogs, ...starterArticles]
  const filteredArticles = allArticles.filter((article) => {
    const bodyText = `${article.body || ''} ${article.bodyHtml || ''}`
    const searchableText = `${article.category} ${article.title} ${article.description} ${bodyText}`.toLowerCase()
    return searchableText.includes(query.trim().toLowerCase())
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blogs))
    } catch {
      // Published posts remain visible for this session when browser storage is unavailable.
    }
  }, [blogs])

  useEffect(() => {
    function syncRoute(event) {
      const path = window.location.pathname.replace(/\/+$/, '')
      const isWriter = path === '/write'
      setView(isWriter ? 'writer' : path === '/contact' ? 'contact' : 'home')
      setEditingId(isWriter ? event.state?.postId || null : null)
      setSelectedArticle(null)
      setDeleteTarget(null)
    }
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    document.title = view === 'writer' ? `${editingId ? 'Edit' : 'Write'} a blog | The Truth` : 'The Truth — A life devoted to what matters'
  }, [view, editingId])

  useEffect(() => {
    if (view === 'contact') document.title = 'Contact | The Truth'
  }, [view])

  useEffect(() => {
    if (view === 'writer' && editorRef.current) editorRef.current.innerHTML = sanitizeEditorHtml(draft.bodyHtml)
  }, [view, editingId])

  useEffect(() => {
    if (!selectedArticle && !deleteTarget) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setSelectedArticle(null)
        setDeleteTarget(null)
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [selectedArticle, deleteTarget])

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function openWriter(article = null) {
    const oldBody = article?.bodyHtml || plainTextToHtml(Array.isArray(article?.body) ? article.body.join('\n\n') : article?.body || '')
    setEditingId(article?.id || null)
    setDraft({
      title: article?.title || '',
      category: article?.category || 'REFLECTION',
      description: article?.description || '',
      bodyHtml: oldBody,
      fontFamily: FONT_OPTIONS.some((font) => font.value === article?.fontFamily) ? article.fontFamily : DEFAULT_FONT,
    })
    setEditorError('')
    setSelectedArticle(null)
    const postId = article?.id || null
    window.history.pushState({ truthView: 'writer', postId }, '', '/write')
    setView('writer')
    window.scrollTo(0, 0)
  }

  function returnToJournal() {
    window.history.replaceState({ truthView: 'home' }, '', '/')
    setEditingId(null)
    setView('home')
    setEditorError('')
    window.scrollTo(0, 0)
  }

  function openContact() {
    setSelectedArticle(null)
    setDeleteTarget(null)
    setContactStatus('')
    window.history.pushState({ truthView: 'contact' }, '', '/contact')
    setView('contact')
    window.scrollTo(0, 0)
  }

  function sendContactMessage(event) {
    event.preventDefault()
    if (!CONTACT_EMAIL) {
      setContactStatus('Message delivery needs a destination email. Add VITE_CONTACT_EMAIL to the project settings to activate the form.')
      return
    }
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const email = String(form.get('email') || '').trim()
    const subject = String(form.get('subject') || '').trim() || 'A note from The Truth'
    const message = String(form.get('message') || '').trim()
    const body = `From: ${name}\nReply to: ${email}\n\n${message}`
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setContactStatus('Your email app is opening with your message ready to send.')
  }

  function publishBlog(event) {
    event.preventDefault()
    const bodyHtml = editorRef.current?.innerHTML || draft.bodyHtml
    const bodyText = editorRef.current?.innerText?.trim() || ''
    if (!draft.title.trim() || !draft.description.trim() || !bodyText) {
      setEditorError('Add a title, a short description, and some writing before publishing.')
      return
    }
    const now = new Date().toISOString()
    const previousPost = blogs.find((blog) => blog.id === editingId)
    const post = {
      id: editingId || `post-${Date.now()}`,
      category: draft.category,
      title: draft.title.trim(),
      description: draft.description.trim(),
      bodyHtml,
      fontFamily: draft.fontFamily,
      publishedAt: previousPost?.publishedAt || now,
      updatedAt: now,
      isUserPost: true,
    }
    setBlogs((current) => editingId ? current.map((blog) => blog.id === editingId ? post : blog) : [post, ...current])
    setQuery('')
    returnToJournal()
  }

  function runEditorCommand(command, value) {
    if (!editorRef.current) return
    editorRef.current.focus()
    document.execCommand(command, false, value)
    updateDraft('bodyHtml', editorRef.current.innerHTML)
  }

  function openArticle(article) {
    setSelectedArticle(article)
  }

  function requestDelete(article) {
    setSelectedArticle(null)
    setDeleteTarget(article)
  }

  function deleteBlog() {
    if (!deleteTarget) return
    setBlogs((current) => current.filter((blog) => blog.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  function articleParagraphs(article) {
    if (Array.isArray(article.body)) return article.body
    if (typeof article.body === 'string') return article.body.split(/\n\s*\n/).filter(Boolean)
    return []
  }

  function formatDate(value) {
    if (!value) return 'THE TRUTH JOURNAL'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'THE TRUTH JOURNAL'
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  }

  function renderWriter() {
    return (
      <div className="site-shell writer-shell">
        <header className="writer-header">
          <button className="back-to-journal" type="button" onClick={returnToJournal}><span aria-hidden="true">←</span> The Truth</button>
          <div className="writer-header-actions">
            <span className="draft-status">{editingId ? 'EDITING POST' : 'NEW STORY'}</span>
            <button className="publish-button" type="submit" form="blog-editor-form">{editingId ? 'Update post' : 'Publish'} <Arrow /></button>
          </div>
        </header>

        <main className="writer-main">
          <p className="writer-kicker">A LIFE DEVOTED TO TRUTH</p>
          <form id="blog-editor-form" className="writer-form" onSubmit={publishBlog}>
            <input className="writer-title" maxLength={100} autoFocus required value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} placeholder="Title" aria-label="Blog title" />
            <input className="writer-description" maxLength={180} required value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} placeholder="Write a short subtitle or introduction..." aria-label="Short description" />
            <div className="writer-meta-row">
              <label className="category-control">Category
                <select value={draft.category} onChange={(event) => updateDraft('category', event.target.value)}>
                  <option>REFLECTION</option>
                  <option>EXPERIENCE</option>
                  <option>PERSPECTIVE</option>
                  <option>JOURNAL</option>
                </select>
              </label>
              <span className="writer-saved-note">Your post is published when you choose Publish.</span>
            </div>

            <div className="writer-toolbar" role="toolbar" aria-label="Writing format options">
              <label className="font-control" htmlFor="writer-font">Font</label>
              <select id="writer-font" className="font-select" value={draft.fontFamily} onChange={(event) => updateDraft('fontFamily', event.target.value)} aria-label="Choose writing font">
                {FONT_OPTIONS.map((font) => <option value={font.value} key={font.label}>{font.label}</option>)}
              </select>
              <span className="toolbar-divider" />
              <button type="button" className="format-button format-bold" title="Bold" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand('bold')}>B</button>
              <button type="button" className="format-button format-italic" title="Italic" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand('italic')}>I</button>
              <button type="button" className="format-button format-underline" title="Underline" aria-label="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand('underline')}>U</button>
              <span className="toolbar-divider" />
              <button type="button" className="format-button heading-format" title="Heading" aria-label="Heading" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand('formatBlock', '<h2>')}>H</button>
              <button type="button" className="format-button quote-format" title="Quote" aria-label="Quote" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand('formatBlock', '<blockquote>')}>“</button>
              <button type="button" className="format-button list-format" title="Bulleted list" aria-label="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand('insertUnorderedList')}>•</button>
              <button type="button" className="format-button list-format" title="Numbered list" aria-label="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => runEditorCommand('insertOrderedList')}>1.</button>
            </div>

            <div
              ref={editorRef}
              className="writing-canvas"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Blog content"
              aria-multiline="true"
              data-placeholder="Tell your story from your own experience..."
              style={{ fontFamily: draft.fontFamily }}
              onInput={(event) => updateDraft('bodyHtml', event.currentTarget.innerHTML)}
            />
            {editorError && <p className="editor-error" role="alert">{editorError}</p>}
            <div className="writer-bottomline"><span>WRITE WHAT YOU HAVE SEEN FOR YOURSELF.</span><span>POSTS ARE SAVED IN THIS BROWSER</span></div>
          </form>
        </main>
      </div>
    )
  }

  function renderContact() {
    return (
      <div className="site-shell contact-shell">
        <header className="writer-header">
          <button className="back-to-journal" type="button" onClick={returnToJournal}><span aria-hidden="true">←</span> The Truth</button>
          <span className="draft-status">CONTACT</span>
        </header>

        <main className="contact-main">
          <p className="writer-kicker">A SPACE FOR THOUGHTFUL EXCHANGE</p>
          <h1>Reach out.</h1>
          <p className="contact-intro">Questions, reflections, or something you would like to share — you are welcome to write.</p>

          <div className="contact-layout">
            <form className="contact-form" onSubmit={sendContactMessage}>
              <div className="contact-field-row">
                <label className="contact-field"><span>Your name</span><input type="text" name="name" autoComplete="name" placeholder="How should I address you?" required /></label>
                <label className="contact-field"><span>Your email</span><input type="email" name="email" autoComplete="email" placeholder="Where can I reply?" required /></label>
              </div>
              <label className="contact-field"><span>Subject</span><input type="text" name="subject" placeholder="What would you like to talk about?" /></label>
              <label className="contact-field"><span>Your message</span><textarea name="message" rows="6" placeholder="Write in your own words..." required /></label>
              <div className="contact-submit-row">
                <button className="publish-button contact-submit" type="submit">Send message <Arrow /></button>
                <span>Opens in your email app</span>
              </div>
              {contactStatus && <p className="contact-status" role="status">{contactStatus}</p>}
            </form>

            <aside className="contact-aside">
              <p className="section-kicker"><span>01</span><span>A NOTE</span></p>
              <h2>Good conversations begin with honesty.</h2>
              <p>Your message stays yours until you choose to send it. This form opens your email app with the message prepared; nothing is stored on this site.</p>
              {!CONTACT_EMAIL && <p className="contact-setup-note">The destination address still needs to be configured before messages can be addressed.</p>}
            </aside>
          </div>
          <div className="writer-bottomline contact-bottomline"><span>THANK YOU FOR WRITING.</span><span>THE TRUTH JOURNAL</span></div>
        </main>
      </div>
    )
  }

  if (view === 'writer') return renderWriter()
  if (view === 'contact') return renderContact()

  return (
    <div className="site-shell" id="home">
      <header className="site-header">
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#articles">Articles</a>
          <a href="/contact" onClick={(event) => { event.preventDefault(); openContact() }}>Contact</a>
        </nav>
        <a className="brand-mark" href="#home" aria-label="The Truth home">✱</a>
        <div className="header-actions">
          <a className="header-note" href="#about">Read this first <Arrow /></a>
          <button className="write-button" type="button" onClick={() => openWriter()}>Write a blog <span aria-hidden="true">+</span></button>
        </div>
      </header>

      <main>
        <section className="page-heading" aria-labelledby="page-title">
          <div className="heading-copy">
            <h1 id="page-title">The Truth</h1>
            <p>Truth is what everyone is looking for. Few of us realize it.</p>
          </div>
          <label className="search-field">
            <span className="search-icon" aria-hidden="true" />
            <span className="sr-only">Search articles</span>
            <input type="search" placeholder="Search articles" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </section>

        <section className="featured-article" aria-labelledby="feature-title">
          <a className="feature-image" href="#about" aria-label="Read the opening note">
            <FeatureArtwork />
            <span className="image-caption">A LIFE, SEEN CLEARLY <span>01</span></span>
          </a>
          <div className="feature-copy">
            <p className="article-meta">A NOTE ON LIFE <span /> THE BEGINNING</p>
            <h2 id="feature-title">What if there was a way out of all your problems?</h2>
            <p>The world offers motivation, discipline, self-help, advice, tips, and tricks at every turn. Yet the deeper struggle can remain. We put out one fire after another, day after day, and begin to think that constant strain is simply normal.</p>
            <p>What if there were a genuine way through this cycle? Not another quick fix, but a clearer look at what is happening in our lives.</p>
            <a className="read-link" href="#about">Read the opening note <Arrow /></a>
          </div>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="section-kicker"><span>02</span><span>A NOTE BEFORE YOU READ</span></div>
          <div className="about-content">
            <h2 id="about-title">Take nothing here<br />on belief alone.</h2>
            <div className="about-copy">
              <p>Let your own life experience be the measure. Nothing here asks you to follow a method or perform a prescribed self-examination. What is written matters only if it meets what you can see in your own life.</p>
              <p>This journal may not be for everyone. It is for the serious individual willing to look closely. If these words don't resonate with you, feel free to close the tab and move on. There is no pressure to stay.</p>
            </div>
          </div>
        </section>

        <section className="articles-section" id="articles" aria-labelledby="articles-title">
          <div className="articles-heading">
            <div>
              <p className="section-kicker"><span>03</span><span>THE JOURNAL</span></p>
              <h2 id="articles-title">Articles &amp; reflections</h2>
            </div>
            <div className="articles-tools">
              <span className="article-count">{String(filteredArticles.length).padStart(2, '0')} ENTRIES</span>
              <button className="write-button secondary-write" type="button" onClick={() => openWriter()}>Write a blog <span aria-hidden="true">+</span></button>
            </div>
          </div>
          <div className="blog-grid" aria-live="polite">
            {filteredArticles.length > 0 ? filteredArticles.map((article, index) => (
              <article className="blog-card" key={article.id}>
                <div className="card-topline">
                  <span className="card-category">{article.category}</span>
                  <span className="card-number">{article.isUserPost ? 'YOUR POST' : String(index + 1).padStart(2, '0')}</span>
                </div>
                <button className="card-open" type="button" onClick={() => openArticle(article)}>
                  <span className="card-title">{article.title}</span>
                  <span className="card-description">{article.description}</span>
                </button>
                <div className="card-footer">
                  <span className="card-date">{article.isUserPost ? formatDate(article.publishedAt) : 'THE TRUTH JOURNAL'}</span>
                  <button className="card-read" type="button" onClick={() => openArticle(article)}>Read <Arrow /></button>
                </div>
                {article.isUserPost && (
                  <div className="card-management">
                    <button type="button" onClick={() => openWriter(article)}>Edit</button>
                    <button type="button" onClick={() => requestDelete(article)}>Delete</button>
                  </div>
                )}
              </article>
            )) : <p className="empty-state">No articles match that search.</p>}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#home"><span>✱</span> THE TRUTH</a>
        <span>A LIFE DEVOTED TO TRUTH.</span>
        <a href="#home">BACK TO TOP ↑</a>
        <a href="/contact" onClick={(event) => { event.preventDefault(); openContact() }}>CONTACT</a>
      </footer>

      {selectedArticle && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedArticle(null)}>
          <article className="reader-modal" role="dialog" aria-modal="true" aria-labelledby="reader-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <p className="modal-kicker">{selectedArticle.category} <span>·</span> {formatDate(selectedArticle.publishedAt)}</p>
              <button className="modal-close" type="button" aria-label="Close article" onClick={() => setSelectedArticle(null)}>×</button>
            </div>
            <h2 id="reader-title">{selectedArticle.title}</h2>
            <p className="reader-summary">{selectedArticle.description}</p>
            {selectedArticle.bodyHtml ? (
              <div className="reader-body" style={{ fontFamily: FONT_OPTIONS.some((font) => font.value === selectedArticle.fontFamily) ? selectedArticle.fontFamily : DEFAULT_FONT }}>
                {richTextToReact(selectedArticle.bodyHtml)}
              </div>
            ) : (
              <div className="reader-body">{articleParagraphs(selectedArticle).map((paragraph, index) => <p key={`${selectedArticle.id}-${index}`}>{paragraph}</p>)}</div>
            )}
            {selectedArticle.isUserPost && (
              <div className="reader-actions">
                <button className="reader-edit" type="button" onClick={() => openWriter(selectedArticle)}>Edit post</button>
                <button className="reader-delete" type="button" onClick={() => requestDelete(selectedArticle)}>Delete post</button>
              </div>
            )}
          </article>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop delete-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}>
          <section className="delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" onMouseDown={(event) => event.stopPropagation()}>
            <p className="modal-kicker">REMOVE FROM YOUR JOURNAL</p>
            <h2 id="delete-title">Delete this post?</h2>
            <p id="delete-description">“{deleteTarget.title}” will be removed from this browser.</p>
            <div className="delete-actions">
              <button className="cancel-delete" type="button" onClick={() => setDeleteTarget(null)}>Keep post</button>
              <button className="confirm-delete" type="button" onClick={deleteBlog}>Delete post</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
